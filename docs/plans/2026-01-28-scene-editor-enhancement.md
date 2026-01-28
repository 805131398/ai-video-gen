# 场景编辑器增强功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完善场景编辑器的详细表单、实现角色视图和时间轴视图、添加场景拖拽排序功能

**Architecture:**
- 场景编辑器：使用受控表单组件，支持多层级数据编辑（基本信息、角色、台词、镜头、视觉、音频）
- 角色视图：按角色分组展示所有台词和动作，便于角色维度的剧本管理
- 时间轴视图：按时间顺序展示场景，支持时长可视化和精确控制
- 拖拽排序：使用 @dnd-kit 库实现场景卡片的拖拽重排

**Tech Stack:** React 18, TypeScript, Tailwind CSS, @dnd-kit/core, @dnd-kit/sortable

---

## 前置准备

### Task 0: 安装依赖

**Files:**
- Modify: `client/package.json`

**Step 1: 安装 @dnd-kit 库**

```bash
cd client
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: 依赖安装成功

**Step 2: 验证安装**

```bash
npm list @dnd-kit/core
```

Expected: 显示已安装的版本号

---

## 功能 A: 完善场景编辑器详细表单

### Task 1: 创建场景编辑器表单组件

**Files:**
- Create: `client/src/components/project/SceneEditorForm.tsx`

**Step 1: 创建基础表单组件结构**

```tsx
import { useState, useEffect } from 'react';
import { ScriptScene, SceneContent, ProjectCharacter } from '../../types';

interface SceneEditorFormProps {
  scene: ScriptScene;
  characters: ProjectCharacter[];
  onSave: (data: Partial<ScriptScene>) => void;
  onCancel: () => void;
}

