# Mini Toast 轻量级通知组件

## 背景

原有的 shadcn/ui Toast 组件存在以下问题：
- 自动消失延迟设为 1000000ms（约16分钟），基本不会自动消失
- 体积大（p-6 padding + 关闭按钮），简单反馈信息占用过多空间
- 位置在右下角（桌面端），不够醒目

## 新组件设计

创建了 `MiniToastProvider` + `showToast` 全局函数，替代原有的 `useToast` hook。

### 特性
- 顶部居中显示，深色背景 + 白色文字
- 紧凑布局（px-4 py-2.5），无关闭按钮
- 2.5 秒自动消失，带 slide-down 进入 + fade-out 退出动画
- 支持三种变体：success（绿色图标）、error（红色背景）、info（蓝色图标）
- 尊重 `prefers-reduced-motion` 无障碍设置
- 全局 `showToast()` 函数，无需 hook，任何地方直接调用

### 使用方式

```tsx
import { showToast } from '@/components/ui/mini-toast';

showToast('操作成功');              // 默认 success
showToast('操作失败', 'error');     // 错误提示
showToast('提示信息', 'info');      // 信息提示
```

## 改动文件

- `src/components/ui/mini-toast.tsx` — 新组件
- `src/index.css` — 添加 miniToastIn / miniToastOut keyframe 动画
- `src/App.tsx` — 添加 `MiniToastProvider` 包裹
- `src/pages/AiChat.tsx` — 替换 useToast → showToast
- `src/pages/CharacterNew.tsx` — 替换 useToast → showToast
- `src/pages/CharacterEdit.tsx` — 替换 useToast → showToast
- `src/components/profile/StoragePathConfig.tsx` — 替换 useToast → showToast
- `src/components/profile/AppSettings.tsx` — 替换 useToast → showToast
- `src/components/profile/StorageUsageDisplay.tsx` — 替换 useToast → showToast
