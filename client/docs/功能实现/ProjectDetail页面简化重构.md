# ProjectDetail 页面简化重构

## 概述
将 ProjectDetail.tsx 从一个包含内联编辑器的复杂页面重构为纯粹的角色列表页面，所有编辑功能通过路由导航到独立的编辑页面。

## 修改内容

### 1. 移除的状态和引用
- 移除 `showDetailEditor` 状态及其所有引用
- 移除 `editingCharacter` 状态及其所有引用
- 移除 `CharacterDetailEditor` 组件的导入和使用
- 移除 `saving` 状态（未定义但被引用）

### 2. 移除的函数
- `handleCancelForm` - 取消编辑表单
- `handleSubmitCharacter` - 提交角色表单
- `handleGenerateDigitalHumansForCharacter` - 为角色生成数字人
- `handleSelectDigitalHuman` - 选择数字人

### 3. 简化的 UI 结构

#### 按钮区域（第 156-197 行）
**之前**: 根据 `showDetailEditor` 状态显示不同的按钮组
- 编辑模式：取消编辑、保存角色按钮
- 列表模式：剧本管理、选择角色、添加角色按钮

**之后**: 始终显示列表模式的按钮
- 剧本管理按钮
- 选择角色按钮（当有角色时显示）
- 编辑剧本按钮（选择模式下且有选中角色时显示）
- 添加角色按钮

#### 角色列表区域（第 207-231 行）
**之前**:
```tsx
{/* 角色编辑表单 - 内联显示 */}
{showDetailEditor && id && (
  <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
    <CharacterDetailEditor ... />
  </div>
)}

{/* 角色列表 */}
{characters.length === 0 && !showDetailEditor ? (
  <div>空状态提示</div>
) : (
  !showDetailEditor && (
    <div>角色卡片列表</div>
  )
)}
```

**之后**:
```tsx
{/* 角色列表 */}
{characters.length === 0 ? (
  <div>空状态提示</div>
) : (
  <div>角色卡片列表</div>
)}
```

### 4. 保留的核心功能

#### 导航函数（使用新路由）
- `handleAddCharacter`: 导航到 `/projects/${id}/characters/new`
- `handleEditCharacter`: 导航到 `/projects/${id}/characters/${character.id}/edit`
- `handleGenerateDigitalHuman`: 导航到 `/projects/${id}/characters/${character.id}/edit#digital-human`

#### 数据管理函数
- `loadData`: 加载项目和角色数据
- `handleDeleteCharacter`: 删除角色
- `handleToggleSelectMode`: 切换选择模式
- `handleToggleCharacterSelection`: 切换角色选中状态
- `handleCreateScriptsForSelectedCharacters`: 为选中角色创建剧本

## 代码统计
- **删除行数**: 约 50 行
- **修改前总行数**: 287 行
- **修改后总行数**: 237 行
- **代码减少**: ~17%

## 优势

### 1. 职责单一
- ProjectDetail 现在只负责展示角色列表
- 编辑功能完全由独立的编辑页面处理

### 2. 代码简洁
- 移除了复杂的条件渲染逻辑
- 减少了状态管理的复杂度
- 提高了代码可读性和可维护性

### 3. 用户体验
- 编辑页面独立，URL 可分享
- 浏览器前进/后退按钮正常工作
- 编辑状态不会影响列表页面

### 4. 性能优化
- 列表页面不需要加载编辑器组件
- 减少了不必要的重渲染

## 相关文件
- `/Users/zhanghao/SoftwareDevelopmentWork/ai-video-gen/client/src/pages/ProjectDetail.tsx` - 主文件
- `/Users/zhanghao/SoftwareDevelopmentWork/ai-video-gen/client/src/pages/CharacterEdit.tsx` - 独立编辑页面
- `/Users/zhanghao/SoftwareDevelopmentWork/ai-video-gen/client/src/components/project/CharacterCard.tsx` - 角色卡片组件

## 测试建议
1. 验证"添加角色"按钮导航到新建页面
2. 验证角色卡片的"编辑"按钮导航到编辑页面
3. 验证"生成数字人"按钮导航到编辑页面的数字人标签
4. 验证删除角色功能正常
5. 验证选择模式和批量创建剧本功能正常
6. 验证空状态显示正确
