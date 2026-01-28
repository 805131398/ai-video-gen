import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { getProject, getProjectCharacters } from '../services/project';
import {
  getScript,
  createScript,
  updateScript,
  generateSynopsis,
  generateScenes,
  createScene,
} from '../services/script';
import { Project, ProjectCharacter, ScriptScene, SceneContent } from '../types';
import { ToneCombobox } from '../components/ToneCombobox';
import { CharacterMultiSelect } from '../components/CharacterMultiSelect';

interface FormData {
  name: string;
  tone: string;
  synopsis: string;
  characterIds: string[];
  scenes: Array<{
    id?: string;
    title: string;
    sortOrder: number;
    duration?: number | null;
    content: SceneContent;
  }>;
}

export default function ScriptEditor() {
  const { id, scriptId } = useParams<{ id: string; scriptId?: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [characters, setCharacters] = useState<ProjectCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingSynopsis, setGeneratingSynopsis] = useState(false);
  const [generatingScenes, setGeneratingScenes] = useState(false);
  const [error, setError] = useState('');
  const [sceneCount, setSceneCount] = useState(5);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    tone: '',
    synopsis: '',
    characterIds: [],
    scenes: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 加载数据
  useEffect(() => {
    loadData();
  }, [id, scriptId]);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [projectData, charactersData] = await Promise.all([
        getProject(id),
        getProjectCharacters(id),
      ]);
      setProject(projectData);
      setCharacters(charactersData);

      // 如果是编辑模式，加载剧本数据
      if (scriptId) {
        const scriptData = await getScript(id, scriptId);
        setFormData({
          name: scriptData.name || scriptData.title || '',
          tone: scriptData.tone || '',
          synopsis: scriptData.synopsis || scriptData.description || '',
          characterIds: scriptData.scriptCharacters?.map((sc: any) => sc.characterId) ||
                       (scriptData.characterId ? [scriptData.characterId] : []),
          scenes: scriptData.scenes || [],
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 表单验证
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入剧本名称';
    } else if (formData.name.length > 50) {
      newErrors.name = '剧本名称不能超过 50 个字符';
    }

    if (formData.characterIds.length === 0) {
      newErrors.characters = '请至少选择一个角色';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // AI 生成脚本大概
  const handleGenerateSynopsis = async () => {
    if (formData.characterIds.length === 0) {
      setError('请先选择角色');
      return;
    }

    try {
      setGeneratingSynopsis(true);
      setError('');
      const result = await generateSynopsis(id!, {
        characterIds: formData.characterIds,
        tone: formData.tone || undefined,
      });
      setFormData((prev) => ({ ...prev, synopsis: result.synopsis }));
    } catch (err: any) {
      setError(err.response?.data?.error || '生成失败');
    } finally {
      setGeneratingSynopsis(false);
    }
  };

  // AI 生成场景
  const handleGenerateScenes = async () => {
    if (!formData.synopsis.trim()) {
      setError('请先生成或输入脚本大概');
      return;
    }

    if (sceneCount < 1 || sceneCount > 20) {
      setError('场景数量必须在 1-20 之间');
      return;
    }

    try {
      setGeneratingScenes(true);
      setError('');
      const result = await generateScenes(id!, {
        characterIds: formData.characterIds,
        tone: formData.tone || undefined,
        synopsis: formData.synopsis,
        sceneCount,
      });

      const newScenes = result.scenes.map((scene, index) => ({
        ...scene,
        sortOrder: formData.scenes.length + index,
      }));

      setFormData((prev) => ({
        ...prev,
        scenes: [...prev.scenes, ...newScenes],
      }));
    } catch (err: any) {
      setError(err.response?.data?.error || '生成失败');
    } finally {
      setGeneratingScenes(false);
    }
  };

  // 保存剧本
  const handleSave = async () => {
    if (!validate()) {
      setError('请检查表单');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const scriptData = {
        name: formData.name,
        tone: formData.tone || undefined,
        synopsis: formData.synopsis || undefined,
        characterIds: formData.characterIds,
      };

      let savedScriptId = scriptId;
      if (scriptId) {
        await updateScript(id!, scriptId, scriptData);
      } else {
        const newScript = await createScript(id!, scriptData);
        savedScriptId = newScript.id;
      }

      // 保存场景
      if (formData.scenes.length > 0 && savedScriptId) {
        for (const scene of formData.scenes) {
          if (!scene.id) {
            await createScene(id!, savedScriptId, scene);
          }
        }
      }

      navigate(`/projects/${id}/scripts`);
    } catch (err: any) {
      setError(err.response?.data?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除场景
  const handleDeleteScene = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      scenes: prev.scenes.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="px-6 lg:px-8 xl:px-12 py-6 max-w-[1400px] mx-auto">
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/projects/${id}/scripts`)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>
            <h1 className="text-2xl font-bold text-slate-900">
              {scriptId ? '编辑剧本' : '创建剧本'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/projects/${id}/scripts`)}
              disabled={saving}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              保存
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* 基本信息卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">基本信息</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                剧本名称 <span className="text-red-600">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value }));
                    setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="请输入剧本名称（最多50字符）"
                  maxLength={50}
                  className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                <span className="text-sm text-slate-500 whitespace-nowrap">
                  {formData.name.length}/50
                </span>
              </div>
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                脚本基调
              </label>
              <ToneCombobox
                value={formData.tone}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, tone: value }))
                }
              />
            </div>
          </div>
        </div>

        {/* 角色选择卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            选择角色 <span className="text-red-600">*</span>
          </h2>
          <CharacterMultiSelect
            characters={characters}
            selectedIds={formData.characterIds}
            onChange={(ids) => {
              setFormData((prev) => ({ ...prev, characterIds: ids }));
              setErrors((prev) => ({ ...prev, characters: '' }));
            }}
          />
          {errors.characters && (
            <p className="text-sm text-red-600 mt-2">{errors.characters}</p>
          )}
        </div>

        {/* 脚本大概卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">脚本大概</h2>
            <button
              onClick={handleGenerateSynopsis}
              disabled={generatingSynopsis || formData.characterIds.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingSynopsis ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              AI 生成脚本大概
            </button>
          </div>
          <textarea
            value={formData.synopsis}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, synopsis: e.target.value }))
            }
            placeholder="描述剧本的核心故事线和主要情节（100-300字）"
            rows={6}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* 场景管理卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">场景管理</h2>

          {/* AI 生成场景控制区 */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                场景数量
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={sceneCount}
                onChange={(e) => setSceneCount(parseInt(e.target.value) || 1)}
                className="w-32 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleGenerateScenes}
              disabled={generatingScenes || !formData.synopsis.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {generatingScenes ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              AI 生成场景
            </button>
          </div>

          {/* 场景列表 */}
          {formData.scenes.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
              <p className="text-lg text-slate-500">暂无场景</p>
              <p className="text-sm text-slate-400 mt-2">使用 AI 生成场景或手动添加</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.scenes.map((scene, index) => (
                <div
                  key={index}
                  className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 mb-2">{scene.title}</h4>
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {scene.content.dialogue || scene.content.action || '暂无描述'}
                      </p>
                      {scene.duration && (
                        <p className="text-xs text-slate-500 mt-2">时长: {scene.duration}秒</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteScene(index)}
                      className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