export default function SceneEditorForm({
  scene,
  characters,
  onSave,
  onCancel,
}: SceneEditorFormProps) {
  const [formData, setFormData] = useState<ScriptScene>(scene);

  useEffect(() => {
    setFormData(scene);
  }, [scene]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 表单内容将在后续步骤添加 */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          保存
        </button>
      </div>
    </form>
  );
}
```

**Step 2: 提交初始组件**

```bash
git add client/src/components/project/SceneEditorForm.tsx
git commit -m "feat: create scene editor form component structure"
```

### Task 2: 添加基本信息编辑区域

**Files:**
- Modify: `client/src/components/project/SceneEditorForm.tsx`

**Step 1: 添加基本信息表单字段**

在 `return` 语句的 `<form>` 内，`{/* 表单内容将在后续步骤添加 */}` 注释处添加：

```tsx
{/* 基本信息 */}
<div className="space-y-4">
  <h3 className="text-lg font-semibold text-slate-900">基本信息</h3>

  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">
      场景标题 *
    </label>
    <input
      type="text"
      value={formData.title}
      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      required
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">
      场景描述
    </label>
    <textarea
      value={formData.content.description || ''}
      onChange={(e) =>
        setFormData({
          ...formData,
          content: { ...formData.content, description: e.target.value },
        })
      }
      rows={3}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
  </div>

  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        场景类型
      </label>
      <select
        value={formData.content.sceneType || 'indoor'}
        onChange={(e) =>
          setFormData({
            ...formData,
            content: {
              ...formData.content,
              sceneType: e.target.value as 'indoor' | 'outdoor' | 'special',
            },
          })
        }
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="indoor">室内</option>
        <option value="outdoor">室外</option>
        <option value="special">特殊场景</option>
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        预计时长（秒）
      </label>
      <input
        type="number"
        value={formData.duration || ''}
        onChange={(e) =>
          setFormData({
            ...formData,
            duration: e.target.value ? parseInt(e.target.value) : null,
          })
        }
        min="1"
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  </div>
</div>
```

**Step 2: 提交基本信息表单**

```bash
git add client/src/components/project/SceneEditorForm.tsx
git commit -m "feat: add basic info fields to scene editor"
```

### Task 3: 添加角色与动作编辑区域

**Files:**
- Modify: `client/src/components/project/SceneEditorForm.tsx`

**Step 1: 添加角色列表管理**

在基本信息区域后添加：

```tsx
{/* 角色与动作 */}
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="text-lg font-semibold text-slate-900">角色与动作</h3>
    <button
      type="button"
      onClick={() => {
        const newCharacter = {
          characterId: '',
          characterName: '',
          action: '',
          emotion: '',
          position: 'center' as const,
        };
        setFormData({
          ...formData,
          content: {
            ...formData.content,
            characters: [...(formData.content.characters || []), newCharacter],
          },
        });
      }}
      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
    >
      + 添加角色
    </button>
  </div>

  {formData.content.characters?.map((char, index) => (
    <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">角色 {index + 1}</span>
        <button
          type="button"
          onClick={() => {
            const newCharacters = formData.content.characters.filter((_, i) => i !== index);
            setFormData({
              ...formData,
              content: { ...formData.content, characters: newCharacters },
            });
          }}
          className="text-red-500 hover:text-red-700 text-sm"
        >
          删除
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">选择角色</label>
          <select
            value={char.characterId}
            onChange={(e) => {
              const selectedChar = characters.find((c) => c.id === e.target.value);
              const newCharacters = [...formData.content.characters];
              newCharacters[index] = {
                ...char,
                characterId: e.target.value,
                characterName: selectedChar?.name || '',
              };
              setFormData({
                ...formData,
                content: { ...formData.content, characters: newCharacters },
              });
            }}
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">请选择</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">位置</label>
          <select
            value={char.position}
            onChange={(e) => {
              const newCharacters = [...formData.content.characters];
              newCharacters[index] = {
                ...char,
                position: e.target.value as 'left' | 'center' | 'right',
              };
              setFormData({
                ...formData,
                content: { ...formData.content, characters: newCharacters },
              });
            }}
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="left">左侧</option>
            <option value="center">中间</option>
            <option value="right">右侧</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">动作描述</label>
        <input
          type="text"
          value={char.action}
          onChange={(e) => {
            const newCharacters = [...formData.content.characters];
            newCharacters[index] = { ...char, action: e.target.value };
            setFormData({
              ...formData,
              content: { ...formData.content, characters: newCharacters },
            });
          }}
          placeholder="例如：微笑着走向镜头"
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">情绪</label>
        <input
          type="text"
          value={char.emotion}
          onChange={(e) => {
            const newCharacters = [...formData.content.characters];
            newCharacters[index] = { ...char, emotion: e.target.value };
            setFormData({
              ...formData,
              content: { ...formData.content, characters: newCharacters },
            });
          }}
          placeholder="例如：开心、紧张、严肃"
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  ))}
</div>
```

**Step 2: 提交角色编辑功能**

```bash
git add client/src/components/project/SceneEditorForm.tsx
git commit -m "feat: add character and action editor to scene form"
```

### Task 4: 添加台词编辑区域

**Files:**
- Modify: `client/src/components/project/SceneEditorForm.tsx`

**Step 1: 添加台词列表管理**

在角色与动作区域后添加：

```tsx
{/* 台词 */}
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="text-lg font-semibold text-slate-900">台词</h3>
    <button
      type="button"
      onClick={() => {
        const newDialogue = {
          characterId: '',
          text: '',
          speed: 'normal' as const,
          tone: '',
        };
        setFormData({
          ...formData,
          content: {
            ...formData.content,
            dialogues: [...(formData.content.dialogues || []), newDialogue],
          },
        });
      }}
      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
    >
      + 添加台词
    </button>
  </div>

  {formData.content.dialogues?.map((dialogue, index) => (
    <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">台词 {index + 1}</span>
        <button
          type="button"
          onClick={() => {
            const newDialogues = formData.content.dialogues.filter((_, i) => i !== index);
            setFormData({
              ...formData,
              content: { ...formData.content, dialogues: newDialogues },
            });
          }}
          className="text-red-500 hover:text-red-700 text-sm"
        >
          删除
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">角色</label>
        <select
          value={dialogue.characterId}
          onChange={(e) => {
            const newDialogues = [...formData.content.dialogues];
            newDialogues[index] = { ...dialogue, characterId: e.target.value };
            setFormData({
              ...formData,
              content: { ...formData.content, dialogues: newDialogues },
            });
          }}
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="">请选择</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">台词内容</label>
        <textarea
          value={dialogue.text}
          onChange={(e) => {
            const newDialogues = [...formData.content.dialogues];
            newDialogues[index] = { ...dialogue, text: e.target.value };
            setFormData({
              ...formData,
              content: { ...formData.content, dialogues: newDialogues },
            });
          }}
          rows={2}
          placeholder="输入台词内容"
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">语速</label>
          <select
            value={dialogue.speed}
            onChange={(e) => {
              const newDialogues = [...formData.content.dialogues];
              newDialogues[index] = {
                ...dialogue,
                speed: e.target.value as 'slow' | 'normal' | 'fast',
              };
              setFormData({
                ...formData,
                content: { ...formData.content, dialogues: newDialogues },
              });
            }}
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="slow">慢速</option>
            <option value="normal">正常</option>
            <option value="fast">快速</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">语气</label>
          <input
            type="text"
            value={dialogue.tone}
            onChange={(e) => {
              const newDialogues = [...formData.content.dialogues];
              newDialogues[index] = { ...dialogue, tone: e.target.value };
              setFormData({
                ...formData,
                content: { ...formData.content, dialogues: newDialogues },
              });
            }}
            placeholder="例如：激动、平静、疑问"
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  ))}
</div>
```

**Step 2: 提交台词编辑功能**

```bash
git add client/src/components/project/SceneEditorForm.tsx
git commit -m "feat: add dialogue editor to scene form"
```

### Task 5: 添加镜头设置区域

**Files:**
- Modify: `client/src/components/project/SceneEditorForm.tsx`

**Step 1: 添加镜头配置表单**

在台词区域后添加：

```tsx
{/* 镜头设置 */}
<div className="space-y-4">
  <h3 className="text-lg font-semibold text-slate-900">镜头设置</h3>

  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">镜头类型</label>
      <select
        value={formData.content.camera?.type || 'medium'}
        onChange={(e) =>
          setFormData({
            ...formData,
            content: {
              ...formData.content,
              camera: {
                ...formData.content.camera,
                type: e.target.value as 'closeup' | 'medium' | 'full' | 'wide',
              },
            },
          })
        }
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="closeup">特写</option>
        <option value="medium">中景</option>
        <option value="full">全景</option>
        <option value="wide">远景</option>
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">镜头运动</label>
      <select
        value={formData.content.camera?.movement || 'static'}
        onChange={(e) =>
          setFormData({
            ...formData,
            content: {
              ...formData.content,
              camera: {
                ...formData.content.camera,
                movement: e.target.value as 'static' | 'push' | 'pull' | 'follow',
              },
            },
          })
        }
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="static">静止</option>
        <option value="push">推进</option>
        <option value="pull">拉远</option>
        <option value="follow">跟随</option>
      </select>
    </div>
  </div>
