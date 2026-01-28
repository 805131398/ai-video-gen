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
