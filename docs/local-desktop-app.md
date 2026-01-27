# 本地化桌面应用改造说明

## 改造概述

已将 Web 应用改造为完全本地化的桌面应用，主要改动：

### 1. 数据库改造 ✅
- **从 PostgreSQL 切换到 SQLite**
- 数据库文件存储在用户数据目录
- 首次启动自动创建数据库和表结构
- 自动创建默认管理员账号

### 2. 文件存储改造 ✅
- **从云存储切换到本地文件系统**
- 文件存储在用户数据目录的 `storage/` 文件夹
- 支持图片、视频、音频等多种文件类型
- 提供静态文件服务 API

### 3. 应用数据管理 ✅
- 遵循操作系统数据目录规范
- 自动创建和管理应用数据目录
- 支持数据统计和清理

## 目录结构

```
web/
├── electron/
│   ├── main.js              # Electron 主进程
│   ├── app-data.js          # 应用数据目录管理
│   ├── database-init.js     # 数据库初始化
│   └── preload.js           # 预加载脚本
├── src/
│   ├── lib/
│   │   └── storage/
│   │       └── local-storage.ts  # 本地文件存储服务
│   └── app/
│       └── api/
│           └── storage/
│               └── [...path]/
│                   └── route.ts  # 静态文件服务 API
└── prisma/
    └── schema.prisma        # SQLite 数据库 Schema
```

## 应用数据目录

### Windows
```
C:\Users\<用户名>\AppData\Roaming\ai-video-gen\
├── database\
│   └── app.db              # SQLite 数据库
├── storage\
│   ├── images\             # 图片文件
│   ├── videos\             # 视频文件
│   ├── audio\              # 音频文件
│   └── exports\            # 导出文件
├── logs\                   # 应用日志
└── temp\                   # 临时文件
```

### macOS
```
~/Library/Application Support/ai-video-gen/
```

### Linux
```
~/.config/ai-video-gen/
```

## 使用方法

### 开发模式

```bash
# 1. 生成 Prisma Client
pnpm db:generate

# 2. 启动应用
pnpm electron:dev
```

首次启动会：
1. 创建应用数据目录
2. 初始化 SQLite 数据库
3. 创建默认管理员账号
   - 用户名: `admin`
   - 密码: `admin123`

### 打包应用

```bash
# Windows
pnpm electron:build:win

# macOS
pnpm electron:build:mac

# Linux
pnpm electron:build:linux
```

## 代码改造指南

### 1. 使用本地存储服务

```typescript
import { localStorageService } from '@/lib/storage/local-storage';

// 上传文件
const result = await localStorageService.upload(
  fileBuffer,
  'image.png',
  { folder: 'images' }
);
console.log('File URL:', result.url); // /storage/images/image_1234567890.png

// 删除文件
await localStorageService.delete(result.path);

// 检查文件是否存在
const exists = await localStorageService.exists(result.path);
```

### 2. 访问本地文件

前端可以通过以下方式访问文件：

```tsx
// 图片
<img src="/api/storage/images/image_1234567890.png" alt="Image" />

// 视频
<video src="/api/storage/videos/video_1234567890.mp4" controls />

// 音频
<audio src="/api/storage/audio/audio_1234567890.mp3" controls />
```

### 3. 数据库连接

Prisma Client 会自动使用环境变量中的数据库路径：

```typescript
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// 正常使用 Prisma
const users = await prisma.user.findMany();
```

## 需要修改的代码

### 1. 文件上传 API

将所有使用云存储的代码改为使用本地存储：

```typescript
// 之前：使用云存储
import { ossService } from '@/lib/storage/oss';
const result = await ossService.upload(file);

// 现在：使用本地存储
import { localStorageService } from '@/lib/storage/local-storage';
const result = await localStorageService.upload(file, fileName, { folder: 'images' });
```

### 2. 文件 URL 处理

```typescript
// 之前：云存储 URL
const imageUrl = 'https://oss.example.com/images/xxx.png';

// 现在：本地存储 URL
const imageUrl = '/api/storage/images/xxx.png';
```

### 3. 环境变量

不再需要配置云存储相关的环境变量：

```bash
# 删除这些配置
# ALI_OSS_ACCESS_KEY_ID=xxx
# ALI_OSS_ACCESS_KEY_SECRET=xxx
# ALI_OSS_BUCKET=xxx
# ALI_OSS_REGION=xxx

# 只需要这些
DATABASE_URL="file:./prisma/dev.db"  # Electron 会自动设置
STORAGE_PATH="./storage"              # Electron 会自动设置
```

## 数据迁移

如果需要从现有的 PostgreSQL 数据库迁移到 SQLite：

1. 导出现有数据
```bash
# 使用 Prisma Studio 或 pg_dump 导出数据
```

2. 清理数据（SQLite 限制）
- 移除 PostgreSQL 特定的类型
- 调整日期时间格式
- 处理 JSON 字段

3. 导入到 SQLite
```bash
# 使用 Prisma Migrate 或直接 SQL 导入
```

## 注意事项

### SQLite 限制

1. **并发写入**：SQLite 不支持高并发写入，但对于桌面应用足够
2. **数据类型**：某些 PostgreSQL 类型需要转换（如 Decimal → Float）
3. **全文搜索**：SQLite 的全文搜索功能有限

### 文件大小

- 建议单个文件不超过 100MB
- 定期清理临时文件
- 提供数据导出功能

### 数据备份

建议添加数据备份功能：
- 定期备份数据库文件
- 导出项目数据
- 云同步（可选）

## 下一步优化

1. **数据备份与恢复**
   - 实现数据库备份功能
   - 支持导入/导出项目

2. **性能优化**
   - 添加文件缓存
   - 优化数据库查询
   - 实现懒加载

3. **用户体验**
   - 添加进度提示
   - 实现离线提示
   - 优化启动速度

4. **安全性**
   - 加密敏感数据
   - 实现数据隔离
   - 添加访问控制

## 测试清单

- [ ] 首次启动创建数据库
- [ ] 默认管理员账号登录
- [ ] 文件上传和访问
- [ ] 图片生成和显示
- [ ] 视频生成和播放
- [ ] 数据持久化
- [ ] 应用重启后数据保留
- [ ] 多用户数据隔离
- [ ] 打包后正常运行
