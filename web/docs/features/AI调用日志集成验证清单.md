# AI 调用日志集成验证清单

**日期**: 2026-02-14
**版本**: v1.0
**状态**: 待验证

## 概述

本文档用于验证所有 AI 调用点的日志记录功能是否正常工作。

## 验证范围

### 已集成的 AI 调用点

#### TEXT 类型 (6 个)
- [ ] `/api/ai/copywriting` - 文案生成
- [ ] `/api/ai/titles` - 标题生成
- [ ] `/api/projects/[id]/characters/generate-description` - 角色描述生成
- [ ] `/api/projects/[id]/scripts/generate-synopsis` - 剧本大纲生成
- [ ] `/api/projects/[id]/scripts/generate-scenes` - 分场景生成

#### IMAGE 类型 (3 个)
- [ ] `/api/ai/images` - 基础图片生成
- [ ] `/api/projects/[id]/steps/images/generate` - 项目图片生成（异步）
- [ ] `/api/projects/[id]/characters/[characterId]/digital-humans/generate` - 数字人生成（异步）

#### VIDEO 类型 (1 个)
- [ ] 视频轮询服务 (`video-polling-service.ts`) - 包含 SUCCESS/FAILED/TIMEOUT 三种状态

#### VOICE 类型 (1 个)
- [ ] `/api/ai/voice` - 语音生成

**总计**: 11 个集成点

---

## 验证项目

### 1. 数据完整性验证

每个日志记录应包含以下必填字段：

- [ ] `modelType` - 模型类型（TEXT/IMAGE/VIDEO/VOICE）
- [ ] `modelConfigId` - 使用的 AI 配置 ID
- [ ] `tenantId` - 租户 ID
- [ ] `userId` - 用户 ID
- [ ] `projectId` - 项目 ID（如果有）
- [ ] `inputTokens` - 输入 token 数
- [ ] `outputTokens` - 输出 token 数
- [ ] `cost` - 费用
- [ ] `latencyMs` - 延迟时间（毫秒）
- [ ] `status` - 状态（SUCCESS/FAILED）
- [ ] `taskId` - 任务 ID
- [ ] `requestUrl` - 请求 URL（新增）
- [ ] `requestBody` - 请求体（新增，JSON 格式）
- [ ] `responseBody` - 响应体（新增，JSON 格式）
- [ ] `createdAt` - 创建时间

失败日志还应包含：
- [ ] `errorMessage` - 错误信息

### 2. 业务逻辑验证

#### TEXT 类型
- [ ] Token 估算准确（中文 1.5 字符/token，英文 4 字符/token）
- [ ] 成功调用记录 SUCCESS 状态
- [ ] 失败调用记录 FAILED 状态和错误信息
- [ ] requestBody 包含完整的提示词参数
- [ ] responseBody 包含生成的文本内容

#### IMAGE 类型
- [ ] inputTokens = 提示词长度
- [ ] outputTokens = 生成图片数量
- [ ] 异步生成时每张图片都有独立日志
- [ ] 成功和失败都有记录
- [ ] requestBody 包含提示词和参数
- [ ] responseBody 包含图片 URL

#### VIDEO 类型
- [ ] inputTokens = 提示词长度
- [ ] outputTokens = 视频时长（秒）
- [ ] cost 根据时长计算（10s=$0.05, 15s=$0.075）
- [ ] latencyMs 从任务创建到完成的总时间
- [ ] 三种状态都能正确记录：
  - [ ] SUCCESS - 生成成功
  - [ ] FAILED - 生成失败
  - [ ] FAILED - 超时（10 分钟）
- [ ] requestBody 包含 prompt 和 duration
- [ ] responseBody 包含 videoUrl 和 duration

#### VOICE 类型
- [ ] inputTokens = 文本长度
- [ ] outputTokens = 1（音频文件数）
- [ ] requestBody 包含 text, voiceId, speed, pitch
- [ ] responseBody 包含 audioUrl

### 3. 前端页面验证

访问 `/admin/ai-logs` 管理页面：

- [ ] 页面正常加载
- [ ] 筛选功能：
  - [ ] 时间范围筛选
  - [ ] 模型类型筛选（TEXT/IMAGE/VIDEO/VOICE）
  - [ ] 状态筛选（SUCCESS/FAILED）
  - [ ] 用户筛选
  - [ ] 项目筛选
  - [ ] 模型配置筛选
  - [ ] 关键词搜索（搜索 taskId）
  - [ ] 任务 ID 筛选
- [ ] 数据表格：
  - [ ] 显示时间、模型类型、模型名称、用户、项目等列
  - [ ] 显示请求 URL、任务 ID、延迟、费用、状态
  - [ ] 操作列可以查看详情
- [ ] 分页功能：
  - [ ] 每页 20 条记录
  - [ ] 总记录数正确
  - [ ] 页码跳转正常
- [ ] 详情抽屉：
  - [ ] 点击"查看详情"打开抽屉
  - [ ] 显示完整日志信息
  - [ ] requestBody 和 responseBody JSON 格式化显示
  - [ ] 可以复制 JSON 内容
  - [ ] 关闭抽屉正常

### 4. 性能验证

- [ ] 异步日志记录不阻塞 API 响应
- [ ] 批量生成时每个任务都有独立日志
- [ ] 日志记录失败不影响业务流程
- [ ] 数据库查询性能（100+ 日志记录时）
- [ ] 前端列表加载速度（1000+ 日志记录时）

