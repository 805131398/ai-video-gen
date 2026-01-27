# AI 视频生成器 - 客户端

基于 Electron + React + TypeScript 的桌面客户端应用。

## 功能特性

- ✅ 用户注册/登录
- ✅ 激活码/卡密系统
- ✅ 订阅状态管理
- ✅ 本地数据存储（SQLite + LocalStorage）
- 🚧 视频创作功能（即将上线）

## 技术栈

- **框架**: Electron 28 + React 18
- **语言**: TypeScript 5
- **构建工具**: Vite 5
- **状态管理**: Zustand
- **HTTP 客户端**: Axios
- **样式**: Tailwind CSS 4
- **本地数据库**: better-sqlite3
- **打包工具**: electron-builder

## 开发环境要求

- Node.js >= 18
- pnpm >= 8

## 快速开始

### 1. 安装依赖

```bash
cd client
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# API 服务器地址
VITE_API_URL=http://localhost:3000/api
```

### 3. 启动开发服务器

```bash
pnpm electron:dev
```

这会同时启动：
- Vite 开发服务器（端口 5173）
- Electron 窗口

## 构建打包

### 打包 Windows 应用

```bash
pnpm electron:build:win
```

输出文件位于 `dist-electron/`：
- `AI视频生成器 Setup 0.1.0.exe` - 安装程序
- `AI视频生成器 0.1.0.exe` - 便携版

### 打包 macOS 应用

```bash
pnpm electron:build:mac
```

### 打包 Linux 应用

```bash
pnpm electron:build:linux
```

### 打包所有平台

```bash
pnpm electron:build
```

## 项目结构

```
client/
├── electron/              # Electron 主进程
│   ├── main.ts           # 主进程入口
│   ├── preload.ts        # 预加载脚本
│   └── database.ts       # SQLite 数据库管理
├── src/                  # React 应用
│   ├── pages/            # 页面组件
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   └── Activate.tsx
│   ├── components/       # UI 组件
│   ├── services/         # API 服务层
│   │   ├── api.ts
│   │   └── auth.ts
│   ├── store/            # 状态管理
│   │   └── auth.ts
│   ├── types/            # TypeScript 类型
│   └── utils/            # 工具函数
├── public/               # 静态资源
├── build/                # 打包资源（图标等）
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 数据存储

### SQLite 数据库

位置：`~/Library/Application Support/ai-video-gen-client/database/app.db`（macOS）

存储内容：
- 用户基本信息
- 激活码记录
- 使用日志

### LocalStorage

存储内容：
- JWT Token（访问令牌）
- Refresh Token（刷新令牌）
- 用户偏好设置

## API 接口

客户端需要连接到服务端 API，接口列表：

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新 token
- `POST /api/auth/logout` - 退出登录

### 激活码相关
- `POST /api/activation/activate` - 激活卡密
- `GET /api/activation/status` - 查询订阅状态
- `GET /api/activation/history` - 激活历史记录

### 用户相关
- `GET /api/user/profile` - 获取用户信息
- `GET /api/user/balance` - 查询余额/能量

## 开发指南

### 添加新页面

1. 在 `src/pages/` 创建新组件
2. 在 `src/App.tsx` 添加路由
3. 更新导航逻辑

### 添加新 API

1. 在 `src/services/` 添加 API 函数
2. 使用 `api` 实例发送请求
3. 处理响应和错误

### 添加数据库表

1. 在 `electron/database.ts` 的 `createTables()` 函数中添加表结构
2. 添加对应的 CRUD 函数
3. 在 `electron/main.ts` 注册 IPC 处理器
4. 在 `electron/preload.ts` 暴露 API
5. 更新 `src/types/index.ts` 类型定义

## 常见问题

### 1. 依赖安装失败

确保使用 pnpm 而不是 npm：

```bash
npm install -g pnpm
pnpm install
```

### 2. Electron 启动失败

检查端口 5173 是否被占用：

```bash
lsof -i :5173
```

### 3. 数据库连接失败

检查应用数据目录权限：

```bash
# macOS
ls -la ~/Library/Application\ Support/ai-video-gen-client/
```

### 4. 打包失败

确保安装了必要的构建工具：

```bash
# macOS
xcode-select --install

# Windows
# 安装 Visual Studio Build Tools
```

## 调试

### 开发者工具

开发模式下会自动打开 Chrome DevTools。

### 主进程日志

主进程的 console.log 会输出到终端。

### 渲染进程日志

渲染进程的 console.log 会输出到 DevTools。

## 许可证

MIT

## 相关文档

- [设计文档](../docs/plans/2026-01-27-client-app-design.md)
- [Electron 官方文档](https://www.electronjs.org/docs)
- [React 官方文档](https://react.dev/)
- [Vite 官方文档](https://vitejs.dev/)
