import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X } from 'lucide-react';
import {
  getScript,
  getScene,
  updateScene,
} from '../services/script';
import { getProjectCharacters } from '../services/project';
import { ProjectScript, ScriptScene, ProjectCharacter } from '../types';
import BasicInfoCard from '../components/scene-edit/BasicInfoCard';
import CharacterDialogueCard from '../components/scene-edit/CharacterDialogueCard';
import CameraVisualCard from '../components/scene-edit/CameraVisualCard';
import AudioSettingsCard from '../components/scene-edit/AudioSettingsCard';

export default function SceneEditPage() {
  const { id, scriptId, sceneId } = useParams<{ id: string; scriptId: string; sceneId: string }>();
  const navigate = useNavigate();

  // 数据状态
  const [scene, setScene] = useState<ScriptScene | null>(null);
  const [script, setScript] = useState<ProjectScript | null>(null);
  const [characters, setCharacters] = useState<ProjectCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 表单状态
  const [formData, setFormData] = useState<Partial<ScriptScene>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // UI 状态
  const [expandedCards, setExpandedCards] = useState({
    basic: true,
    character: true,
    camera: true,
    audio: true,
  });

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      if (!id || !scriptId || !sceneId) return;
      try {
        const [sceneData, scriptData, charactersData] = await Promise.all([
          getScene(id, scriptId, sceneId),
          getScript(id, scriptId),
          getProjectCharacters(id),
        ]);
        setScene(sceneData);
        setScript(scriptData);
        setCharacters(charactersData);
        setFormData(sceneData);
      } catch (err: any) {
        setError(err.response?.data?.error || '加载失败');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, scriptId, sceneId]);

  // 监听表单变化
  useEffect(() => {
    if (scene && JSON.stringify(formData) !== JSON.stringify(scene)) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [formData, scene]);

  // 保存场景
  const handleSave = async () => {
    if (!id || !scriptId || !sceneId) return;
    setSaving(true);
    try {
      await updateScene(id, scriptId, sceneId, formData);
      setHasUnsavedChanges(false);
      navigate(`/projects/${id}/script/${scriptId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 取消编辑
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (confirm('有未保存的更改，确定要离开吗？')) {
        navigate(`/projects/${id}/script/${scriptId}`);
      }
    } else {
      navigate(`/projects/${id}/script/${scriptId}`);
    }
  };

  // 切换卡片展开状态
  const toggleCard = (card: keyof typeof expandedCards) => {
    setExpandedCards((prev) => ({ ...prev, [card]: !prev[card] }));
  };

  // 更新表单字段
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-600">加载中...</div>
      </div>
    );
  }

  if (!scene || !script) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-600">场景不存在</div>
      </div>
    );
  }

  return (
    <>
      {/* 固定头部 */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-lg border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            {/* 左侧：返回按钮 + 面包屑 */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="text-sm text-slate-500">
                <span className="hover:text-slate-700 cursor-pointer" onClick={() => navigate(`/projects/${id}`)}>
                  项目
                </span>
                <span className="mx-2">/</span>
                <span className="hover:text-slate-700 cursor-pointer" onClick={() => navigate(`/projects/${id}/script/${scriptId}`)}>
                  {script.title}
                </span>
                <span className="mx-2">/</span>
                <span className="text-slate-900 font-medium">场景编辑</span>
              </div>
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all duration-200"
              >
                <X className="w-4 h-4" />
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:scale-105 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Save className="w-4 h-4" />
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 错误提示 */}
      {error && (
        <div className="max-w-7xl mx-auto px-8 pt-6">
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
            {error}
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-8 py-6 space-y-6">
        {/* 基本信息卡片 */}
        <BasicInfoCard formData={formData} onChange={handleFieldChange} />

        {/* 角色与台词卡片 */}
        <CharacterDialogueCard
          formData={formData}
          characters={characters}
          onChange={handleFieldChange}
          expanded={expandedCards.character}
          onToggle={() => toggleCard('character')}
        />

        {/* 镜头与视觉卡片 */}
        <CameraVisualCard
          formData={formData}
          onChange={handleFieldChange}
          expanded={expandedCards.camera}
          onToggle={() => toggleCard('camera')}
        />

        {/* 音频设置卡片 */}
        <AudioSettingsCard
          formData={formData}
          onChange={handleFieldChange}
          expanded={expandedCards.audio}
          onToggle={() => toggleCard('audio')}
        />
      </main>
    </>
  );
}

