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
