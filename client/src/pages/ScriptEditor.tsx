import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles, Video, Info } from 'lucide-react';
import { getProject, getProjectCharacters } from '../services/project';
import {
  getScript,
  createScript,
  updateScript,
  generateSynopsis,
  generateScenes,
  createScene,
  generateScriptVideos,
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
  const [useStoryboard, setUseStoryboard] = useState(false); // 是否使用故事板模式

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
      const charactersData = await getProjectCharacters(id);
      setCharacters(charactersData);  // 如果是编辑模式，加载剧本数据
      if (scriptId) {
        const scriptData = await getScript(id, scriptId);
        setFormData({
          name: scriptData.name || scriptData.title || '',
          tone: scriptData.tone || '',
          synopsis: scriptData.synopsis || scriptData.description || '',
          characterIds: scriptData.characterIds || (scriptData.characterId ? [scriptData.characterId] : []),
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
        existingSynopsis: formData.synopsis.trim() || undefined, // 传递已输入的内容
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
            await createScene(id!, savedScriptId, { ...scene, duration: scene.duration ?? undefined } as any);
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

  // 生成视频
  const handleGenerateVideos = async () => {
    // 检查是否已保存
    if (!scriptId) {
      setError('请先保存剧本后再生成视频');
      return;
    }

    // 检查是否有场景
    if (formData.scenes.length === 0) {
      setError('请先生成场景后再生成视频');
      return;
    }

    try {
      // 调用生成视频 API
      const result = await generateScriptVideos(id!, scriptId, {
        promptType: 'smart_combine', // 默认使用智能组合方式
        mode: useStoryboard ? 'storyboard' : 'individual', // 根据用户选择的模式
      } as any);

      // 显示成功消息
      const modeText = useStoryboard ? '故事板模式' : '单独生成模式';
      alert(`视频生成任务已提交！\n模式: ${modeText}\n任务 ID: ${result.taskId}\n${result.message}\n\n视频将在后台生成，请返回剧本列表查看进度。`);
      // 返回剧本列表页
      navigate(`/projects/${id}/scripts`);
    } catch (err: any) {
      setError(err.response?.data?.error || '生成视频失败');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
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

            {/* 故事板模式选项 */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useStoryboard}
                  onChange={(e) => setUseStoryboard(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-slate-700">故事板模式</span>
              </label>
              <div className="group relative">
                <Info className="w-4 h-4 text-slate-400 cursor-help" />
                <div className="absolute bottom-full right-0 mb-2 w-72 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="space-y-2">
                    <div>
                      <strong className="text-purple-300">✓ 故事板模式：</strong>
                      <p className="mt-1">一次性生成包含所有场景的完整视频，场景之间转场更流畅，视频整体更连贯。适合场景数量少（≤5个）且总时长≤25秒的情况。</p>
                    </div>
                    <div>
                      <strong className="text-blue-300">✓ 单独生成模式：</strong>
                      <p className="mt-1">为每个场景单独生成视频。有角色形象时自动使用图生视频方式，无角色形象时使用纯文生视频。可以独立调整每个场景，失败不影响其他场景。</p>
                    </div>
                  </div>
                  <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900"></div>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateVideos}
              disabled={!scriptId || formData.scenes.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={!scriptId ? '请先保存剧本' : formData.scenes.length === 0 ? '请先生成场景' : '为所有场景生成视频'}
            >
              <Video className="w-4 h-4" />
              生成视频
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
                  className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-slate-300'
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
                        {scene.content.dialogues?.[0]?.text || scene.content.actions?.main || scene.content.description || '暂无描述'}
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
    </>
  );
}