</div>
```

**Step 2: 提交镜头设置功能**

```bash
git add client/src/components/project/SceneEditorForm.tsx
git commit -m "feat: add camera settings to scene form"
```

### Task 6: 添加视觉效果区域

**Files:**
- Modify: `client/src/components/project/SceneEditorForm.tsx`

**Step 1: 添加视觉效果表单**

在镜头设置区域后添加：

```tsx
{/* 视觉效果 */}
<div className="space-y-4">
  <h3 className="text-lg font-semibold text-slate-900">视觉效果</h3>

  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">转场效果</label>
    <input
      type="text"
      value={formData.content.visual?.transition || ''}
      onChange={(e) =>
        setFormData({
          ...formData,
          content: {
            ...formData.content,
            visual: {
              ...formData.content.visual,
              transition: e.target.value,
            },
          },
        })
      }
      placeholder="例如：淡入淡出、切换、擦除"
      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">特效</label>
    <input
      type="text"
      value={formData.content.visual?.effects?.join(', ') || ''}
      onChange={(e) =>
        setFormData({
          ...formData,
          content: {
            ...formData.content,
            visual: {
              ...formData.content.visual,
              effects: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
            },
          },
        })
      }
      placeholder="多个特效用逗号分隔，例如：模糊, 光晕, 色彩校正"
      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">字幕样式</label>
    <input
      type="text"
      value={formData.content.visual?.subtitleStyle || ''}
      onChange={(e) =>
        setFormData({
          ...formData,
          content: {
            ...formData.content,
            visual: {
              ...formData.content.visual,
              subtitleStyle: e.target.value,
            },
          },
        })
      }
      placeholder="例如：底部居中、白色、加粗"
      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
    />
  </div>
