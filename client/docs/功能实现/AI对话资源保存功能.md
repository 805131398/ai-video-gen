# AI 对话资源保存功能

## 功能概述

在 AI 对话页面（`/ai-chat`）的 AI 回复消息气泡下方，增加操作栏，支持复制内容和保存资源文件到本地。

## 改动文件

- `src/pages/AiChat.tsx` - 添加消息操作栏 UI 和交互逻辑
- `src/types/index.ts` - `DownloadResourceParams` 新增 `chat_resource` 类型、`conversationId`、`customSavePath` 字段
- `electron/resources.ts` / `electron/resources.js` - 支持 `chat_resource` 资源类型的目录结构和下载

## 操作栏功能

### 复制按钮
- 始终显示在 AI 回复下方
- 复制消息原始文本到剪贴板

### 保存按钮
- 仅当消息中检测到资源 URL（图片/视频/音频）时显示
- 自动保存到用户在 Profile 中配置的存储路径
- 保存路径：`{resourcesRoot}/chat-resources/{conversationId}/{resourceId}.{ext}`
- 保存后替换消息中的远程 URL 为 `local-resource://` 本地路径
- 更新数据库中的消息内容

### 另存为按钮
- 弹出系统文件夹选择对话框
- 下载到用户选择的目录
- 同样替换消息中的 URL 并更新数据库

## 资源 URL 检测

通过正则匹配两种模式：
1. Markdown 图片语法：`![alt](url)`
2. 纯 URL 行：以 http 开头、以资源扩展名结尾的链接

## 状态显示

- 未保存：显示「保存」和「另存为」按钮
- 保存中：显示 loading 动画 + 「保存中...」
- 已保存：显示绿色 ✅「已保存」标记，隐藏保存按钮
- 已有本地路径的消息（`local-resource://`）自动识别为已保存状态
