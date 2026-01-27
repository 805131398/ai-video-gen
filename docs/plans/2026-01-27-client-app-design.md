# AI 视频生成器 - 客户端应用设计文档

**日期**: 2026-01-27
**版本**: 1.0
**状态**: 设计完成，待实施

## 概述

本文档描述了 AI 视频生成器客户端应用的设计方案。客户端是一个独立的桌面应用程序，提供用户认证、激活码管理等基础功能，并通过 API 与服务端通信。

### 核心目标

- 提供简洁的用户认证系统（注册、登录）
- 实现激活码/卡密管理功能
- 支持本地数据存储和缓存
- 为未来的业务功能提供可扩展的架构

### 技术选型

- **客户端框架**: Electron + React + TypeScript
- **本地存储**: SQLite（结构化数据）+ LocalStorage（临时数据）+ 文件系统（大文件）
- **UI 组件**: shadcn/ui（复用服务端组件库）
- **状态管理**: Zustand
- **构建工具**: Vite
- **打包工具**: electron-builder

---

## 项目结构

```
ai-video-gen/
├── web/                    # 服务端（现有项目）
├── client/                 # 客户端（新项目）
│   ├── electron/           # Electron 主进程
│   │   ├── main.ts         # 主进程入口
│   │   ├── preload.ts      # 预加载脚本
│   │   └── database.ts     # SQLite 数据库管理
│   ├── src/                # React 应用
│   │   ├── main.tsx        # React 入口
│   │   ├── App.tsx         # 根组件
│   │   ├── pages/          # 页面组件
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Activate.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── components/     # UI 组件
│   │   │   └── ui/         # shadcn/ui 组件
│   │   ├── services/       # API 服务层
│   │   │   ├── api.ts      # HTTP 客户端
│   │   │   └── auth.ts     # 认证服务
│   │   ├── store/          # 状态管理（Zustand）
│   │   │   └── auth.ts     # 认证状态
│   │   ├── types/          # TypeScript 类型
│   │   │   └── index.ts
│   │   └── utils/          # 工具函数
│   │       ├── crypto.ts   # 加密工具
│   │       └── storage.ts  # 存储工具
│   ├── public/             # 静态资源
│   │   └── icon.png
│   ├── build/              # 打包资源
│   │   └── icon.ico
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── electron-builder.json
└── docs/
    └── plans/
        └── 2026-01-27-client-app-design.md
```

---

## 架构设计

### 1. Electron 进程架构

#### 主进程（Main Process）

**职责**：
- 管理应用窗口生命周期
- 操作 SQLite 数据库
- 文件系统访问
- 系统级操作（托盘、通知等）

**核心模块**：
```typescript
// electron/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import { initDatabase } from './database';

let mainWindow: BrowserWindow | null = null;

app.whenReady().then(() => {
  initDatabase();
  createWindow();
  registerIpcHandlers();
});
```

#### 渲染进程（Renderer Process）

**职责**：
- React UI 渲染
- 用户交互处理
- 通过 IPC 调用主进程功能
- 通过 HTTP 调用服务端 API

#### IPC 通信接口

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  // 数据库操作
  db: {
    getUser: () => ipcRenderer.invoke('db:getUser'),
    saveUser: (user: User) => ipcRenderer.invoke('db:saveUser', user),
    saveActivationCode: (code: ActivationRecord) =>
      ipcRenderer.invoke('db:saveActivationCode', code),
    getActivationHistory: () => ipcRenderer.invoke('db:getActivationHistory'),
  },
  // 文件操作
  file: {
    selectFile: () => ipcRenderer.invoke('file:select'),
    saveFile: (path: string, data: Buffer) =>
      ipcRenderer.invoke('file:save', path, data),
  },
  // 应用控制
  app: {
    minimize: () => ipcRenderer.send('app:minimize'),
    maximize: () => ipcRenderer.send('app:maximize'),
    close: () => ipcRenderer.send('app:close'),
  }
});
```

### 2. 数据存储策略

#### SQLite 存储（主进程）

**数据库表结构**：

```sql
-- 用户信息表
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 激活码记录表
CREATE TABLE activation_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'monthly', 'quarterly', 'yearly'
  activated_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 使用记录表
CREATE TABLE usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### LocalStorage 存储（渲染进程）

**存储内容**：
- `access_token`: JWT 访问令牌
- `refresh_token`: 刷新令牌（加密存储）
- `user_preferences`: 用户偏好设置（主题、语言等）
- `last_login`: 最后登录时间

#### 内存状态（Zustand）

```typescript
// src/store/auth.ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  subscription: SubscriptionStatus | null;
  login: (user: User, tokens: Tokens) => void;
  logout: () => void;
  updateSubscription: (subscription: SubscriptionStatus) => void;
}
```