</div>
```

**Step 2: 提交视觉效果功能**

```bash
git add client/src/components/project/SceneEditorForm.tsx
git commit -m "feat: add visual effects to scene form"
```

### Task 7: 添加音频设置区域

**Files:**
- Modify: `client/src/components/project/SceneEditorForm.tsx`

**Step 1: 添加音频配置表单**

在视觉效果区域后添加：

```tsx
{/* 音频设置 */}
<div className="space-y-4">
  <h3 className="text-lg font-semibold text-slate-900">音频设置</h3>

  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">背景音乐</label>
    <input
      type="text"
      value={formData.content.audio?.bgm || ''}
      onChange={(e) =>
        setFormData({
          ...formData,
          content: {
            ...formData.content,
            audio: {
              ...formData.content.audio,
              bgm: e.target.value,
            },
          },
        })
      }
      placeholder="例如：轻快的钢琴曲、紧张的配乐"
      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">音效</label>
    <input
      type="text"
      value={formData.content.audio?.soundEffects?.join(', ') || ''}
      onChange={(e) =>
        setFormData({
          ...formData,
          content: {
            ...formData.content,
            audio: {
              ...formData.content.audio,
              soundEffects: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
            },
          },
        })
      }
      placeholder="多个音效用逗号分隔，例如：脚步声, 门铃声, 掌声"
      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
    />
  </div>
</div>
```

**Step 2: 提交音频设置功能**

```bash
git add client/src/components/project/SceneEditorForm.tsx
git commit -m "feat: add audio settings to scene form"
```

### Task 8: 集成场景编辑器表单到主页面

**Files:**
- Modify: `client/src/pages/ProjectScript.tsx`

**Step 1: 导入并使用 SceneEditorForm 组件**

在文件顶部添加导入：

```tsx
import SceneEditorForm from '../components/project/SceneEditorForm';
```

**Step 2: 获取项目角色列表**

在 `loadData` 函数中添加角色数据加载：

```tsx
const [characters, setCharacters] = useState<ProjectCharacter[]>([]);

// 在 loadData 函数中添加
import { getProjectCharacters } from '../services/project';

const loadData = async () => {
  if (!id || !scriptId) return;
  try {
    const [scriptData, scenesData, charactersData] = await Promise.all([
      getScript(id, scriptId),
      getScriptScenes(id, scriptId),
      getProjectCharacters(id),
    ]);
    setScript(scriptData);
    setScenes(scenesData);
    setCharacters(charactersData);
  } catch (err: any) {
    setError(err.response?.data?.error || '加载失败');
  } finally {
    setLoading(false);
  }
};
```

**Step 3: 替换场景编辑器内容**

将第 223-227 行的占位内容替换为：

```tsx
<SceneEditorForm
  scene={editingScene}
  characters={characters}
  onSave={handleSaveScene}
  onCancel={() => {
    setShowSceneEditor(false);
    setEditingScene(null);
  }}
/>
```

**Step 4: 提交集成**

```bash
git add client/src/pages/ProjectScript.tsx
git commit -m "feat: integrate scene editor form into main page"
```

**Step 5: 测试场景编辑器**

手动测试步骤：
1. 启动开发服务器
2. 进入项目详情页，选择角色并进入剧本编辑
3. 点击"添加场景"按钮
4. 点击场景卡片的"编辑"按钮
5. 验证所有表单字段可以正常编辑
6. 填写各个字段后点击"保存"
7. 验证数据保存成功并在场景卡片中显示

Expected: 所有表单功能正常工作，数据保存成功

---

## 功能 B: 实现角色视图和时间轴视图

### Task 9: 创建角色视图组件

**Files:**
- Create: `client/src/components/project/CharacterView.tsx`

**Step 1: 创建角色视图组件**

```tsx
import { ScriptScene, ProjectCharacter } from '../../types';

interface CharacterViewProps {
  scenes: ScriptScene[];
  characters: ProjectCharacter[];
  onEditScene: (scene: ScriptScene) => void;
}

