# AI 工具对话页面与菜单改造

## 概述

改造左侧导航菜单，新增 AI 工具对话功能：
1. "工具管理" 改名为 "AI 模型配置"
2. 新增 "AI 工具" 可展开菜单，包含对话、图片、视频、音乐子项
3. 所有子项进入统一的 ChatGPT 风格对话页面，预选对应类型模型

## 菜单改造

- NavMenu 的 MenuItem 接口新增 `children` 字段支持子菜单
- "AI 模型配置" 保持路径 `/ai-tools`
- "AI 工具" 展开子项：
  - 对话 → `/ai-chat?type=text_chat`
  - 图片 → `/ai-chat?type=image_gen`
  - 视频 → `/ai-chat?type=video_gen`
  - 音乐 → `/ai-chat?type=music_gen`
- 子菜单默认展开，支持点击收起/展开
- 父菜单高亮跟随子项激活状态

## 对话页面（AiChat）

布局：
- 顶部栏：模型选择下拉框（按类型分组，显示默认标记 ★）
- 左侧边栏（260px）：对话历史列表，按时间分组（今天/昨天/更早），支持新建、删除、重命名
- 主区域：消息列表（用户消息靠右蓝色气泡，AI 回复靠左灰色气泡）
- 底部：输入框（支持 Enter 发送，Shift+Enter 换行）+ 发送按钮
- 高级配置面板：temperature 滑块 + max_tokens 输入框

对话流程：
1. 从菜单进入，根据 `?type` 预选该类型默认模型
2. 页面内可自由切换所有已配置的模型
3. 用户输入 → Electron 主进程调用 OpenAI 兼容 API → SSE 流式返回
4. 消息实时渲染，完成后存入本地 SQLite
5. AI 回复使用 `react-markdown` + `remark-gfm` 渲染 Markdown（代码块、表格、列表等）

技术要点：
- API 调用在 Electron 主进程中发起，避免浏览器 CORS 限制
- 流式响应通过 `ipcMain` → `webContents.send` → `ipcRenderer.on` 传递到渲染进程
- Base URL 智能处理：自动去除已知路径后缀（`/chat/completions` 等）避免重复拼接

## 数据模型

```sql
-- 对话会话
CREATE TABLE chat_conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  model_config_id TEXT,
  tool_type TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- 对话消息
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  model_name TEXT,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
);
```

## 新增依赖

- `react-markdown` — Markdown 渲染
- `remark-gfm` — GitHub Flavored Markdown 支持（表格、删除线、任务列表等）

## 新增类型

- `ChatConversation` — 对话会话
- `ChatMessage` — 对话消息
- `AiChatRequest` — AI 聊天请求参数
- `AiChatStreamChunk` — 流式响应块（delta / done / error）
- `window.electron.chat` — 流式对话 IPC 接口
- `window.electron.db` — 扩展对话相关 CRUD 方法

## 涉及文件

| 文件 | 变更 |
|------|------|
| `client/src/types/index.ts` | 新增对话相关类型定义 |
| `client/electron/database.ts` | 新增 2 张表 + CRUD 函数 |
| `client/electron/preload.ts` | 暴露对话 IPC + 流式 chat API |
| `client/electron/main.ts` | 注册 IPC handler + OpenAI 兼容流式调用 |
| `client/src/services/chatService.ts` | 新建渲染进程服务层 |
| `client/src/components/layout/NavMenu.tsx` | 支持可展开子菜单 |
| `client/src/pages/AiToolManagement.tsx` | 标题改为"AI 模型配置" |
| `client/src/pages/AiChat.tsx` | 新建 ChatGPT 风格对话页面 |
| `client/src/App.tsx` | 注册 `/ai-chat` 路由 |
