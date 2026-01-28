# better-sqlite3 Electron 版本不匹配修复

## 问题描述

运行 `pnpm electron:dev` 时出现错误：

```
Error: The module '/Users/zhanghao/.../better-sqlite3/build/Release/better_sqlite3.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 141. This version of Node.js requires
NODE_MODULE_VERSION 119.
```

## 原因分析

- `better-sqlite3` 是原生 Node.js 模块，需要针对特定 Node.js 版本编译
- 系统安装的 Node.js 版本较新 (MODULE_VERSION 141)
- Electron 28 内置的 Node.js 版本较旧 (MODULE_VERSION 119)
- 两个版本不匹配导致模块无法加载

## 解决方案

1. 安装 `electron-rebuild`（作为开发依赖）：

```bash
cd client
pnpm add -D electron-rebuild
```

2. 运行 rebuild 重新编译原生模块：

```bash
npx electron-rebuild -f -w better-sqlite3
```

## pnpm 特殊处理

当使用 pnpm 时，会遇到两个额外问题：

### 1. Electron 二进制文件未安装

pnpm 会阻止 Electron 的 postinstall 脚本运行，导致二进制文件未下载。报错：

```
Error: Electron failed to install correctly, please delete node_modules/electron and try installing again
```

**解决方法**：手动运行 Electron 安装脚本

```bash
node node_modules/electron/install.js
```

### 2. 原生模块未自动重建

pnpm 的安全机制会阻止 build scripts 自动执行，`postinstall` 脚本不会运行。

**解决方法**：手动运行 rebuild

```bash
npx electron-rebuild -f -w better-sqlite3
```

### 完整的 pnpm 安装流程

```bash
# 1. 安装依赖（pnpm 会阻止 build scripts）
pnpm install

# 2. 下载 Electron 二进制文件
node node_modules/electron/install.js

# 3. 重新编译原生模块
npx electron-rebuild -f -w better-sqlite3
```

## 相关文件

- `client/package.json` - 包依赖配置
- `client/electron/database.ts` - better-sqlite3 使用处

## 修复时间

2026-01-28
