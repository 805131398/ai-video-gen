# AI Video Generator (AI 视频生成器)

一个强大的 AI 视频生成平台，支持 Web 和桌面环境。

[English Version](./README.en.md)

## 项目结构

本项目包含两个主要应用：

- **`web/`**: 基于 Next.js 的 Web 应用。
- **`client/`**: 基于 Electron + Vite + React 的桌面应用，支持 Windows、macOS 和 Linux。

## 功能特性

- **AI 视频生成**: 根据剧本和场景生成视频。
- **跨平台支持**: 可在 Web 端运行，也可作为原生桌面应用运行。
- **本地存储**: 桌面应用支持本地文件存储和 SQLite 数据库。
- **云端集成**: Web 应用支持 AWS S3 / Ali OSS 存储。
- **隐私优先**: 桌面应用在依赖允许的情况下完全离线运行。

## 快速开始

### 前置要求

- Node.js (推荐 v18 或更高版本)
- pnpm (包管理器)
- Git

### 安装步骤

1. 克隆仓库：
   ```bash
   git clone <repository-url>
   cd ai-video-gen
   ```

2. 安装依赖：
   ```bash
   # 安装 Web 应用依赖
   cd web
   pnpm install
   
   # 设置数据库
   pnpm db:generate

   # 安装客户端依赖
   cd ../client
   pnpm install
   ```

## 开发指南

### Web 应用

进入 `web` 目录运行：

```bash
cd web
pnpm dev
```

应用将在 `http://localhost:3000` 访问。

### 桌面应用

进入 `client` 目录运行：

```bash
cd client
pnpm dev         # 运行 Vite 开发服务器
pnpm electron:dev # 运行 Electron + Vite 开发环境
```

## 构建部署

### Web 应用

构建 Next.js 生产环境应用：

```bash
cd web
pnpm build
```

### 桌面应用

构建当前平台的应用：

```bash
cd client
pnpm electron:build
```

或构建特定平台的应用：

```bash
pnpm electron:build:win   # Windows
pnpm electron:build:mac   # macOS
pnpm electron:build:linux # Linux
```

## 文档资源

更多详细文档，请查阅 [docs](./docs) 目录：

- [Electron 桌面应用指南](./docs/electron-desktop-app.md)
- [本地桌面应用指南](./docs/local-desktop-app.md)

## 许可证

MIT
