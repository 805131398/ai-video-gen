# Sora 视频本地缓存功能

## 功能概述

角色编辑页面（`CharacterEdit`）的高级选项 Tab 中，Sora 角色分步深度萃取生成的视频（基础参考视频、最终角色萃取视频）自动缓存到本地，持久化为 `local-resource://` 路径，后续回显直接读取本地文件。

## 改动文件

- `electron/modules/resources/service.ts` — 新增 `sora_video` 资源类型，存储路径 `characters/{characterId}/sora-videos/{taskId}.{ext}`
- `src/pages/character/CharacterEdit.tsx` — 新增缓存逻辑，视频生成完成后自动下载并替换 URL

## 实现细节

### 1. 资源类型注册

在 `ensureResourceDirectory` 和 `getResourcePath` 中新增 `sora_video` 类型：

```
resources/
└── projects/{projectId}/
    └── characters/{characterId}/
        └── sora-videos/
            ├── {taskId1}.mp4
            └── {taskId2}.mp4
```

### 2. 缓存辅助函数

`cacheVideoToLocal(remoteUrl, taskId)` — 核心逻辑：

- 如果 URL 已是 `local-resource://` 开头，直接返回
- 调用 `window.electron.resources.download()` 下载到本地
- 下载成功返回 `local-resource://{localPath}`，失败则回退到远程 URL

```typescript
const cacheVideoToLocal = useCallback(async (remoteUrl: string, taskId: string): Promise<string> => {
  if (!remoteUrl || remoteUrl.startsWith('local-resource://')) return remoteUrl;
  const result = await window.electron.resources.download({
    url: remoteUrl,
    resourceType: 'sora_video',
    resourceId: taskId,
    projectId,
    characterId,
  });
  if (result.success && result.localPath) {
    return `local-resource://${result.localPath}`;
  }
  return remoteUrl;
}, [projectId, characterId]);
```

### 3. 缓存触发时机

| 场景 | 触发位置 | 说明 |
|------|---------|------|
| 基础视频生成完成 | `handleGenerateBaseVideo` | `pollLoop` 返回 URL 后立即缓存 |
| 恢复任务完成 | `resumeSoraTask` | 恢复轮询拿到 URL 后缓存 |
| 最终角色萃取完成 | `completeSoraTask` | 萃取完成后缓存，同时更新 `soraDigitalHumanUrl` |
| 页面加载补缓存 | `useEffect` (加载后) | 扫描已有远程 URL，逐个下载并持久化 |

### 4. 页面加载补缓存

针对历史数据中仍为远程 URL 的情况，页面加载完成后自动执行：

1. 遍历 `attributes.soraHistory`，将远程 `videoUrl` 替换为本地路径
2. 检查 `attributes.soraDigitalHumanUrl`，同样替换
3. 如有变更，调用 `updateCharacter` 持久化到数据库

### 5. 视频回显

两处视频展示均通过 Electron 自定义协议 `local-resource://` 直接播放本地文件：

- **核心角色深度萃取** — `<video src={attributes.soraDigitalHumanUrl} />`
- **生成历史与日志** — `<video src={item.videoUrl} />`

## 数据流

```
远程视频 URL (API 返回)
  → cacheVideoToLocal() 下载到本地
  → 返回 local-resource://{localPath}
  → 写入 attributes.soraHistory[].videoUrl / attributes.soraDigitalHumanUrl
  → updateCharacter() 持久化到数据库
  → <video> 标签通过 local-resource:// 协议播放
```