---

## 功能设计

### 1. 用户认证系统

#### 注册流程

```
用户输入信息
  ↓
客户端表单验证
  ↓
调用 POST /api/auth/register
  ↓
服务端创建账号
  ↓
返回 token 和用户信息
  ↓
客户端存储 token（LocalStorage）
客户端保存用户信息（SQLite）
  ↓
跳转到激活页面
```

**API 接口**：
```typescript
POST /api/auth/register
Request: {
  username: string;
  email: string;
  password: string;
}
Response: {
  user: User;
  access_token: string;
  refresh_token: string;
}
```

#### 登录流程

```
用户输入凭证
  ↓
客户端表单验证
  ↓
调用 POST /api/auth/login
  ↓
服务端验证凭证
  ↓
返回 token 和用户信息
  ↓
客户端存储 token（LocalStorage）
客户端保存用户信息（SQLite）
  ↓
检查订阅状态
  ↓
跳转到对应页面（Dashboard 或 Activate）
```

**API 接口**：
```typescript
POST /api/auth/login
Request: {
  username: string;  // 或 email
  password: string;
}
Response: {
  user: User;
  access_token: string;
  refresh_token: string;
  subscription: SubscriptionStatus;
}
```

#### Token 管理

**Token 类型**：
- **Access Token**: 有效期 2 小时，用于 API 请求
- **Refresh Token**: 有效期 30 天，用于刷新 access token

**自动刷新机制**：
```typescript
// src/services/api.ts
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Token 过期，尝试刷新
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', {
            refresh_token: refreshToken
          });
          localStorage.setItem('access_token', data.access_token);
          // 重试原请求
          error.config.headers.Authorization = `Bearer ${data.access_token}`;
          return axios.request(error.config);
        } catch (refreshError) {
          // 刷新失败，跳转到登录页
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
```

### 2. 激活码/卡密系统

#### 激活码类型

| 类型 | 有效期 | 说明 |
|------|--------|------|
| 月卡 | 30 天 | monthly |
| 季卡 | 90 天 | quarterly |
| 年卡 | 365 天 | yearly |

#### 激活流程

```
用户输入激活码
  ↓
客户端格式验证
  ↓
调用 POST /api/activation/activate
  ↓
服务端验证激活码
  - 检查激活码是否存在
  - 检查是否已被使用
  - 检查是否过期
  ↓
激活成功
  - 更新用户订阅状态
  - 记录激活时间和到期时间
  ↓
返回订阅信息
  ↓
客户端保存激活记录（SQLite）
更新订阅状态（Zustand）
  ↓
显示激活成功提示
```

**API 接口**：
```typescript
POST /api/activation/activate
Request: {
  code: string;
}
Response: {
  success: boolean;
  subscription: {
    type: 'monthly' | 'quarterly' | 'yearly';
    activated_at: string;
    expires_at: string;
  };
}
```

#### 订阅状态查询

```typescript
GET /api/activation/status
Response: {
  is_active: boolean;
  type: string;
  expires_at: string;
  days_remaining: number;
}
```

#### 激活历史记录

```typescript
GET /api/activation/history
Response: {
  records: Array<{
    code: string;
    type: string;
    activated_at: string;
    expires_at: string;
  }>;
}
```

### 3. 用户信息管理

#### 获取用户信息

```typescript
GET /api/user/profile
Response: {
  user: {
    id: string;
    username: string;
    email: string;
    created_at: string;
  };
}
```

#### 查询余额/能量

```typescript
GET /api/user/balance
Response: {
  balance: number;      // 余额（元）
  energy: number;       // 能量点数
  currency: string;     // 货币单位
}
```

---

## UI 界面设计

### 1. 登录页面（Login.tsx）

**布局**：
- 居中卡片式设计
- 应用 Logo 和标题
- 用户名/邮箱输入框
- 密码输入框（带显示/隐藏切换）
- 记住我复选框
- 登录按钮
- "还没有账号？立即注册" 链接

**表单验证**：
- 用户名/邮箱：非空验证
- 密码：非空验证，最小长度 6 位

### 2. 注册页面（Register.tsx）

**布局**：
- 居中卡片式设计
- 用户名输入框
- 邮箱输入框
- 密码输入框（带强度提示）
- 确认密码输入框
- 注册按钮
- "已有账号？立即登录" 链接

**表单验证**：
- 用户名：3-20 个字符，字母数字下划线
- 邮箱：标准邮箱格式
- 密码：8-32 位，包含字母和数字
- 确认密码：与密码一致

**密码强度提示**：
- 弱：仅数字或字母
- 中：字母 + 数字
- 强：字母 + 数字 + 特殊字符

### 3. 激活页面（Activate.tsx）