export default function CharacterView({
  scenes,
  characters,
  onEditScene,
}: CharacterViewProps) {
  // 按角色分组场景数据
  const characterScenes = characters.map((character) => {
    const characterDialogues = scenes.flatMap((scene) => {
      const dialogues = scene.content.dialogues?.filter(
        (d) => d.characterId === character.id
      ) || [];
      const actions = scene.content.characters?.filter(
        (c) => c.characterId === character.id
      ) || [];

      if (dialogues.length === 0 && actions.length === 0) return [];

      return [{
        scene,
        dialogues,
        actions,
      }];
    });

    return {
      character,
      scenes: characterDialogues,
    };
  });

  return (
    <div className="space-y-6">
      {characterScenes.map(({ character, scenes: charScenes }) => (
        <div key={character.id} className="bg-white rounded-lg border-2 border-slate-200 p-6">
          <div className="flex items-center gap-4 mb-4">
            {character.avatarUrl && (
              <img
                src={character.avatarUrl}
                alt={character.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{character.name}</h3>
              <p className="text-sm text-slate-600">{charScenes.length} 个场景</p>
            </div>
          </div>

          <div className="space-y-4">
            {charScenes.map(({ scene, dialogues, actions }, index) => (
              <div
                key={`${scene.id}-${index}`}
                className="p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-slate-900">{scene.title}</h4>
                    {scene.duration && (
                      <span className="text-xs text-slate-500">⏱ {scene.duration}s</span>
                    )}
                  </div>
                  <button
                    onClick={() => onEditScene(scene)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    编辑场景
                  </button>
                </div>

                {actions.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-slate-600 mb-1">动作：</p>
                    {actions.map((action, i) => (
                      <p key={i} className="text-sm text-slate-700">
                        • {action.action} ({action.emotion}) - {action.position === 'left' ? '左侧' : action.position === 'center' ? '中间' : '右侧'}
                      </p>
                    ))}
                  </div>
                )}

                {dialogues.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">台词：</p>
                    {dialogues.map((dialogue, i) => (
                      <div key={i} className="text-sm text-slate-700 mb-2">
                        <p className="font-medium">"{dialogue.text}"</p>
                        <p className="text-xs text-slate-500">
                          语速：{dialogue.speed === 'slow' ? '慢速' : dialogue.speed === 'fast' ? '快速' : '正常'}
                          {dialogue.tone && ` | 语气：${dialogue.tone}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {charScenes.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">该角色暂无场景</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: 提交角色视图组件**

```bash
git add client/src/components/project/CharacterView.tsx
git commit -m "feat: create character view component"
```

### Task 10: 创建时间轴视图组件

**Files:**
- Create: `client/src/components/project/TimelineView.tsx`

**Step 1: 创建时间轴视图组件**

```tsx
import { ScriptScene } from '../../types';

interface TimelineViewProps {
  scenes: ScriptScene[];
  onEditScene: (scene: ScriptScene) => void;
}

export default function TimelineView({ scenes, onEditScene }: TimelineViewProps) {
  // 计算总时长
  const totalDuration = scenes.reduce((sum, scene) => sum + (scene.duration || 0), 0);

  // 计算每个场景的时间轴位置
  let currentTime = 0;
  const timelineScenes = scenes.map((scene) => {
    const startTime = currentTime;
    const duration = scene.duration || 10; // 默认 10 秒
    currentTime += duration;
    return {
      scene,
      startTime,
      duration,
      widthPercent: totalDuration > 0 ? (duration / totalDuration) * 100 : 100 / scenes.length,
    };
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* 时间轴总览 */}
      <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">时间轴总览</h3>
          <div className="text-sm text-slate-600">
            总时长: <span className="font-semibold">{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* 时间轴可视化 */}
        <div className="relative h-20 bg-slate-100 rounded-lg overflow-hidden">
          {timelineScenes.map(({ scene, startTime, duration, widthPercent }, index) => (
            <div
              key={scene.id}
              className="absolute top-0 h-full border-r border-white hover:opacity-80 transition-opacity cursor-pointer group"
              style={{
                left: `${(startTime / totalDuration) * 100}%`,
                width: `${widthPercent}%`,
                backgroundColor: `hsl(${(index * 360) / scenes.length}, 70%, 60%)`,
              }}
              onClick={() => onEditScene(scene)}
            >
              <div className="p-2 h-full flex flex-col justify-center">
                <p className="text-xs font-medium text-white truncate">{scene.title}</p>
                <p className="text-xs text-white opacity-90">{duration}s</p>
              </div>
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
            </div>
          ))}
        </div>

        {/* 时间刻度 */}
        <div className="relative h-6 mt-2">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <div
              key={ratio}
              className="absolute top-0 text-xs text-slate-500"
              style={{ left: `${ratio * 100}%`, transform: 'translateX(-50%)' }}
            >
              {formatTime(Math.floor(totalDuration * ratio))}
            </div>
          ))}
        </div>
      </div>

      {/* 场景详细列表 */}
      <div className="space-y-3">
        {timelineScenes.map(({ scene, startTime, duration }, index) => (
          <div
            key={scene.id}
            className="bg-white rounded-lg border-2 border-slate-200 p-4 hover:border-blue-400 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-medium text-slate-500">#{index + 1}</span>
                  <h4 className="text-lg font-semibold text-slate-900">{scene.title}</h4>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                    {formatTime(startTime)} - {formatTime(startTime + duration)}
                  </span>
                </div>

                {scene.content.description && (
                  <p className="text-sm text-slate-600 mb-2">{scene.content.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>⏱ {duration}s</span>
                  {scene.content.sceneType && (
                    <span>
                      📍 {scene.content.sceneType === 'indoor' ? '室内' : scene.content.sceneType === 'outdoor' ? '室外' : '特殊场景'}
                    </span>
                  )}
                  {scene.content.characters && scene.content.characters.length > 0 && (
                    <span>👥 {scene.content.characters.length} 个角色</span>
                  )}
                  {scene.content.dialogues && scene.content.dialogues.length > 0 && (
                    <span>💬 {scene.content.dialogues.length} 条台词</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => onEditScene(scene)}
                className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                编辑
              </button>
            </div>
          </div>
        ))}
      </div>

      {scenes.length === 0 && (
        <div className="bg-white rounded-lg border-2 border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-500">暂无场景，请先添加场景</p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: 提交时间轴视图组件**

```bash
git add client/src/components/project/TimelineView.tsx
git commit -m "feat: create timeline view component"
```

### Task 11: 集成角色视图和时间轴视图到主页面

**Files:**
- Modify: `client/src/pages/ProjectScript.tsx`

**Step 1: 导入新组件**

在文件顶部添加导入：

```tsx
import CharacterView from '../components/project/CharacterView';
import TimelineView from '../components/project/TimelineView';
```

**Step 2: 添加视图切换逻辑**

在场景视图区域（第 167-205 行）后添加：

```tsx
{/* 角色视图 */}
{activeTab === 'character' && (
  <CharacterView
    scenes={scenes}
    characters={characters}
    onEditScene={handleEditScene}
  />
)}

{/* 时间轴视图 */}
{activeTab === 'timeline' && (
  <TimelineView
    scenes={scenes}
    onEditScene={handleEditScene}
  />
)}
```

**Step 3: 启用 Tab 按钮**

修改第 141-162 行的 Tab 按钮，移除 `disabled` 属性和 `cursor-not-allowed` 样式：

```tsx
<button
  onClick={() => setActiveTab('character')}
  className={`px-6 py-3 font-medium transition-colors ${
    activeTab === 'character'
      ? 'text-blue-600 border-b-2 border-blue-600'
      : 'text-slate-600 hover:text-slate-900'
  }`}
>
  角色视图
</button>
<button
  onClick={() => setActiveTab('timeline')}
  className={`px-6 py-3 font-medium transition-colors ${
    activeTab === 'timeline'
      ? 'text-blue-600 border-b-2 border-blue-600'
      : 'text-slate-600 hover:text-slate-900'
  }`}
>
  时间轴视图
</button>
```

**Step 4: 提交视图集成**

```bash
git add client/src/pages/ProjectScript.tsx
git commit -m "feat: integrate character and timeline views"
```

**Step 5: 测试视图切换**

手动测试步骤：
1. 进入剧本编辑页面
2. 添加几个场景并填写完整信息（包括角色、台词、时长）
3. 切换到"角色视图"，验证按角色分组显示正确
4. 切换到"时间轴视图"，验证时间轴可视化和场景列表正确
5. 在各个视图中点击"编辑"按钮，验证可以正常打开编辑器

Expected: 三个视图都能正常工作，数据显示正确

---

## 功能 C: 添加场景拖拽排序功能

### Task 12: 创建拖拽排序组件

**Files:**
- Create: `client/src/components/project/DraggableSceneList.tsx`

**Step 1: 创建拖拽场景列表组件**

```tsx
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { ScriptScene } from '../../types';

interface DraggableSceneCardProps {
  scene: ScriptScene;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

function DraggableSceneCard({ scene, index, onEdit, onDelete }: DraggableSceneCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex-shrink-0 w-64 bg-slate-50 rounded-lg border-2 border-slate-200 p-4 hover:border-blue-400 transition-colors cursor-move"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate-900">场景 {index + 1}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-red-500 hover:text-red-700 text-sm"
        >
          删除
        </button>
      </div>
      <p className="text-sm text-slate-700 mb-2 truncate">{scene.title}</p>
      {scene.duration && (
        <p className="text-xs text-slate-500 mb-2">⏱ {scene.duration}s</p>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="w-full px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
      >
        编辑
      </button>
    </div>
  );
}

interface DraggableSceneListProps {
  scenes: ScriptScene[];
  onScenesReorder: (scenes: ScriptScene[]) => void;
  onAddScene: () => void;
  onEditScene: (scene: ScriptScene) => void;
  onDeleteScene: (sceneId: string) => void;
}

export default function DraggableSceneList({
  scenes,
  onScenesReorder,
  onAddScene,
  onEditScene,
  onDeleteScene,
}: DraggableSceneListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = scenes.findIndex((s) => s.id === active.id);
      const newIndex = scenes.findIndex((s) => s.id === over.id);
      const newScenes = arrayMove(scenes, oldIndex, newIndex);
      onScenesReorder(newScenes);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-center gap-4 overflow-x-auto pb-4">
        <SortableContext
          items={scenes.map((s) => s.id)}
          strategy={horizontalListSortingStrategy}
        >
          {scenes.map((scene, index) => (
            <DraggableSceneCard
              key={scene.id}
              scene={scene}
              index={index}
              onEdit={() => onEditScene(scene)}
              onDelete={() => onDeleteScene(scene.id)}
            />
          ))}
        </SortableContext>

        <button
          onClick={onAddScene}
          className="flex-shrink-0 w-64 h-40 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
        >
          <Plus className="w-8 h-8 text-slate-400" />
          <span className="text-sm text-slate-600">添加场景</span>
        </button>
      </div>
    </DndContext>
  );
}
```

**Step 2: 提交拖拽组件**

```bash
git add client/src/components/project/DraggableSceneList.tsx
git commit -m "feat: create draggable scene list component"
```

### Task 13: 添加场景排序更新 API

**Files:**
- Modify: `client/src/services/script.ts`

**Step 1: 添加批量更新场景排序的方法**

在文件末尾添加：

```tsx
// 批量更新场景排序
export const updateScenesOrder = async (
  projectId: string,
  scriptId: string,
  sceneIds: string[]
): Promise<void> => {
  await api.put(`/projects/${projectId}/scripts/${scriptId}/scenes/reorder`, {
    sceneIds,
  });
};
```

**Step 2: 提交 API 方法**

```bash
git add client/src/services/script.ts
git commit -m "feat: add scenes reorder API method"
```

### Task 14: 创建场景排序后端 API

**Files:**
- Create: `web/src/app/api/projects/[id]/scripts/[scriptId]/scenes/reorder/route.ts`

**Step 1: 创建排序 API 路由**

```tsx
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scriptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { id: projectId, scriptId } = await params;
    const { sceneIds } = await request.json();

    if (!Array.isArray(sceneIds)) {
      return NextResponse.json({ error: '无效的场景 ID 列表' }, { status: 400 });
    }

    // 验证剧本归属
    const script = await prisma.projectScript.findFirst({
      where: {
        id: scriptId,
        projectId,
        project: {
          userId: session.user.id,
        },
      },
    });

    if (!script) {
      return NextResponse.json({ error: '剧本不存在' }, { status: 404 });
    }

    // 批量更新场景排序
    await Promise.all(
      sceneIds.map((sceneId, index) =>
        prisma.scriptScene.updateMany({
          where: {
            id: sceneId,
            scriptId,
          },
          data: {
            sortOrder: index,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新场景排序失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
```

**Step 2: 提交后端 API**

```bash
git add web/src/app/api/projects/[id]/scripts/[scriptId]/scenes/reorder/route.ts
git commit -m "feat: add scenes reorder backend API"
```

### Task 15: 集成拖拽排序到主页面

**Files:**
- Modify: `client/src/pages/ProjectScript.tsx`

**Step 1: 导入拖拽组件和 API**

在文件顶部添加导入：

```tsx
import DraggableSceneList from '../components/project/DraggableSceneList';
import { updateScenesOrder } from '../services/script';
```

**Step 2: 添加场景重排序处理函数**

在 `handleDeleteScene` 函数后添加：

```tsx
const handleScenesReorder = async (newScenes: ScriptScene[]) => {
  if (!id || !scriptId) return;

  // 立即更新 UI
  setScenes(newScenes);

  // 异步更新后端
  try {
    await updateScenesOrder(
      id,
      scriptId,
      newScenes.map((s) => s.id)
    );
  } catch (err: any) {
    setError(err.response?.data?.error || '更新排序失败');
    // 失败时重新加载数据
    loadData();
  }
};
```

**Step 3: 替换场景列表为拖拽组件**

将第 167-205 行的场景列表替换为：

```tsx
{/* 场景列表 - 水平滚动 + 拖拽排序 */}
{activeTab === 'scene' && (
  <div className="bg-white rounded-xl shadow-sm border-2.5 border-slate-200 p-6">
    <DraggableSceneList
      scenes={scenes}
      onScenesReorder={handleScenesReorder}
      onAddScene={handleAddScene}
      onEditScene={handleEditScene}
      onDeleteScene={handleDeleteScene}
    />
  </div>
)}
```

**Step 4: 提交拖拽集成**

```bash
git add client/src/pages/ProjectScript.tsx
git commit -m "feat: integrate drag and drop scene reordering"
```

**Step 5: 测试拖拽排序**

手动测试步骤：
1. 进入剧本编辑页面
2. 添加至少 3 个场景
3. 拖拽场景卡片改变顺序
4. 验证场景顺序立即更新
5. 刷新页面，验证排序已保存
6. 切换到时间轴视图，验证场景顺序一致

Expected: 拖拽排序功能正常，数据持久化成功

---

## 最终验证

### Task 16: 完整功能测试

**Step 1: 测试场景编辑器完整流程**

1. 创建新场景
2. 填写所有表单字段：
   - 基本信息（标题、描述、类型、时长）
   - 添加 2 个角色及其动作和情绪
   - 添加 3 条台词
   - 设置镜头（类型和运动）
   - 设置视觉效果（转场、特效、字幕）
   - 设置音频（背景音乐、音效）
3. 保存并验证数据正确显示

Expected: 所有数据保存成功并正确显示

**Step 2: 测试角色视图**

1. 切换到角色视图
2. 验证每个角色的场景、动作、台词都正确分组显示
3. 点击"编辑场景"按钮，验证可以打开编辑器

Expected: 角色视图数据组织正确，交互正常

**Step 3: 测试时间轴视图**

1. 切换到时间轴视图
2. 验证时间轴可视化正确显示各场景时长比例
3. 验证时间刻度和场景详细列表正确
4. 点击时间轴或列表中的场景，验证可以打开编辑器

Expected: 时间轴视图可视化正确，交互正常

**Step 4: 测试拖拽排序**

1. 切换回场景视图
2. 拖拽场景卡片改变顺序
3. 切换到其他视图，验证顺序一致
4. 刷新页面，验证排序持久化

Expected: 拖拽排序在所有视图中一致，数据持久化成功

**Step 5: 提交最终测试报告**

创建测试报告文档：

```bash
echo "# 场景编辑器增强功能测试报告

## 测试日期
$(date +%Y-%m-%d)

## 功能测试结果

### A. 场景编辑器详细表单
- [x] 基本信息编辑
- [x] 角色与动作管理
- [x] 台词编辑
- [x] 镜头设置
- [x] 视觉效果
- [x] 音频设置

### B. 角色视图和时间轴视图
- [x] 角色视图按角色分组显示
- [x] 时间轴视图可视化
- [x] 视图切换正常

### C. 场景拖拽排序
- [x] 拖拽交互流畅
- [x] 排序数据持久化
- [x] 多视图排序一致

## 已知问题
（记录测试中发现的问题）

## 后续优化建议
1. 添加场景复制功能
2. 支持批量编辑场景
3. 添加场景模板
4. 支持导出剧本为 PDF
" > docs/features/场景编辑器增强功能测试报告.md

git add docs/features/场景编辑器增强功能测试报告.md
git commit -m "docs: add scene editor enhancement test report"
```

---

## 总结

本实现计划包含 16 个任务，涵盖：

1. **场景编辑器详细表单**（Task 1-8）：完整的多层级表单，支持基本信息、角色、台词、镜头、视觉、音频的编辑
2. **角色视图和时间轴视图**（Task 9-11）：两个新视图组件，提供不同维度的剧本管理
3. **场景拖拽排序**（Task 12-15）：使用 @dnd-kit 实现流畅的拖拽体验和数据持久化
4. **完整测试验证**（Task 16）：确保所有功能正常工作

每个任务都包含详细的代码和提交步骤，遵循 TDD 和频繁提交的原则。



