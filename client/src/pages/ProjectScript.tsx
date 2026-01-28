import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import {
  getScript,
  getScriptScenes,
  createScene,
  updateScene,
  deleteScene,
  updateScenesOrder,
} from '../services/script';
import { getProjectCharacters } from '../services/project';
import { ProjectScript, ScriptScene, SceneContent, ProjectCharacter } from '../types';
import SceneEditorForm from '../components/project/SceneEditorForm';
import CharacterView from '../components/project/CharacterView';
import TimelineView from '../components/project/TimelineView';
import DraggableSceneList from '../components/project/DraggableSceneList';

export default function ProjectScriptPage() {
  const { id, scriptId } = useParams<{ id: string; scriptId: string }>();
  const navigate = useNavigate();
  const [script, setScript] = useState<ProjectScript | null>(null);
  const [scenes, setScenes] = useState<ScriptScene[]>([]);
  const [characters, setCharacters] = useState<ProjectCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'scene' | 'character' | 'timeline'>('scene');
  const [editingScene, setEditingScene] = useState<ScriptScene | null>(null);
  const [showSceneEditor, setShowSceneEditor] = useState(false);

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

  useEffect(() => {
    loadData();
  }, [id, scriptId]);

  const handleAddScene = async () => {
    if (!id || !scriptId) return;
    try {
      const newScene = await createScene(id, scriptId, {
        title: `场景 ${scenes.length + 1}`,
      });
      setScenes([...scenes, newScene]);
    } catch (err: any) {
      setError(err.response?.data?.error || '创建场景失败');
    }
  };

  const handleEditScene = (scene: ScriptScene) => {
    setEditingScene(scene);
    setShowSceneEditor(true);
  };

  const handleSaveScene = async (sceneData: Partial<ScriptScene>) => {
    if (!id || !scriptId || !editingScene) return;
    try {
      const updated = await updateScene(id, scriptId, editingScene.id, sceneData);
      setScenes(scenes.map((s) => (s.id === updated.id ? updated : s)));
      setShowSceneEditor(false);
      setEditingScene(null);
    } catch (err: any) {
      setError(err.response?.data?.error || '保存场景失败');
    }
  };

  const handleDeleteScene = async (sceneId: string) => {
    if (!id || !scriptId) return;
    if (!confirm('确定要删除这个场景吗？')) return;
    try {
      await deleteScene(id, scriptId, sceneId);
      setScenes(scenes.filter((s) => s.id !== sceneId));
    } catch (err: any) {
      setError(err.response?.data?.error || '删除场景失败');
    }
  };

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

  if (loading) return <div className="p-8">加载中...</div>;
  if (!script) return <div className="p-8">剧本不存在</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="px-6 lg:px-8 xl:px-12 py-6 max-w-[1920px] mx-auto">
        {/* 返回按钮 */}
        <button
          onClick={() => navigate(`/projects/${id}/scripts`)}
          className="flex items-center gap-2 mb-6 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          返回剧本列表
        </button>

        {/* 头部信息栏 */}
        <div className="bg-white rounded-xl shadow-sm border-2.5 border-slate-200 px-4 py-3 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 truncate">{script.title}</h1>
                {script.character && (
                  <p className="text-sm text-slate-600 truncate">角色: {script.character.name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/projects/${id}/scripts`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-sm whitespace-nowrap"
              >
                <Save className="w-4 h-4" />
                保存并返回
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Tab 切换 */}
        <div className="bg-white rounded-xl shadow-sm border-2.5 border-slate-200 mb-4">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('scene')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'scene'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              场景视图
            </button>
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
          </div>
        </div>

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

        {/* 场景编辑器 (抽屉) */}
        {showSceneEditor && editingScene && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
              <SceneEditorForm
                scene={editingScene}
                characters={characters}
                onSave={handleSaveScene}
                onCancel={() => {
                  setShowSceneEditor(false);
                  setEditingScene(null);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
