import { useState, useEffect } from 'react';
import { ScriptScene, ProjectCharacter } from '../../types';

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
  const [formData, setFormData] = useState<ScriptScene>(() => ({
    ...scene,
    content: scene.content || {
      description: '',
      sceneType: 'indoor',
      characters: [],
      dialogues: [],
      camera: {
        type: 'medium',
        movement: 'static',
      },
      visual: {
        transition: '',
        effects: [],
        subtitleStyle: '',
      },
      audio: {
        bgm: '',
        soundEffects: [],
      },
    },
  }));

  useEffect(() => {
    setFormData({
      ...scene,
      content: scene.content || {
        description: '',
        sceneType: 'indoor',
        characters: [],
        dialogues: [],
        camera: {
          type: 'medium',
          movement: 'static',
        },
        visual: {
          transition: '',
          effects: [],
          subtitleStyle: '',
        },
        audio: {
          bgm: '',
          soundEffects: [],
        },
      },
    });
  }, [scene]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            value={formData.content?.description || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                content: { ...(formData.content || {}), description: e.target.value },
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
              value={formData.content?.sceneType || 'indoor'}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  content: {
                    ...(formData.content || {}),
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
                  ...(formData.content || {}),
                  characters: [...(formData.content?.characters || []), newCharacter],
                },
              });
            }}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            + 添加角色
          </button>
        </div>

        {formData.content?.characters?.map((char, index) => (
          <div key={`${char.characterId || 'new'}-${index}`} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">角色 {index + 1}</span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('确定要删除这个角色吗？')) {
                    const newCharacters = formData.content?.characters?.filter((_, i) => i !== index) || [];
                    setFormData({
                      ...formData,
                      content: {
                        ...(formData.content || {}),
                        characters: newCharacters,
                      },
                    });
                  }
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
                    const newCharacters = [...(formData.content?.characters || [])];
                    newCharacters[index] = {
                      ...char,
                      characterId: e.target.value,
                      characterName: selectedChar?.name || '',
                    };
                    setFormData({
                      ...formData,
                      content: {
                        ...(formData.content || {}),
                        characters: newCharacters,
                      },
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
                    const newCharacters = [...(formData.content?.characters || [])];
                    newCharacters[index] = {
                      ...char,
                      position: e.target.value as 'left' | 'center' | 'right',
                    };
                    setFormData({
                      ...formData,
                      content: {
                        ...(formData.content || {}),
                        characters: newCharacters,
                      },
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
                  const newCharacters = [...(formData.content?.characters || [])];
                  newCharacters[index] = { ...char, action: e.target.value };
                  setFormData({
                    ...formData,
                    content: {
                      ...(formData.content || {}),
                      characters: newCharacters,
                    },
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
                  const newCharacters = [...(formData.content?.characters || [])];
                  newCharacters[index] = { ...char, emotion: e.target.value };
                  setFormData({
                    ...formData,
                    content: {
                      ...(formData.content || {}),
                      characters: newCharacters,
                    },
                  });
                }}
                placeholder="例如：开心、紧张、严肃"
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        ))}
      </div>

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
                  ...(formData.content || {}),
                  dialogues: [...(formData.content?.dialogues || []), newDialogue],
                },
              });
            }}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            + 添加台词
          </button>
        </div>

        {formData.content?.dialogues?.map((dialogue, index) => (
          <div key={`${dialogue.characterId || 'new'}-${index}`} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">台词 {index + 1}</span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('确定要删除这条台词吗？')) {
                    const newDialogues = formData.content?.dialogues?.filter((_, i) => i !== index) || [];
                    setFormData({
                      ...formData,
                      content: {
                        ...(formData.content || {}),
                        dialogues: newDialogues,
                      },
                    });
                  }
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
                  const newDialogues = [...(formData.content?.dialogues || [])];
                  newDialogues[index] = { ...dialogue, characterId: e.target.value };
                  setFormData({
                    ...formData,
                    content: {
                      ...(formData.content || {}),
                      dialogues: newDialogues,
                    },
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
                  const newDialogues = [...(formData.content?.dialogues || [])];
                  newDialogues[index] = { ...dialogue, text: e.target.value };
                  setFormData({
                    ...formData,
                    content: {
                      ...(formData.content || {}),
                      dialogues: newDialogues,
                    },
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
                    const newDialogues = [...(formData.content?.dialogues || [])];
                    newDialogues[index] = {
                      ...dialogue,
                      speed: e.target.value as 'slow' | 'normal' | 'fast',
                    };
                    setFormData({
                      ...formData,
                      content: {
                        ...(formData.content || {}),
                        dialogues: newDialogues,
                      },
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
                    const newDialogues = [...(formData.content?.dialogues || [])];
                    newDialogues[index] = { ...dialogue, tone: e.target.value };
                    setFormData({
                      ...formData,
                      content: {
                        ...(formData.content || {}),
                        dialogues: newDialogues,
                      },
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