### 5. 边界情况验证

- [ ] AI 服务不可用时记录失败日志
- [ ] 网络超时时记录失败日志
- [ ] 并发请求时日志不重复
- [ ] 取消任务时不记录日志（IMAGE/VIDEO 异步任务）
- [ ] 配置不存在时的错误处理

---

## 测试步骤

### 准备工作

1. 确保数据库 schema 已更新：
   ```bash
   pnpm db:push
   ```

2. 确保有测试用户和 AI 配置：
   - 登录系统
   - 检查 AI 配置是否存在（TEXT/IMAGE/VIDEO/VOICE）

### TEXT 类型测试

**测试 1: 文案生成**
1. 访问项目创建页面
2. 输入主题，点击生成文案
3. 检查 `/admin/ai-logs` 页面是否有新记录
4. 验证字段完整性
5. 检查 requestBody 包含完整提示词
6. 检查 responseBody 包含生成的文案

**测试 2: 标题生成**
1. 输入主题，点击生成标题
2. 检查日志记录
3. 验证 inputTokens 和 outputTokens

**测试 3: 角色描述生成**
1. 创建角色，点击生成描述
2. 检查日志记录
3. 验证 taskId 格式为 `character-desc-{characterId}`

**测试 4: 剧本大纲生成**
1. 创建剧本，点击生成大纲
2. 检查日志记录
3. 验证 taskId 格式为 `synopsis-{scriptId}`

**测试 5: 分场景生成**
1. 生成剧本场景
2. 检查日志记录
3. 验证 taskId 格式为 `scenes-{scriptId}`

### IMAGE 类型测试

**测试 6: 基础图片生成**
1. 调用 `/api/ai/images` 接口
2. 检查日志记录
3. 验证 outputTokens = 生成图片数量

**测试 7: 项目图片生成（异步）**
1. 在项目中生成 4 张图片
2. 等待生成完成
3. 检查是否有 4 条日志记录
4. 验证每条日志的 taskId 不同（`image-{batchId}-{index}`）
5. 检查成功和失败都有记录

**测试 8: 数字人生成（异步）**
1. 为角色生成数字人
2. 等待生成完成
3. 检查日志记录
4. 验证 taskId 格式为 `digital-human-{batchId}-{index}`

### VIDEO 类型测试

**测试 9: 视频生成 - 成功场景**
1. 生成一个视频
2. 等待生成完成（轮询）
3. 检查日志记录：
   - status = SUCCESS
   - outputTokens = 视频时长
   - cost 根据时长计算
   - latencyMs 为总耗时
   - requestBody 包含 prompt 和 duration
   - responseBody 包含 videoUrl 和 duration

**测试 10: 视频生成 - 失败场景**
（需要模拟 AI 服务返回失败）
1. 检查日志记录：
   - status = FAILED
   - errorMessage 存在

**测试 11: 视频生成 - 超时场景**
（需要等待 10 分钟或修改超时时间）
1. 检查日志记录：
   - status = FAILED
   - errorMessage = "视频生成超时（超过 10 分钟）"

### VOICE 类型测试

**测试 12: 语音生成**
1. 调用 `/api/ai/voice` 接口
2. 检查日志记录
3. 验证：
   - inputTokens = 文本长度
   - outputTokens = 1
   - requestBody 包含 text, voiceId, speed, pitch
   - responseBody 包含 audioUrl

### 前端页面测试

**测试 13: 筛选功能**
1. 测试时间范围筛选
2. 测试模型类型筛选（选择 TEXT，应该只显示 TEXT 类型日志）
3. 测试状态筛选（选择 SUCCESS/FAILED）
4. 测试关键词搜索
5. 点击任务 ID，验证筛选同任务的所有日志

**测试 14: 详情抽屉**
1. 点击任意日志的"查看详情"
2. 验证所有字段都正确显示
3. 验证 requestBody 和 responseBody JSON 格式化
4. 验证可以复制 JSON 内容

**测试 15: 分页功能**
1. 生成 30+ 条日志
2. 验证分页显示正确
3. 验证页码跳转正常

---

## 验证结果

### 发现的问题

记录测试过程中发现的问题：

1. **问题描述**:
   - 具体现象：
   - 复现步骤：
   - 影响范围：
   - 修复建议：

### 验证通过标准

- [ ] 所有 11 个集成点都能正确记录日志
- [ ] 所有必填字段都完整
- [ ] 成功和失败场景都能正确处理
- [ ] requestBody 和 responseBody 内容完整
- [ ] 前端页面所有功能正常
- [ ] 性能满足要求（响应时间 < 3s）
- [ ] 无数据泄露风险（敏感信息已脱敏）

### 最终结论

- [ ] ✅ 验证通过，可以上线
- [ ] ⚠️ 部分问题，需要修复后再验证
- [ ] ❌ 严重问题，需要重新实施

---

## 后续优化建议

1. **性能优化**
   - 添加日志表索引（modelType, userId, createdAt）
   - 实现日志归档策略（保留 30 天）
   - 考虑使用消息队列异步写入日志

2. **功能增强**
   - 添加统计图表（每日调用量、成本趋势）
   - 添加导出功能（CSV/Excel）
   - 添加告警功能（成本超标、错误率过高）

3. **安全加固**
   - 敏感信息脱敏（API Key、密钥）
   - 日志访问权限控制
   - 审计日志查看操作

---

**验证人员**: ___________
**验证日期**: ___________
**审核人员**: ___________
**审核日期**: ___________