**布局**：
- 当前订阅状态卡片
  - 订阅类型（月卡/季卡/年卡）
  - 到期时间
  - 剩余天数（进度条显示）
- 激活码输入区域
  - 激活码输入框（支持粘贴）
  - 激活按钮
- 激活历史记录列表
  - 激活码（部分隐藏）
  - 激活时间
  - 到期时间
  - 状态（有效/已过期）

### 4. 主面板（Dashboard.tsx）

**布局**：
- 顶部导航栏
  - 应用标题
  - 用户头像和用户名
  - 退出登录按钮
- 主内容区域
  - 用户信息卡片
    - 头像
    - 用户名
    - 邮箱
    - 注册时间
  - 订阅状态卡片
    - 订阅类型
    - 到期时间
    - 剩余天数
    - "续费" 按钮（跳转到激活页面）
  - 余额/能量卡片
    - 当前余额
    - 当前能量
    - "充值" 按钮（未来功能）
  - 快捷操作区域
    - 预留给未来的业务功能

---

## 安全性设计

### 1. Token 安全

**存储安全**：
- Access Token：明文存储在 LocalStorage（短期有效）
- Refresh Token：AES 加密后存储在 LocalStorage

**加密实现**：
```typescript
// src/utils/crypto.ts
import CryptoJS from 'crypto-js';

const SECRET_KEY = 'your-secret-key'; // 应用级密钥

export function encryptToken(token: string): string {
  return CryptoJS.AES.encrypt(token, SECRET_KEY).toString();
}

export function decryptToken(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
```

**清理策略**：
- 应用关闭时可选清除 token
- 退出登录时清除所有 token
- Token 过期后自动清除

### 2. 数据库安全

**SQLite 加密**（可选）：
- 使用 SQLCipher 加密数据库文件
- 密钥派生自用户密码或设备标识

**SQL 注入防护**：
- 使用参数化查询
- 验证所有输入数据

### 3. 网络安全

**HTTPS 通信**：
- 所有 API 请求使用 HTTPS
- 验证服务端证书

**请求签名**（可选）：
```typescript
// 为每个请求添加签名
axios.interceptors.request.use(config => {
  const timestamp = Date.now();
  const signature = generateSignature(config.url, timestamp);
  config.headers['X-Timestamp'] = timestamp;
  config.headers['X-Signature'] = signature;
  return config;
});
```

### 4. 激活码安全

**格式验证**：
- 激活码格式：`XXXX-XXXX-XXXX-XXXX`（16 位）
- 客户端验证格式，防止恶意输入

**服务端验证**：
- 检查激活码是否存在
- 检查是否已被使用
- 检查是否过期
- 记录激活 IP 和设备信息

---

## 错误处理

### 1. 网络错误

**错误类型**：
- 连接失败（ECONNREFUSED）
- 超时（ETIMEDOUT）
- 网络中断（Network Error）

**处理策略**：
```typescript
// src/services/api.ts
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNREFUSED') {
      toast.error('无法连接到服务器，请检查网络连接');
    } else if (error.code === 'ETIMEDOUT') {
      toast.error('请求超时，请稍后重试');
    } else if (error.message === 'Network Error') {
      toast.error('网络错误，请检查网络连接');
    } else if (error.response) {
      handleHttpError(error.response);
    }
    return Promise.reject(error);
  }
);
```

### 2. HTTP 错误

**状态码处理**：
```typescript
function handleHttpError(response: AxiosResponse) {
  switch (response.status) {
    case 400:
      toast.error(response.data.message || '请求参数错误');
      break;
    case 401:
      toast.error('登录已过期，请重新登录');
      // 跳转到登录页
      window.location.href = '/login';
      break;
    case 403:
      toast.error('订阅已过期，请激活卡密');
      // 跳转到激活页
      window.location.href = '/activate';
      break;
    case 404:
      toast.error('请求的资源不存在');
      break;
    case 500:
      toast.error('服务器错误，请稍后重试');
      break;
    default:
      toast.error('未知错误，请联系客服');
  }
}
```

### 3. 数据库错误

**错误处理**：
```typescript
// electron/database.ts
try {
  const result = db.prepare(sql).run(params);
  return result;
} catch (error) {
  console.error('Database error:', error);
  // 降级处理：使用内存存储
  return fallbackToMemoryStorage();
}
```

### 4. 表单验证错误

**实时验证**：
- 输入框失焦时验证
- 提交时再次验证
- 显示友好的错误提示

---

## 开发计划

### 阶段一：项目初始化（1-2 天）

**任务**：
1. 创建 `client/` 目录结构
2. 初始化 npm 项目：`pnpm init`
3. 安装依赖包
4. 配置 TypeScript
5. 配置 Vite
6. 配置 Electron
7. 配置 electron-builder
8. 测试基本的 Electron 窗口

