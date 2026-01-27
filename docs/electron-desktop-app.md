# Electron 桌面应用打包指南

## 概述

本项目支持将 Next.js Web 应用打包成 Windows/Mac/Linux 桌面应用程序。

**本地化特性**：
- ✅ 使用 SQLite 本地数据库
- ✅ 文件存储在本地文件系统
- ✅ 首次启动自动初始化数据库
- ✅ 遵循操作系统数据目录规范
- ✅ 完全离线运行

## 应用数据目录

应用会在以下位置创建数据目录：

- **Windows**: `C:\Users\<用户名>\AppData\Roaming\ai-video-gen`
- **macOS**: `~/Library/Application Support/ai-video-gen`
- **Linux**: `~/.config/ai-video-gen`

目录结构：
```
ai-video-gen/
├── database/          # SQLite 数据库文件
│   └── app.db
├── storage/           # 文件存储
│   ├── images/        # 图片文件
│   ├── videos/        # 视频文件
│   ├── audio/         # 音频文件
│   └── exports/       # 导出文件
├── logs/              # 应用日志
└── temp/              # 临时文件
```

## 前置要求

### 1. 安装依赖

```bash
cd web
pnpm install
```

### 2. 生成 Prisma Client

```bash
pnpm db:generate
```

### 3. 准备应用图标

在 `public/` 目录下准备图标文件：
- Windows: `icon.ico` (256x256)
- macOS: `icon.icns`
- Linux: `icon.png` (512x512)

可以使用在线工具转换：https://www.icoconverter.com/

## 开发模式

启动 Electron 开发环境（同时运行 Next.js 和 Electron）：

```bash
pnpm electron:dev
```

这会：
1. 启动 Next.js 开发服务器（端口 3000）
2. 初始化应用数据目录
3. 创建/迁移 SQLite 数据库
4. 启动 Electron 窗口

**首次启动**：
- 自动创建数据库和表结构
- 创建默认管理员账号
  - 用户名: `admin`
  - 密码: `admin123`

## 生产打包

### 打包 Windows 应用

```bash
pnpm electron:build:win
```

输出文件位于 `dist-electron/`：
- `AI视频生成器 Setup 0.1.0.exe` - 安装程序
- `AI视频生成器 0.1.0.exe` - 便携版（无需安装）

### 打包 macOS 应用

```bash
pnpm electron:build:mac
```

输出：
- `AI视频生成器-0.1.0.dmg` - 磁盘镜像
- `AI视频生成器-0.1.0-mac.zip` - 压缩包

### 打包 Linux 应用

```bash
pnpm electron:build:linux
```

输出：
- `AI视频生成器-0.1.0.AppImage` - AppImage 格式
- `ai-video-gen_0.1.0_amd64.deb` - Debian 包

### 打包所有平台

```bash
pnpm electron:build
```

## 配置说明

### electron/main.js

Electron 主进程文件，负责：
- 创建应用窗口
- 启动 Next.js 服务器
- 管理应用生命周期

### package.json - build 配置

```json
{
  "build": {
    "appId": "com.aivideogen.app",
    "productName": "AI视频生成器",
    "files": [
      "electron/**/*",
      ".next/**/*",
      "public/**/*",
      "prisma/**/*",
      "node_modules/**/*"
    ]
  }
}
```

## 常见问题

### 1. 数据库连接失败

确保：
- 使用 SQLite 或内嵌数据库
- 数据库文件路径正确
- 已运行 `pnpm db:push`

### 2. 打包体积过大

优化方法：
- 使用 `files` 配置排除不必要的文件
- 使用 `asar` 压缩（electron-builder 默认启用）
- 考虑使用 Tauri（体积更小）

### 3. Windows 打包在 Mac 上失败

需要安装 Wine：
```bash
brew install wine-stable
```

或者在 Windows 系统上打包。

### 4. 应用启动慢

优化方法：
- 使用 `next build` 生产构建
- 预加载常用资源
- 使用 SSD 存储

## 分发应用

### Windows
- 上传 `.exe` 安装程序到网站
- 或使用 Microsoft Store

### macOS
- 需要 Apple Developer 账号签名
- 上传到 Mac App Store 或自行分发

### Linux
- 上传 `.AppImage` 或 `.deb`
- 发布到 Snap Store / Flathub

## 自动更新

可以集成 `electron-updater` 实现自动更新：

```bash
pnpm add electron-updater
```

配置更新服务器后，应用可以自动检查和安装更新。

## 技术栈

- **Electron**: 桌面应用框架
- **Next.js**: Web 应用框架
- **electron-builder**: 打包工具
- **PostgreSQL/SQLite**: 数据库

## 参考资源

- [Electron 官方文档](https://www.electronjs.org/docs)
- [electron-builder 文档](https://www.electron.build/)
- [Next.js + Electron 示例](https://github.com/vercel/next.js/tree/canary/examples/with-electron)
