# AI 调用日志集成补充说明

**日期**: 2026-02-14
**版本**: v1.1

## 问题发现

在用户测试过程中，发现 `preview-prompt` 接口调用了 AI 但没有记录日志。

### 问题分析

**调用链路**:
```
POST /api/projects/[id]/scripts/[scriptId]/scenes/[sceneId]/preview-prompt
  → buildVideoPrompt() (type: "ai_optimized")
    → buildAIOptimizedPrompt()
      → optimizePromptForVideo()
        → AIClient.generateText() ⚠️ 缺少日志记录
```

**根本原因**: `video-prompt-builder.ts` 中的 `optimizePromptForVideo()` 函数直接调用 AI，但没有集成日志记录。

---

## 修复方案

### 修改文件
- `src/lib/services/video-prompt-builder.ts`

### 修改内容

1. **导入日志服务**
   ```typescript
   import { logAIUsage } from "@/lib/services/ai-usage-service";
   ```

2. **添加 Token 估算函数**
   ```typescript
   function estimateTokenCount(text: string): number {
     const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
     const otherChars = text.length - chineseChars;
     return Math.ceil(chineseChars / 1.5 + otherChars / 4);
   }
   ```

3. **在 `optimizePromptForVideo()` 中添加日志记录**
   - 记录 AI 调用开始时间
   - 成功时记录：
     - inputTokens: systemPrompt + userPrompt 的 token 数
     - outputTokens: 优化后 prompt 的 token 数
     - requestBody: 包含 systemPrompt, userPrompt, basePrompt
     - responseBody: 包含 optimizedPrompt
   - 失败时记录错误信息

### Git 提交
```bash
git commit 199a1f0
feat(service): add usage logging to video prompt optimization
```

---

## 更新后的集成列表

### TEXT 类型 (7 个) ← 新增 1 个

| 序号 | API/服务 | 功能 | 提交 | 状态 |
|------|---------|------|------|------|
| 1 | `/api/ai/copywriting` | 文案生成 | bfdefc6 | ✅ |
| 2 | `/api/ai/titles` | 标题生成 | 7327afc | ✅ |
| 3 | `/api/projects/[id]/characters/generate-description` | 角色描述生成 | 5f493a7 | ✅ |
| 4 | `/api/projects/[id]/scripts/generate-synopsis` | 剧本大纲生成 | 7ee2e47 | ✅ |
| 5 | `/api/projects/[id]/scripts/generate-scenes` | 分场景生成 | a054229 | ✅ |
| **6** | **`video-prompt-builder.optimizePromptForVideo()`** | **视频提示词优化** | **199a1f0** | **✅ 新增** |

**调用路径**: `/api/projects/[id]/scripts/[scriptId]/scenes/[sceneId]/preview-prompt` (type: "ai_optimized")

### 其他类型
- IMAGE 类型: 3 个（无变化）
- VIDEO 类型: 1 个（无变化）
- VOICE 类型: 1 个（无变化）

**新的总计**: **12 个集成点**（原 11 个 + 1 个补充）

---

## 日志记录详情

### 成功日志示例
```json
{
  "modelType": "TEXT",
  "modelConfigId": "uuid",
  "tenantId": "uuid",
  "userId": "uuid",
  "inputTokens": 450,
  "outputTokens": 120,
  "cost": 0.01,
  "latencyMs": 3200,
  "status": "SUCCESS",
  "taskId": "video-prompt-optimize-1771016753000",
  "requestUrl": "https://api.bltcy.ai/v1/chat/completions",
  "requestBody": {
    "systemPrompt": "You are a professional video prompt engineer...",
    "userPrompt": "Transform this scene description...",
    "basePrompt": "full follow shot, pull movement..."
  },
  "responseBody": {
    "optimizedPrompt": "A full follow shot tracks a middle-aged father..."
  }
}
```

### 失败日志示例
```json
{
  "modelType": "TEXT",
  "status": "FAILED",
  "errorMessage": "API timeout",
  "inputTokens": 300,
  "outputTokens": 0,
  "cost": 0
}
```

---

## 验证步骤

1. **触发 AI 优化**
   ```bash
   curl -X POST http://localhost:3000/api/projects/[id]/scripts/[scriptId]/scenes/[sceneId]/preview-prompt \
     -H "Content-Type: application/json" \
     -d '{"promptType": "ai_optimized"}'
   ```

2. **检查日志管理页面**
   - 访问 `/admin/ai-logs`
   - 筛选 modelType = TEXT
   - 查找 taskId 包含 "video-prompt-optimize" 的记录

3. **验证字段完整性**
   - 点击"查看详情"
   - 检查 requestBody 包含 systemPrompt, userPrompt, basePrompt
   - 检查 responseBody 包含 optimizedPrompt
   - 验证 token 数计算正确

---

## 经验教训

### 为什么会遗漏？

1. **服务层调用不明显**: AI 调用在 `video-prompt-builder.ts` 服务层，不是直接在 API 路由中
2. **调用链路复杂**: 从 API → buildVideoPrompt → buildAIOptimizedPrompt → optimizePromptForVideo
3. **调研时未深入**: 初始调研时只看了 API 路由层，没有深入追踪到服务层

### 如何避免？

1. **代码搜索关键词**
   - 搜索 `AIClient` 的所有使用位置
   - 搜索 `generateText`、`generateImages`、`generateVoice` 等方法调用
   - 搜索 `createAIClient` 的使用位置

2. **追踪调用链路**
   - 不仅看 API 路由，还要追踪到具体的实现函数
   - 检查 `lib/services/` 和 `lib/ai/` 目录下的所有 AI 调用

3. **测试驱动验证**
   - 在测试阶段尝试所有功能
   - 检查每个 AI 调用是否都有对应的日志记录

---

## 完整性检查清单

✅ **搜索所有 AI 客户端调用**
```bash
# 搜索 AIClient 实例化
grep -r "createAIClient" src/

# 搜索 AI 方法调用
grep -r "generateText\|generateImages\|generateVoice" src/

# 搜索 video client
grep -r "createVideoClient" src/
```

✅ **检查所有可能的调用位置**
- [x] `src/app/api/` - API 路由层
- [x] `src/lib/services/` - 服务层
- [x] `src/lib/ai/` - AI 客户端层

✅ **验证日志记录**
- [x] 同步调用使用 `withUsageLogging()`
- [x] 异步调用使用 `logAIUsage()`
- [x] 服务层调用使用 `logAIUsage()`

---

## 后续行动

1. **重新运行验证测试**
   - 按照 `AI调用日志集成验证清单.md` 重新测试
   - 特别测试 preview-prompt 接口（ai_optimized 模式）

2. **更新实施总结文档**
   - 更新集成点数量：11 → 12
   - 添加视频提示词优化到 TEXT 类型列表

3. **补充验证清单**
   - 添加 preview-prompt 测试用例
   - 验证 ai_optimized 和 smart_combine 两种模式

---

**修复日期**: 2026-02-14
**发现方式**: 用户测试反馈
**影响范围**: 视频提示词优化功能
**是否影响现有功能**: 否（只是日志缺失，业务功能正常）