**验收标准**：
- 能够启动 Electron 窗口
- 能够加载 React 应用
- 能够打包成 exe 文件

### 阶段二：基础功能（3-5 天）

**任务**：
1. 实现 Electron IPC 通信
2. 集成 SQLite 数据库
3. 实现数据库初始化和迁移
4. 实现 LocalStorage 封装
5. 搭建路由系统（React Router）
6. 创建页面框架（Login, Register, Activate, Dashboard）
7. 集成 shadcn/ui 组件

**验收标准**：
- IPC 通信正常工作
- SQLite 数据库能够读写
- 路由跳转正常
- UI 组件正常显示

### 阶段三：认证系统（3-4 天）

**任务**：
1. 实现登录页面和逻辑
2. 实现注册页面和逻辑
3. 实现表单验证
4. 实现 Token 管理
5. 实现自动刷新机制
6. 实现退出登录
7. 实现 "记住我" 功能

**验收标准**：
- 能够成功注册账号
- 能够成功登录
- Token 自动刷新正常工作
- 退出登录清除所有数据

### 阶段四：激活码系统（2-3 天）

**任务**：
1. 实现激活页面 UI
2. 实现激活码输入和验证
3. 实现订阅状态查询
4. 实现激活历史记录
5. 实现订阅状态显示
6. 实现到期提醒

**验收标准**：
- 能够成功激活卡密
- 订阅状态正确显示
- 激活历史记录正确显示
- 到期提醒正常工作

### 阶段五：测试与优化（2-3 天）

**任务**：
1. 功能测试（所有功能）
2. 错误处理完善
3. UI/UX 优化
4. 性能优化
5. 打包测试（Windows/Mac/Linux）
6. 编写用户文档

**验收标准**：
- 所有功能正常工作
- 错误处理完善
- UI 流畅美观
- 打包文件能够正常运行

---

## 依赖包清单

### 主进程依赖

```json
{
  "electron": "^28.0.0",
  "better-sqlite3": "^9.0.0",
  "electron-store": "^8.1.0"
}
```

### 渲染进程依赖

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "zustand": "^4.4.0",
  "axios": "^1.6.0",
  "@radix-ui/react-dialog": "latest",
  "@radix-ui/react-dropdown-menu": "latest",
  "@radix-ui/react-label": "latest",
  "@radix-ui/react-slot": "latest",
  "@radix-ui/react-toast": "latest",
  "tailwindcss": "^4.0.0",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.0.0",
  "tailwind-merge": "^2.0.0",
  "crypto-js": "^4.2.0"
}
```

### 开发依赖

```json
{
  "vite": "^5.0.0",
  "electron-builder": "^24.9.0",
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0",
  "@types/better-sqlite3": "^7.6.0",
  "@types/crypto-js": "^4.2.0",
  "typescript": "^5.3.0",
  "@vitejs/plugin-react": "^4.2.0",
  "autoprefixer": "^10.4.0",
  "postcss": "^8.4.0"
}
```

---

## 配置文件

### package.json

```json
{
  "name": "ai-video-gen-client",
  "version": "0.1.0",
  "description": "AI 视频生成器客户端",
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "electron": "electron .",
    "electron:dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder",
    "electron:build:win": "npm run build && electron-builder --win",
    "electron:build:mac": "npm run build && electron-builder --mac",
    "electron:build:linux": "npm run build && electron-builder --linux"
  },
  "build": {
    "appId": "com.aivideogen.client",
    "productName": "AI视频生成器",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "electron/**/*"
    ],
    "win": {
      "target": ["nsis", "portable"],
      "icon": "build/icon.ico"
    },
    "mac": {
      "target": ["dmg", "zip"],
      "icon": "build/icon.icns"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "build/icon.png"
    }
  }
}
```

### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 总结

### 核心特点

- ✅ **轻量级**：只包含认证和激活功能，快速上线
- ✅ **可扩展**：架构清晰，易于添加业务功能
- ✅ **安全性**：Token 加密、数据库隔离、HTTPS 通信
- ✅ **用户友好**：简洁的 UI，清晰的错误提示
- ✅ **跨平台**：支持 Windows/Mac/Linux

### 技术优势

- 使用 Electron + React，与服务端技术栈一致
- 复用 shadcn/ui 组件，保持 UI 风格统一
- SQLite + LocalStorage 混合存储，灵活高效
- Vite 构建，开发体验好，构建速度快

### 下一步行动

1. 创建 `client/` 项目结构
2. 初始化项目和安装依赖
3. 按照开发计划逐步实施
4. 定期测试和优化

---

**文档版本**: 1.0
**最后更新**: 2026-01-27
**作者**: Claude Code
**状态**: 设计完成，待实施
