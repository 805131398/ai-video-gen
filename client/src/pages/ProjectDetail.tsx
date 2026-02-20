import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText } from 'lucide-react';
import {
  getProject,
  getProjectCharacters,
  deleteCharacter,
} from '../services/project';
import { createScript } from '../services/script';
import { Project, ProjectCharacter } from '../types';
import CharacterCard from '../components/project/CharacterCard';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [characters, setCharacters] = useState<ProjectCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(new Set());

  const loadData = async () => {
    if (!id) return;
    try {
      const [p, c] = await Promise.all([getProject(id), getProjectCharacters(id)]);
      setProject(p);

      // 为每个角色加载其数字人列表（只获取选中的数字人）
      const charactersWithDigitalHumans = await Promise.all(
        c.map(async (char) => {
          try {
            const { getDigitalHumans } = await import('../services/project');
            const digitalHumans = await getDigitalHumans(id, char.id);
            return { ...char, digitalHumans };
          } catch (err) {
            console.error(`加载角色 ${char.id} 的数字人失败:`, err);
            return char;
          }
        })
      );

      setCharacters(charactersWithDigitalHumans);
    } catch (err: any) {
      setError(err.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // 打印资源根目录路径
    if (window.electron?.resources?.getRootPath) {
      window.electron.resources.getRootPath().then((paths: any) => {
        console.log('='.repeat(80));
        console.log('📁 资源存储路径信息:');
        console.log('='.repeat(80));
        console.log('用户数据目录 (userData):', paths.userDataPath);
        console.log('资源根目录:', paths.resourcesRoot);
        console.log('数字人图片路径格式:', `${paths.resourcesRoot}/projects/{projectId}/characters/{characterId}/digital-humans/{resourceId}.jpg`);
        console.log('='.repeat(80));
      });
    }
  }, [id]);

  const handleAddCharacter = () => {
    if (!id) return;
    navigate(`/projects/${id}/characters/new`);
  };

  const handleEditCharacter = (character: ProjectCharacter) => {
    if (!id) return;
    navigate(`/projects/${id}/characters/${character.id}/edit`);
  };

  const handleGenerateDigitalHuman = (character: ProjectCharacter) => {
    if (!id) return;
    navigate(`/projects/${id}/characters/${character.id}/edit#digital-human`);
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (!id) return;
    if (!confirm('确定要删除这个角色吗？')) return;

    try {
      await deleteCharacter(id, characterId);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || '删除失败');
    }
  };

  const handleToggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedCharacterIds(new Set());
  };

  const handleToggleCharacterSelection = (characterId: string) => {
    const newSelected = new Set(selectedCharacterIds);
    if (newSelected.has(characterId)) {
      newSelected.delete(characterId);
    } else {
      newSelected.add(characterId);
    }
    setSelectedCharacterIds(newSelected);
  };

  const handleCreateScriptsForSelectedCharacters = async () => {
    if (!id || selectedCharacterIds.size === 0) {
      setError('请至少选择一个角色');
      return;
    }
    try {
      // 为第一个选中的角色创建剧本并跳转
      const firstCharacterId = Array.from(selectedCharacterIds)[0];
      const script = await createScript(id, { characterId: firstCharacterId });
      navigate(`/projects/${id}/script/${script.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || '创建剧本失败');
    }
  };

  if (loading) return <div className="p-8">加载中...</div>;
  if (!project) return <div className="p-8">项目不存在</div>;

  return (
    <>
      <div className="px-6 lg:px-8 xl:px-12 py-6 max-w-[1920px] mx-auto">
        {/* 返回按钮 */}
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2 mb-6 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>

        {/* 角色管理区域 */}
        <div className="space-y-4">
          {/* 头部信息栏 - 合并项目标题和操作按钮 */}
          <div className="bg-white rounded-xl shadow-sm border-2.5 border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* 左侧：项目标题和角色管理标题 */}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-slate-900 truncate">{project.topic}</h1>
                  {project.title && <p className="text-sm text-slate-600 truncate">{project.title}</p>}
                </div>
                <div className="h-8 w-px bg-slate-300" />
                <h2 className="text-lg font-semibold text-slate-900 whitespace-nowrap">角色管理</h2>
              </div>

              {/* 右侧：操作按钮 */}
              <div className="flex items-center gap-3">
                {/* 剧本管理按钮 */}
                <button
                  onClick={() => navigate(`/projects/${id}/scripts`)}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <FileText className="w-4 h-4" />
                  剧本管理
                </button>
                {/* 选择角色模式 */}
                {characters.length > 0 && (
                  <>
                    <button
                      onClick={handleToggleSelectMode}
                      className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors cursor-pointer shadow-sm whitespace-nowrap ${isSelectMode
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <FileText className="w-4 h-4" />
                      {isSelectMode ? '取消选择' : '选择角色'}
                    </button>
                    {isSelectMode && selectedCharacterIds.size > 0 && (
                      <button
                        onClick={handleCreateScriptsForSelectedCharacters}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer shadow-sm whitespace-nowrap"
                      >
                        <FileText className="w-4 h-4" />
                        编辑剧本 ({selectedCharacterIds.size})
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={handleAddCharacter}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  添加角色
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* 角色列表 */}
          {characters.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="text-slate-400 mb-4">
                <Plus className="w-16 h-16 mx-auto mb-3 opacity-50" />
              </div>
              <p className="text-slate-600 mb-2 font-medium">还没有添加角色</p>
              <p className="text-sm text-slate-500">点击"添加角色"按钮创建第一个角色</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {characters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  onEdit={handleEditCharacter}
                  onDelete={handleDeleteCharacter}
                  onGenerateDigitalHuman={handleGenerateDigitalHuman}
                  isSelectMode={isSelectMode}
                  isSelected={selectedCharacterIds.has(character.id)}
                  onToggleSelect={handleToggleCharacterSelection}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
