# 可折叠侧边栏布局设计

**日期**: 2026-01-28
**状态**: 已批准，准备实施

## 概述

为客户端应用添加专业的可折叠侧边栏布局，提升用户体验和应用的可扩展性。

## 设计目标

- 提供统一的导航体验
- 支持侧边栏折叠/展开功能
- 为未来功能扩展预留空间
- 保持简洁现代的设计风格

## 整体架构

### 布局特点

- 侧边栏采用固定定位，始终可见
- 折叠时宽度 64px（只显示图标）
- 展开时宽度 240px（显示图标+文字）
- 主内容区域自动适应侧边栏宽度
- 使用 Minimalism 风格：简洁、高对比度、快速响应

### 菜单结构

```
[顶部 - 用户信息区]
- 头像 + 用户名（展开时）
- 订阅状态指示器

[中部 - 主要功能]
📊 概览
🎫 激活卡密
🎬 创建视频（灰色，标记"即将上线"）
📈 使用统计（灰色，标记"即将上线"）

[底部 - 固定]
⚙️ 设置
🚪 退出登录
```

## 组件结构

```
<AppLayout>                    // 新建：主布局组件
  ├─ <Sidebar>                 // 新建：侧边栏组件
  │   ├─ <SidebarHeader>       // 折叠按钮 + Logo
  │   ├─ <UserSection>         // 用户信息区
  │   ├─ <NavMenu>             // 导航菜单
  │   └─ <SidebarFooter>       // 设置 + 退出
  └─ <MainContent>             // 主内容区
      └─ {children}            // Dashboard/Activate 等页面
```

## 技术实现

### 状态管理

1. **侧边栏折叠状态**: 使用 `localStorage` 持久化
2. **当前路由**: 使用 `react-router-dom` 的 `useLocation` 自动高亮
3. **用户信息**: 继续使用现有的 `useAuthStore` (Zustand)

### 路由重构

```tsx
<Route path="/" element={<AppLayout />}>
  <Route path="dashboard" element={<Dashboard />} />
  <Route path="activate" element={<Activate />} />
  <Route path="settings" element={<Settings />} />
</Route>
```

## 视觉设计

### 配色方案

```css
/* 主色调 */
Primary: #3B82F6 (blue-500)
Primary Hover: #2563EB (blue-600)

/* 背景色 */
Sidebar BG: #FFFFFF (white)
Main BG: #F9FAFB (gray-50)
Hover BG: #F3F4F6 (gray-100)

/* 文字色 */
Text Primary: #0F172A (slate-900)
Text Secondary: #64748B (slate-500)
Text Disabled: #CBD5E1 (slate-300)

/* 边框 */
Border: #E2E8F0 (slate-200)
Active Border: #3B82F6 (blue-500)
```

### 间距与尺寸

- 侧边栏折叠宽度: `w-16` (64px)
- 侧边栏展开宽度: `w-60` (240px)
- 菜单项高度: `h-12` (48px)
- 图标尺寸: `w-5 h-5` (20px)
- 内边距: `px-4` (16px) 水平，`py-3` (12px) 垂直

### 动画与过渡

- 侧边栏宽度变化: `transition-all duration-300 ease-in-out`
- 菜单项悬停: `transition-colors duration-200`
- 文字淡入淡出: `transition-opacity duration-200`
- 图标旋转（折叠按钮）: `transition-transform duration-300`

### 字体配置

- 标题字体: Poppins（英文）+ PingFang SC（中文）
- 正文字体: Open Sans（英文）+ PingFang SC（中文）
- 字体文件已下载到本地 `client/src/assets/fonts/`

## 实现步骤

### 需要创建的文件

```
client/src/
├── components/
│   └── layout/
│       ├── AppLayout.tsx
│       ├── Sidebar.tsx
│       ├── SidebarHeader.tsx
│       ├── UserSection.tsx
│       ├── NavMenu.tsx
│       └── SidebarFooter.tsx
├── hooks/
│   └── useSidebarState.ts
```

### 需要修改的文件

- `client/src/App.tsx` - 更新路由结构
- `client/src/pages/Dashboard.tsx` - 移除顶部栏
- `client/src/pages/Activate.tsx` - 移除顶部栏

### 实施顺序

1. 创建 `useSidebarState.ts` Hook
2. 创建 `Sidebar.tsx` 及其子组件
3. 创建 `AppLayout.tsx` 布局组件
4. 修改 `App.tsx` 路由结构
5. 简化 `Dashboard.tsx` 和 `Activate.tsx`
6. 测试和调整

## 关键技术点

- **状态持久化**: 使用 `localStorage` 保存折叠状态
- **路由高亮**: 使用 `useLocation()` 自动匹配当前路由
- **动画过渡**: 使用 Tailwind 的 `transition-all` 实现平滑动画
- **图标系统**: 使用 Lucide React（专业 SVG 图标）
- **响应式**: 侧边栏在移动端自动隐藏，使用汉堡菜单

## 预期效果

- 侧边栏折叠时: 64px 宽，只显示图标
- 侧边栏展开时: 240px 宽，显示图标+文字
- 主内容区自动适应: `ml-16` 或 `ml-60`
- 所有交互都有平滑过渡效果
- 用户偏好会被记住（localStorage）

## 设计原则

- 使用 Lucide React 图标（不使用 emoji）
- 所有交互元素添加 `cursor-pointer` 和平滑过渡
- 当前激活菜单项有明显的视觉反馈
- 遵循 WCAG AA 无障碍标准
- 保持 YAGNI 原则，不过度设计
