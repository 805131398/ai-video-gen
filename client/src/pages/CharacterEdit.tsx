import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { getProject, getProjectCharacters, updateCharacter, generateDigitalHumans, selectDigitalHuman, getDigitalHumans } from '../services/project';
import { Project, ProjectCharacter, CreateCharacterRequest } from '../types';
import { useToast } from '../hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import DigitalHumanGenerator, { DigitalHuman } from '../components/project/DigitalHumanGenerator';
import DigitalHumanHistory from '../components/project/DigitalHumanHistory';

export default function CharacterEdit() {
  const { id: projectId, characterId } = useParams<{ id: string; characterId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // 数据状态
  const [project, setProject] = useState<Project | null>(null);
  const [character, setCharacter] = useState<ProjectCharacter | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Tab 状态
  const [activeTab, setActiveTab] = useState<'basic' | 'digital-human'>('basic');

  // 表单状态
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [attributes, setAttributes] = useState<Record<string, any>>({});

  // 数字人状态
  const [digitalHumansHistory, setDigitalHumansHistory] = useState<DigitalHuman[]>([]);
  const [selectedDigitalHumanId, setSelectedDigitalHumanId] = useState<string | undefined>();
  const [historyLoading, setHistoryLoading] = useState(false);
  const [digitalHumanGenerating, setDigitalHumanGenerating] = useState(false);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      if (!projectId || !characterId) return;

      try {
        const [p, characters] = await Promise.all([
          getProject(projectId),
          getProjectCharacters(projectId),
        ]);

        setProject(p);

        const char = characters.find(c => c.id === characterId);
        if (!char) {
          toast({
            title: '角色不存在',
            description: '未找到该角色',
            variant: 'destructive',
          });
          navigate(`/projects/${projectId}`);
          return;
        }

        setCharacter(char);
        setName(char.name);
        setDescription(char.description);
        setAvatarUrl(char.avatarUrl || '');
        setAttributes((char.attributes as Record<string, any>) || {});
        setSelectedDigitalHumanId(char.attributes?.digitalHumanId as string | undefined);

        // 加载数字人历史
        loadDigitalHumansHistory();
      } catch (err: any) {
        setError(err.response?.data?.error || '加载失败');
        toast({
          title: '加载失败',
          description: err.response?.data?.error || '请重试',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, characterId]);

  // 从 hash 读取 tab 状态
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash === 'digital-human') {
      setActiveTab('digital-human');
    } else {
      setActiveTab('basic');
    }
  }, []);

  // 加载数字人历史
  const loadDigitalHumansHistory = async () => {
    if (!projectId || !characterId) return;

    setHistoryLoading(true);
    try {
      const digitalHumans = await getDigitalHumans(projectId, characterId);
      setDigitalHumansHistory(digitalHumans);
    } catch (err) {
      console.error('加载数字人历史失败:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleBack = () => {
    if (!projectId) return;
    navigate(`/projects/${projectId}`);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'basic' | 'digital-human');
    window.location.hash = tab;
  };

  const handleSave = async (returnToList: boolean) => {
    if (!projectId || !characterId) return;
    if (!name.trim() || !description.trim()) {
      setError('请填写必填字段');
      return;
    }

    setError('');
    setSaving(true);

    try {
      const updatedAttributes = {
        ...attributes,
        ...(selectedDigitalHumanId ? { digitalHumanId: selectedDigitalHumanId } : {}),
      };

      const data: CreateCharacterRequest = {
        name: name.trim(),
        description: description.trim(),
        avatarUrl: avatarUrl || undefined,
        attributes: Object.keys(updatedAttributes).length > 0 ? updatedAttributes : undefined,
        sortOrder: character?.sortOrder || 0,
      };

      await updateCharacter(projectId, characterId, data);

      toast({
        title: '保存成功',
        description: '角色信息已更新',
      });

      if (returnToList) {
        navigate(`/projects/${projectId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '保存失败，请重试');
      toast({
        title: '保存失败',
        description: err.response?.data?.message || '请重试',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateDigitalHumans = async (
    desc: string,
    refImage?: string,
    aspectRatio?: string,
    count?: number
  ): Promise<void> => {
    if (!projectId || !characterId) return;

    try {
      await generateDigitalHumans(projectId, characterId, count || 1, aspectRatio);

      // 轮询查询结果
      const beforeCount = digitalHumansHistory.length;
      const expectedCount = count || 1;
      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000));

        try {
          const digitalHumans = await getDigitalHumans(projectId, characterId, true);
          const newCount = digitalHumans.length - beforeCount;

          if (newCount >= expectedCount) {
            await loadDigitalHumansHistory();
            return;
          }
        } catch (error) {
          console.error('查询数字人失败:', error);
        }

        attempts++;
      }

      throw new Error('生成超时，请刷新页面查看结果');
    } catch (error) {
      console.error('生成数字人失败:', error);
      throw error;
    }
  };

  const handleSelectDigitalHuman = async (humanId: string) => {
    if (!projectId || !characterId) return;

    try {
      await selectDigitalHuman(projectId, characterId, humanId);
      setSelectedDigitalHumanId(humanId);

      // 同时更新角色 attributes 中的 digitalHumanId，确保重新打开时能恢复选择
      const updatedAttributes = { ...attributes, digitalHumanId: humanId };
      setAttributes(updatedAttributes);
      await updateCharacter(projectId, characterId, {
        name,
        description,
        avatarUrl: avatarUrl || undefined,
        attributes: updatedAttributes,
      });

      toast({
        title: '选择成功',
        description: '数字人已设置为当前角色',
      });
    } catch (err: any) {
      console.error('选择数字人失败:', err);
      toast({
        title: '选择失败',
        description: err.response?.data?.error || '请重试',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  if (!character) {
    return null;
  }

  return (
    <>
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回</span>
            </button>
            <div className="ml-4 text-sm text-gray-500 flex items-center gap-1">
              <button
                onClick={() => navigate(`/projects/${projectId}`)}
                className="hover:text-gray-900 cursor-pointer transition-colors"
              >
                {project?.title || project?.topic}
              </button>
              <span>&gt;</span>
              <button
                onClick={() => navigate(`/projects/${projectId}`)}
                className="hover:text-gray-900 cursor-pointer transition-colors"
              >
                角色管理
              </button>
              <span>&gt;</span>
              <span className="text-gray-900">编辑角色</span>
            </div>
          </div >
        </div >
      </div >

      {/* 主体内容 */}
      < div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" >
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          编辑角色：{character.name}
        </h1>

        {/* Tab 切换 */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="basic" className="cursor-pointer">基本信息</TabsTrigger>
            <TabsTrigger value="digital-human" className="cursor-pointer">数字人</TabsTrigger>
          </TabsList>

          {/* Tab 1 - 基本信息 */}
          <TabsContent value="basic">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <form className="space-y-6">
                {/* 角色名称 */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    角色名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：健康专家"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* 角色描述 */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    角色描述 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="详细描述角色的外貌、性格、穿着等特征，帮助 AI 保持一致性"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    详细描述角色的外貌、性格、穿着等特征，帮助 AI 保持一致性
                  </p>
                </div>

                {error && (
                  <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-md p-3">
                    {error}
                  </div>
                )}
              </form>
            </div>

            {/* 底部操作栏 */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={saving}
                  className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={saving || !name.trim() || !description.trim()}
                  className="px-6 py-2 text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {saving ? '保存中...' : '保存并返回'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving || !name.trim() || !description.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2 - 数字人 */}
          <TabsContent value="digital-human">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 左侧：数字人生成器 */}
              <div>
                <DigitalHumanGenerator
                  projectId={projectId!}
                  characterId={characterId!}
                  characterName={name}
                  characterDescription={description}
                  referenceImageUrl={avatarUrl || undefined}
                  onGenerate={handleGenerateDigitalHumans}
                  onSelect={handleSelectDigitalHuman}
                  selectedHumanId={selectedDigitalHumanId}
                  onHistoryChange={(history, loading, generating) => {
                    setDigitalHumansHistory(history);
                    setHistoryLoading(loading);
                    setDigitalHumanGenerating(generating);
                  }}
                />
              </div>

              {/* 右侧：历史记录 */}
              <div>
                <DigitalHumanHistory
                  history={digitalHumansHistory}
                  selectedHumanId={selectedDigitalHumanId}
                  onSelect={handleSelectDigitalHuman}
                  loading={historyLoading}
                  generating={digitalHumanGenerating}
                  onRegenerate={() => loadDigitalHumansHistory()}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
