# AI 使用统计功能

## 概述

记录用户每次 AI 调用的详细日志，并提供仪表盘 + 日志列表页面展示。左侧菜单「使用统计」入口，路径 `/stats`。

## 功能特性

- 自动记录所有 AI 对话调用的完整日志（请求/响应/token/耗时/状态）
- 汇总卡片：总调用次数、Token 消耗、成功率
- 调用趋势折线图（Recharts）
- 日志列表：分页、按类型/状态/时间范围筛选
- 点击日志行展开右侧详情抽屉，查看完整 Request/Response Body
- 图片类型日志在详情中直接展示生成的图片
- 支持删除单条日志和清空全部日志

## 数据模型

```sql
CREATE TABLE ai_usage_logs (
  id TEXT PRIMARY KEY,
  tool_type TEXT NOT NULL,          -- text_chat / image_gen / video_gen / music_gen
  model_name TEXT,
  model_config_id TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  duration_ms INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  request_body TEXT,                -- 完整请求 JSON（隐藏 apiKey）
  response_body TEXT,               -- 完整响应内容
  user_input TEXT,                  -- 用户输入摘要（前 500 字符）
  ai_output TEXT,                   -- AI 输出摘要（前 500 字符）
  conversation_id TEXT,
  base_url TEXT,
  temperature REAL,
  max_tokens INTEGER,
  extra_data TEXT,                  -- JSON 扩展字段，预留后续使用
  created_at DATETIME NOT NULL
);
```

## 日志采集

在 `main.ts` 的 `chat:sendMessage` IPC handler 中自动采集：
- 请求前记录 `startTime`，完成后计算 `durationMs`
- 从 OpenAI 兼容 API 的流式响应中提取 `usage` 信息（token 统计）
- 成功/失败/异常三种场景均记录日志
- `AiChatRequest` 扩展了 `conversationId`、`modelConfigId`、`toolType` 字段

## 新增依赖

- `recharts` — 趋势折线图

## 新增类型

- `AiUsageLog` — 使用日志记录
- `UsageStatsQuery` — 查询参数（分页 + 筛选）
- `UsageStatsSummary` — 汇总统计
- `DailyUsageStat` — 每日统计（趋势图数据）

## 涉及文件

| 文件 | 变更 |
|------|------|
| `client/src/types/index.ts` | 新增 4 个类型 + ElectronAPI 接口扩展 + AiChatRequest 扩展 |
| `client/electron/database.ts` | 新增 `ai_usage_logs` 表 + 6 个 CRUD 函数 |
| `client/electron/main.ts` | 注册 6 个 IPC handler + 改造 `chat:sendMessage` 日志采集 |
| `client/electron/preload.ts` | 暴露 6 个使用日志 IPC 方法 |
| `client/src/services/usageStats.ts` | 新建渲染进程服务层 |
| `client/src/pages/UsageStats.tsx` | 新建使用统计页面 |
| `client/src/pages/AiChat.tsx` | 传递 conversationId/modelConfigId/toolType 到主进程 |
| `client/src/App.tsx` | 注册 `/stats` 路由 |
| `client/src/components/layout/NavMenu.tsx` | 启用「使用统计」菜单项 |

## 注意事项

- 修改 `electron/*.ts` 后需执行 `pnpm run build:electron` 编译为 `.js`，Electron 主进程加载的是编译后的 JS 文件
- `request_body` 中不包含 `apiKey`，避免敏感信息泄露
- `response_body` 最多保存前 10000 字符，`aiOutput` 摘要保存前 500 字符
- `extra_data` 为 JSON 扩展字段，后续可用于记录图片/视频/音乐生成的额外参数
