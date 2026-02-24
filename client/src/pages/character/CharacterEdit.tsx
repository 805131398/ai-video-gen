import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { getProject } from '../../services/project';
import { getCharacter, updateCharacter, generateDigitalHumans, selectDigitalHuman, uploadDigitalHuman } from '../../services/character';
import { getAiToolConfigsByType } from '../../services/aiTool';
import { videoGenerate, videoPollStatus, videoUpload } from '../../services/videoGenService';
import { Project, ProjectCharacter, CreateCharacterRequest } from '../../types';
import { showToast } from '../../components/ui/mini-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import DigitalHumanGenerator, { DigitalHuman } from '../../components/project/DigitalHumanGenerator';
import DigitalHumanHistory from '../../components/project/DigitalHumanHistory';

export interface SoraLog {
  time: number;
  message: string;
  progress?: number;
}

export interface SoraHistoryItem {
  taskId: string;
  status: 'in_progress' | 'completed' | 'failed';
  stage: 'base' | 'final';
  videoUrl?: string;
  error?: string;
  createdAt: string;
  logs: SoraLog[];
}

export default function CharacterEdit() {
  const { id: projectId, characterId } = useParams<{ id: string; characterId: string }>();
  const navigate = useNavigate();

  // 数据状态
  const [project, setProject] = useState<Project | null>(null);
  const [character, setCharacter] = useState<ProjectCharacter | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Tab 状态
  const [activeTab, setActiveTab] = useState<'basic' | 'digital-human' | 'advanced'>('basic');

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
  const [generatorKey, setGeneratorKey] = useState(0);

  // Sora 视频生成状态
  const [soraGenerating, setSoraGenerating] = useState(false);
  const [soraMessage, setSoraMessage] = useState('');
  const [soraCurrentProgress, setSoraCurrentProgress] = useState<number | undefined>();

  // Sora 分步向导状态
  const [baseVideoPrompt, setBaseVideoPrompt] = useState(`Portrait character turning side to side. ${character?.description || ''}`);
  const [baseVideoDuration, setBaseVideoDuration] = useState<number>(4);
  const [baseVideoRatio, setBaseVideoRatio] = useState<string>('16:9');
  const [selectedBaseVideoModelId, setSelectedBaseVideoModelId] = useState<string>('');
  const [availableVideoModels, setAvailableVideoModels] = useState<any[]>([]);

  const [uploadedBaseVideoUrl, setUploadedBaseVideoUrl] = useState<string>('');
  const [characterTimestamps, setCharacterTimestamps] = useState<string>('1,3');

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      if (!characterId) return;

      try {
        let p = null;
        if (projectId) {
          p = await getProject(projectId);
          setProject(p);
        }

        const char = await getCharacter(characterId);
        if (!char) {
          showToast('未找到该角色', 'error');
          navigate(projectId ? `/projects/${projectId}` : '/characters');
          return;
        }

        setCharacter(char);
        setName(char.name);
        setDescription(char.description);
        setAvatarUrl(char.avatarUrl || '');
        setAttributes((char.attributes as Record<string, any>) || {});
        setSelectedDigitalHumanId(char.attributes?.digitalHumanId as string | undefined);

        // 获取视频模型配置
        const videoConfigs = await getAiToolConfigsByType('video_gen');
        // 过滤掉 'sora2创建角色' 等专用模型，提取用于生成基础视频的模型
        const baseModels = videoConfigs.filter(c => !c.name.includes('sora2创建角色'));
        setAvailableVideoModels(baseModels);
        if (baseModels.length > 0) {
          const defaultModel = baseModels.find(c => c.isDefault) || baseModels[0];
          setSelectedBaseVideoModelId(defaultModel.id);
        }

        // 数字人历史由 DigitalHumanGenerator 组件自行加载
      } catch (err: any) {
        setError(err.response?.data?.error || '加载失败');
        showToast(err.response?.data?.error || '加载失败', 'error');
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
    } else if (hash === 'advanced') {
      setActiveTab('advanced');
    } else {
      setActiveTab('basic');
    }
  }, []);

  // 独立获取已选择数字人的图片URL（防止被子组件异步加载延迟导致闪烁或显示未配置）
  const [selectedHumanImageUrl, setSelectedHumanImageUrl] = useState<string | undefined>();
  useEffect(() => {
    if (!selectedDigitalHumanId || !characterId) return;

    const loadLocalImage = async (remoteUrl: string) => {
      try {
        const status = await window.electron.resources.getStatus('digital_human', selectedDigitalHumanId);
        if (status && status.status === 'completed' && status.localPath) {
          setSelectedHumanImageUrl(`local-resource://${status.localPath}`);
        } else {
          setSelectedHumanImageUrl(remoteUrl);
        }
      } catch (err) {
        console.error('Failed to load local resource status:', err);
        setSelectedHumanImageUrl(remoteUrl);
      }
    };

    // 如果已经在 history 里，直接用
    const human = digitalHumansHistory.find(h => h.id === selectedDigitalHumanId);
    if (human) {
      loadLocalImage(human.imageUrl);
      return;
    }

    // 否则直接从 DB 里查（处理页面刚刷新，history 还没被子组件抛上来的情况）
    window.electron.db.getDigitalHumans(characterId)
      .then(humans => {
        const found = humans.find(h => h.id === selectedDigitalHumanId);
        if (found) loadLocalImage(found.imageUrl);
      })
      .catch(console.error);
  }, [selectedDigitalHumanId, characterId, digitalHumansHistory]);

  // 数字人历史变化回调 - 用 useCallback 包裹防止无限渲染
  const handleHistoryChange = useCallback(
    (history: DigitalHuman[], loading: boolean, generating: boolean) => {
      setDigitalHumansHistory(history);
      setHistoryLoading(loading);
      setDigitalHumanGenerating(generating);
    },
    [] // 无依赖，只在挂载时创建一次
  );

  // 恢复之前的生成任务
  useEffect(() => {
    if (!attributes?.soraTask || !characterId || attributes.soraTask.resumed) return;
    const task = attributes.soraTask;
    if (task.status === 'in_progress' && !soraGenerating) {
      resumeSoraTask(task);
    }
  }, [characterId, attributes?.soraTask, soraGenerating]);

  // 页面加载时，将已有的远程视频 URL 缓存到本地
  useEffect(() => {
    if (!characterId || loading) return;

    const cacheExistingVideos = async () => {
      const history: SoraHistoryItem[] = Array.isArray(attributes.soraHistory) ? attributes.soraHistory : [];
      let changed = false;
      const updatedHistory = [...history];

      // 缓存 soraHistory 中的远程视频
      for (let i = 0; i < updatedHistory.length; i++) {
        const item = updatedHistory[i];
        if (item.videoUrl && !item.videoUrl.startsWith('local-resource://')) {
          const localUrl = await cacheVideoToLocal(item.videoUrl, item.taskId);
          if (localUrl !== item.videoUrl) {
            updatedHistory[i] = { ...item, videoUrl: localUrl };
            changed = true;
          }
        }
      }

      // 缓存 soraDigitalHumanUrl
      let updatedSoraDigitalHumanUrl = attributes.soraDigitalHumanUrl;
      if (updatedSoraDigitalHumanUrl && !updatedSoraDigitalHumanUrl.startsWith('local-resource://')) {
        // 用最后一个 final stage 的 taskId 作为 resourceId
        const finalTask = history.find(h => h.stage === 'final' && h.status === 'completed');
        const resourceId = finalTask?.taskId || 'final-digital-human';
        const localUrl = await cacheVideoToLocal(updatedSoraDigitalHumanUrl, resourceId);
        if (localUrl !== updatedSoraDigitalHumanUrl) {
          updatedSoraDigitalHumanUrl = localUrl;
          changed = true;
        }
      }

      if (changed) {
        const newAttributes = {
          ...attributes,
          soraHistory: updatedHistory,
          ...(updatedSoraDigitalHumanUrl !== attributes.soraDigitalHumanUrl
            ? { soraDigitalHumanUrl: updatedSoraDigitalHumanUrl }
            : {}),
        };
        setAttributes(newAttributes);
        await updateCharacter(characterId, { attributes: newAttributes });
      }
    };

    cacheExistingVideos();
  }, [characterId, loading]); // 仅在加载完成后执行一次

  const appendSoraLog = async (taskId: string, message: string, progress?: number, options?: { newStatus?: 'in_progress' | 'completed' | 'failed', videoUrl?: string, error?: string, stage?: 'base' | 'final' }) => {
    if (!characterId) return;

    // 我们先把最新的 attributes 拿出来更新，防止闭包过旧
    const currentHistory: SoraHistoryItem[] = Array.isArray(attributes.soraHistory) ? attributes.soraHistory : [];
    const historyItemIndex = currentHistory.findIndex(i => i.taskId === taskId);
    let updatedHistory = [...currentHistory];

    if (historyItemIndex >= 0) {
      // 存在，追加 log
      updatedHistory[historyItemIndex] = {
        ...updatedHistory[historyItemIndex],
        status: options?.newStatus || updatedHistory[historyItemIndex].status,
        videoUrl: options?.videoUrl || updatedHistory[historyItemIndex].videoUrl,
        error: options?.error || updatedHistory[historyItemIndex].error,
        stage: options?.stage || updatedHistory[historyItemIndex].stage,
        logs: [
          ...updatedHistory[historyItemIndex].logs,
          { time: Date.now(), message, progress }
        ]
      };
    } else {
      // 不存在，说明是刚创建的 Task
      updatedHistory = [{
        taskId,
        status: options?.newStatus || 'in_progress',
        stage: options?.stage || 'base',
        createdAt: new Date().toISOString(),
        videoUrl: options?.videoUrl,
        error: options?.error,
        logs: [{ time: Date.now(), message, progress }]
      }, ...currentHistory];
    }

    // 同步更新 soraTask 和 history
    const soraTaskUpdate = {
      taskId,
      status: options?.newStatus || attributes.soraTask?.status || 'in_progress',
      stage: options?.stage || attributes.soraTask?.stage || 'base'
    };

    const newAttributes = {
      ...attributes,
      soraTask: { ...attributes.soraTask, ...soraTaskUpdate },
      soraHistory: updatedHistory,
      ...(options?.newStatus === 'completed' && options?.videoUrl ? { soraDigitalHumanUrl: options.videoUrl } : {})
    };

    setAttributes(newAttributes);
    await updateCharacter(characterId, { attributes: newAttributes });
  };

  const resumeSoraTask = async (task: any) => {
    if (soraGenerating || !characterId) return;

    // 标记不要重复 resume
    const newAttributes = { ...attributes, soraTask: { ...task, resumed: true } };
    setAttributes(newAttributes);

    setSoraGenerating(true);
    const msg = task.stage === 'base' ? '正在等待基础视频恢复...' : '正在等待最终数字人恢复...';
    setSoraMessage(msg);
    await appendSoraLog(task.taskId, msg);

    try {
      const videoConfigs = await getAiToolConfigsByType('video_gen');
      if (task.stage === 'base') {
        // resume base polling -> log completed and update UI
        const standardConfig = videoConfigs.find(c => c.isDefault) || videoConfigs[0];
        if (!standardConfig || !standardConfig.extraConfig) throw new Error('恢复失败: 未找到基础配置');

        const baseVideoUrl = await pollLoop(standardConfig, task.taskId, '正在等待基础视频...');
        if (!baseVideoUrl) throw new Error('基础视频恢复失败');

        // 缓存到本地
        const localBaseVideoUrl = await cacheVideoToLocal(baseVideoUrl, task.taskId);

        await appendSoraLog(task.taskId, '基础视频生成完毕', 100, { newStatus: 'completed', videoUrl: localBaseVideoUrl });
        setSoraGenerating(false);
        setSoraMessage('');
      } else {
        // resume final polling
        const soraCharConfig = videoConfigs.find(c => c.name === 'sora2创建角色');
        if (!soraCharConfig || !soraCharConfig.extraConfig) throw new Error('恢复失败: 未找到最终配置');

        const finalVideoUrl = await pollLoop(soraCharConfig, task.taskId, '正在等待最终数字人处理...');
        if (!finalVideoUrl) throw new Error('最终数字人恢复失败');

        await completeSoraTask(task.taskId, finalVideoUrl);
      }
    } catch (err: any) {
      console.error('恢复 Sora 失败:', err);
      showToast(err.message || '恢复过程中发生错误', 'error');
      await appendSoraLog(task.taskId, err.message, undefined, { newStatus: 'failed', error: err.message });
      setSoraGenerating(false);
      setSoraMessage('');
      setSoraCurrentProgress(undefined);
    }
  };

  const pollLoop = async (config: any, taskId: string, defaultMsg: string): Promise<string> => {
    let errorCount = 0;
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const poll = await videoPollStatus({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        statusConfig: config.extraConfig.endpoints.status,
        taskId: taskId,
        modelName: config.modelName || undefined,
        modelConfigId: config.id
      });

      if (!poll.success) {
        if (++errorCount > 3) throw new Error('查询视频状态失败');
        continue;
      }

      const status = (poll.status || '').toLowerCase();
      if (['completed', 'success', 'succeeded'].includes(status)) {
        return poll.videoUrl || '';
      } else if (['failed', 'error', 'cancelled'].includes(status)) {
        const detailErr = poll.rawResponse?.error?.message || poll.rawResponse?.error || status;
        throw new Error('视频生成失败: ' + (typeof detailErr === 'object' ? JSON.stringify(detailErr) : detailErr));
      } else {
        const progress = poll.rawResponse?.progress ?? poll.rawResponse?.result?.progress;
        const msg = `${defaultMsg.replace('...', '')}... ${progress !== undefined ? progress + '%' : ''}`;
        setSoraMessage(msg);
        if (progress !== undefined) setSoraCurrentProgress(progress);
        await appendSoraLog(taskId, msg, progress);
      }
    }
  };

  const handleGenerateBaseVideo = async () => {
    if (!characterId) return;

    if (!selectedDigitalHumanId) {
      showToast('请在此页面数字人模块下选择或生成并设置一个数字人形象', 'error');
      return;
    }

    let human = digitalHumansHistory.find(h => h.id === selectedDigitalHumanId);
    if (!human) {
      try {
        const humans = await window.electron.db.getDigitalHumans(characterId);
        human = humans.find(h => h.id === selectedDigitalHumanId);
      } catch (err) {
        console.error('获取数字人失败:', err);
      }
    }

    if (!human || !human.imageUrl) {
      showToast('无法获取当前的数字人形象，请重新选择', 'error');
      return;
    }

    try {
      setSoraGenerating(true);
      setSoraMessage('读取模型配置并上传形象...');

      const baseModel = availableVideoModels.find(c => c.id === selectedBaseVideoModelId);

      if (!baseModel || !baseModel.extraConfig) {
        throw new Error('未找到有效的图生视频大模型配置，请重新检查您的 AI 模型配置。');
      }

      let imageUrl = human.imageUrl;

      // 若为本地图则上传
      if (imageUrl.startsWith('local-')) {
        const filePath = decodeURIComponent(imageUrl.replace(/^local-[^:]+:\/\//, ''));
        const uploadRes = await videoUpload({
          baseUrl: baseModel.baseUrl,
          apiKey: baseModel.apiKey,
          uploadConfig: baseModel.extraConfig.endpoints.upload,
          filePath
        });
        if (!uploadRes.success || !uploadRes.imageUrl) {
          throw new Error('上传数字人图片失败: ' + (uploadRes.error || ''));
        }
        imageUrl = uploadRes.imageUrl;
      }

      // 获取图生视频关联的参数 Key（动态获取）
      // 处理某些配置里叫做 image_url，另一些叫做 image_urls
      const params = baseModel.extraConfig.endpoints.generate.params || [];
      const imageParamKeyItem = params.find((p: any) => p.type === 'file' || p.type === 'image' || p.key.toLowerCase().includes('image'));
      const imageParamKey = imageParamKeyItem ? imageParamKeyItem.key : 'image_urls';

      console.log('[CharacterEdit] 选中的基础视频模型:', {
        modelId: baseModel.id,
        modelName: baseModel.modelName || baseModel.name,
        baseUrl: baseModel.baseUrl,
        generateEndpoint: baseModel.extraConfig.endpoints.generate,
      });
      console.log('[CharacterEdit] generate.params 列表:', JSON.stringify(params, null, 2));
      console.log('[CharacterEdit] 匹配到的 imageParamKeyItem:', imageParamKeyItem);
      console.log('[CharacterEdit] 最终使用的 imageParamKey:', imageParamKey);

      setSoraMessage('提交基础参考视频生成任务...');
      let imageValue: any = imageUrl;
      // 如果大模型期望传入的是数组格式 (如 sora-2-vip的 image_urls)
      if (imageParamKey.endsWith('s')) {
        imageValue = [imageUrl];
      }

      const baseRes = await videoGenerate({
        baseUrl: baseModel.baseUrl,
        apiKey: baseModel.apiKey,
        generateConfig: baseModel.extraConfig.endpoints.generate,
        prompt: baseVideoPrompt.trim() || `Portrait character turning side to side. ${description}`,
        imageUrl: imageValue, // 我们通过 imageUrl 传或者 paramValues 传
        paramValues: {
          duration: baseVideoDuration,
          aspect_ratio: baseVideoRatio,
          [imageParamKey]: imageValue
        },
        conversationId: projectId,
        modelName: baseModel.modelName || baseModel.name,
        modelConfigId: baseModel.id
      });

      if (!baseRes.success || !baseRes.taskId) {
        throw new Error('基础视频生成失败: ' + baseRes.error);
      }

      await appendSoraLog(baseRes.taskId, '成功排队基础视频生成任务', undefined, { newStatus: 'in_progress', stage: 'base' });
      setSoraMessage('正在等待基础视频...');

      const baseVideoUrl = await pollLoop(baseModel, baseRes.taskId, '正在生成基础视频...');
      if (!baseVideoUrl) throw new Error('获取基础视频为空');

      // 缓存到本地
      setSoraMessage('正在缓存基础视频到本地...');
      const localBaseVideoUrl = await cacheVideoToLocal(baseVideoUrl, baseRes.taskId);

      await appendSoraLog(baseRes.taskId, '基础视频生成完毕', 100, { newStatus: 'completed', videoUrl: localBaseVideoUrl });

      setSoraGenerating(false);
      setSoraMessage('');
      setSoraCurrentProgress(undefined);
    } catch (err: any) {
      console.error('基础视频生成失败:', err);
      showToast(err.message || '生成过程中发生错误', 'error');
      if (attributes?.soraTask?.taskId && soraGenerating && attributes.soraTask.stage === 'base') {
        await appendSoraLog(attributes.soraTask.taskId, err.message, undefined, { newStatus: 'failed', error: err.message });
      }
      setSoraGenerating(false);
      setSoraMessage('');
      setSoraCurrentProgress(undefined);
    }
  };

  const handleGenerateFinalCharacter = async (baseVideoUrl: string) => {
    if (!characterId) return;

    // Allow uploaded URL override
    const targetVideoUrl = uploadedBaseVideoUrl.trim() || baseVideoUrl;
    if (!targetVideoUrl) {
      showToast('未找到有效的基础视频，请先生成或输入基础视频 URL。', 'error');
      return;
    }

    try {
      setSoraGenerating(true);
      setSoraMessage('读取 Sora2 角色提取配置...');

      const videoConfigs = await getAiToolConfigsByType('video_gen');
      const soraCharConfig = videoConfigs.find(c => c.name === 'sora2创建角色');

      if (!soraCharConfig || !soraCharConfig.extraConfig) {
        throw new Error('未找到名为 "sora2创建角色" 的有效配置。');
      }

      setSoraMessage('调用角色深度渲染提取...');
      const finalRes = await videoGenerate({
        baseUrl: soraCharConfig.baseUrl,
        apiKey: soraCharConfig.apiKey,
        generateConfig: soraCharConfig.extraConfig.endpoints.generate,
        prompt: `Convert to advanced character. ${description}`,
        imageUrl: undefined,
        paramValues: {
          url: targetVideoUrl,
          timestamps: characterTimestamps.trim() || '1,3'
        },
        modelName: soraCharConfig.modelName || undefined,
        modelConfigId: soraCharConfig.id
      });

      if (!finalRes.success || !finalRes.taskId) {
        throw new Error('提取角色失败: ' + finalRes.error);
      }

      await appendSoraLog(finalRes.taskId, '成功排队最终数字人提取任务', undefined, { newStatus: 'in_progress', stage: 'final' });

      const finalVideoUrl = await pollLoop(soraCharConfig, finalRes.taskId, '深度渲染角色中...');
      if (!finalVideoUrl) throw new Error('获取最终视频失败');

      await completeSoraTask(finalRes.taskId, finalVideoUrl);
    } catch (err: any) {
      console.error('提取角色失败:', err);
      showToast(err.message || '渲染角色发生错误', 'error');
      if (attributes?.soraTask?.taskId && soraGenerating && attributes.soraTask.stage === 'final') {
        await appendSoraLog(attributes.soraTask.taskId, err.message, undefined, { newStatus: 'failed', error: err.message });
      }
      setSoraGenerating(false);
      setSoraMessage('');
      setSoraCurrentProgress(undefined);
    }
  };

  const completeSoraTask = async (taskId: string, finalVideoUrl: string) => {
    // 缓存到本地
    const localFinalVideoUrl = await cacheVideoToLocal(finalVideoUrl, taskId);

    await appendSoraLog(taskId, '引擎渲染完成！', 100, { newStatus: 'completed', videoUrl: localFinalVideoUrl });
    showToast('Sora 角色模型处理完成！', 'success');
    setSoraGenerating(false);
    setSoraMessage('');
    setSoraCurrentProgress(undefined);
  };

  // 供外部重新加载数字人历史（由 DigitalHumanHistory 刷新按钮触发）
  const handleReloadHistory = useCallback(() => {
    // 递增 key 强制 DigitalHumanGenerator 重新 mount，触发其内部 loadHistory
    setGeneratorKey(k => k + 1);
  }, []);

  // 将远程视频缓存到本地，返回 local-resource:// 路径
  const cacheVideoToLocal = useCallback(async (remoteUrl: string, taskId: string): Promise<string> => {
    if (!remoteUrl || remoteUrl.startsWith('local-resource://')) return remoteUrl;

    try {
      const result = await window.electron.resources.download({
        url: remoteUrl,
        resourceType: 'sora_video',
        resourceId: taskId,
        projectId,
        characterId,
      });

      if (result.success && result.localPath) {
        return `local-resource://${result.localPath}`;
      }
    } catch (err) {
      console.error('缓存视频到本地失败:', err);
    }

    return remoteUrl;
  }, [projectId, characterId]);

  const handleBack = () => {
    if (projectId) {
      navigate(`/projects/${projectId}`);
    } else {
      navigate('/characters');
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'basic' | 'digital-human' | 'advanced');
    window.location.hash = tab;
  };

  const handleSave = async (returnToList: boolean) => {
    if (!characterId) return;
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

      await updateCharacter(characterId, data);

      showToast('角色信息已更新');

      if (returnToList) {
        navigate(projectId ? `/projects/${projectId}` : '/characters');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '保存失败，请重试');
      showToast(err.response?.data?.message || '保存失败，请重试', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateDigitalHumans = async (
    _desc: string,
    _refImage?: string,
    aspectRatio?: string,
    count?: number
  ): Promise<void> => {
    if (!characterId) return;
    // 直接触发生成 API，DigitalHumanGenerator 自己负责轮询和展示结果
    await generateDigitalHumans(characterId, count || 1, aspectRatio);
  };

  const handleUploadDigitalHuman = async (): Promise<any> => {
    if (!characterId) return null;
    return await uploadDigitalHuman(characterId);
  };

  const handleSelectDigitalHuman = async (humanId: string) => {
    if (!characterId) return;

    try {
      await selectDigitalHuman(characterId, humanId);
      setSelectedDigitalHumanId(humanId);

      // 同时更新角色 attributes 中的 digitalHumanId，确保重新打开时能恢复选择
      const updatedAttributes = { ...attributes, digitalHumanId: humanId };
      setAttributes(updatedAttributes);
      await updateCharacter(characterId, {
        name,
        description,
        avatarUrl: avatarUrl || undefined,
        attributes: updatedAttributes,
      });

      showToast('数字人已设置为当前角色');
    } catch (err: any) {
      console.error('选择数字人失败:', err);
      showToast(err.response?.data?.error || '选择失败，请重试', 'error');
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
                onClick={() => navigate(projectId ? `/projects/${projectId}` : '/characters')}
                className="hover:text-gray-900 cursor-pointer transition-colors"
              >
                {projectId ? (project?.title || project?.topic) : '返回列表'}
              </button>
              {projectId && (
                <>
                  <span>&gt;</span>
                  <button
                    onClick={() => navigate(`/projects/${projectId}`)}
                    className="hover:text-gray-900 cursor-pointer transition-colors"
                  >
                    角色管理
                  </button>
                </>
              )}
              <span>&gt;</span>
              <span className="text-gray-900">编辑角色</span>
            </div>
          </div >
        </div >
      </div >

      {/* 主体内容 */}
      < div className="max-w-10xl mx-auto px-4 sm:px-6 lg:px-8 py-8" >
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          编辑角色：{character.name}
        </h1>

        {/* Tab 切换 */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="basic" className="cursor-pointer">基本信息</TabsTrigger>
            <TabsTrigger value="digital-human" className="cursor-pointer">数字人</TabsTrigger>
            <TabsTrigger value="advanced" className="cursor-pointer">高级选项</TabsTrigger>
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
                  key={generatorKey}
                  characterId={characterId!}
                  characterName={name}
                  characterDescription={description}
                  referenceImageUrl={avatarUrl || undefined}
                  onGenerate={handleGenerateDigitalHumans}
                  onUpload={handleUploadDigitalHuman}
                  onSelect={handleSelectDigitalHuman}
                  selectedHumanId={selectedDigitalHumanId}
                  onHistoryChange={handleHistoryChange}
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
                  onRegenerate={handleReloadHistory}
                />
              </div>
            </div>
          </TabsContent>


          {/* Tab 3 - 高级选项 */}
          <TabsContent value="advanced">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full">
              {/* 左侧：Sora 角色控制 */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col h-full min-h-[600px] overflow-y-auto">
                <div className="max-w-3xl flex-1 flex flex-col">
                  <h3 className="text-xl font-semibold text-slate-900 mb-3 flex items-center gap-2.5 shrink-0">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>
                    Sora 角色分步深度萃取
                  </h3>
                  <p className="text-slate-600 leading-relaxed mb-6 shrink-0 text-sm">
                    通过精细化的两步提炼，打造电影级的高保真动态数字人模型。
                  </p>

                  <div className="space-y-6">
                    {/* 第一步：生成基础视频 */}
                    <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-6 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">1</div>
                          <h4 className="text-lg font-medium text-slate-900">生成基础参考动态</h4>
                        </div>

                        {(() => {
                          const imgUrl = selectedHumanImageUrl;
                          if (imgUrl) {
                            return (
                              <div className="flex flex-col items-center gap-1.5 text-xs font-medium text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm transition-transform hover:scale-105" title="当前使用的数字人形象">
                                <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0 shadow-sm relative group">
                                  <img src={imgUrl} alt="avatar" className="w-full h-full object-cover transition-opacity group-hover:opacity-90" />
                                </div>
                                <span>参照形象</span>
                              </div>
                            );
                          }
                          return (
                            <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                              尚未配置数字人形象
                            </div>
                          );
                        })()}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">画面提示词 (Prompt)</label>
                          <textarea
                            value={baseVideoPrompt}
                            onChange={(e) => setBaseVideoPrompt(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            placeholder="描述基础参考视频的画面..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">图生视频大模型</label>
                            <select
                              value={selectedBaseVideoModelId}
                              onChange={(e) => setSelectedBaseVideoModelId(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            >
                              {availableVideoModels.map(model => (
                                <option key={model.id} value={model.id}>
                                  {model.name} {model.modelName ? `(${model.modelName})` : ''}
                                  {model.isDefault ? ' [默认]' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">时长 (秒)</label>
                            <select
                              value={baseVideoDuration}
                              onChange={(e) => setBaseVideoDuration(Number(e.target.value))}
                              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            >
                              <option value={4}>4 秒</option>
                              <option value={5}>5 秒</option>
                              <option value={8}>8 秒</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">画面比例</label>
                            <select
                              value={baseVideoRatio}
                              onChange={(e) => setBaseVideoRatio(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            >
                              <option value="16:9">横屏 16:9</option>
                              <option value="9:16">竖屏 9:16</option>
                              <option value="1:1">方形 1:1</option>
                            </select>
                          </div>
                        </div>

                        <button
                          onClick={handleGenerateBaseVideo}
                          disabled={soraGenerating}
                          className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 transition-colors shadow-sm font-medium"
                        >
                          {soraGenerating && soraMessage.includes('基础') ? (
                            <><Loader2 className="w-4 h-4 animate-spin text-purple-500" /> {soraMessage}</>
                          ) : (
                            '生成步骤一参考视频'
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 第二步：高阶模型提取 */}
                    <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-6 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">2</div>
                        <h4 className="text-lg font-medium text-slate-900">核心角色深度萃取</h4>
                        {attributes.soraDigitalHumanUrl && (
                          <div className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-md border border-emerald-100">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            最终模型已就绪
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            基础视频 URL (若未完成步骤一，可在此处覆写 URL)
                          </label>
                          <input
                            type="text"
                            value={uploadedBaseVideoUrl}
                            onChange={(e) => setUploadedBaseVideoUrl(e.target.value)}
                            placeholder="填写已存在的 MP4 地址，或留空自动使用左侧生成的基础视频"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm font-mono text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            角色出现片段 (Timestamps)
                          </label>
                          <input
                            type="text"
                            value={characterTimestamps}
                            onChange={(e) => setCharacterTimestamps(e.target.value)}
                            placeholder="例如：1,3"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm font-mono"
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            仅截取参考视频中人物特征最清晰的数秒片段，以逗号分隔，例如 <code>1,3</code>。
                          </p>
                        </div>

                        {attributes.soraDigitalHumanUrl && (
                          <div className="relative group overflow-hidden bg-black rounded-lg aspect-video w-full flex items-center justify-center border border-slate-200 mt-2">
                            <video
                              src={attributes.soraDigitalHumanUrl}
                              className="w-full h-full object-cover"
                              controls
                              playsInline
                            />
                          </div>
                        )}

                        <button
                          onClick={() => handleGenerateFinalCharacter(uploadedBaseVideoUrl)}
                          disabled={soraGenerating}
                          className="w-full mt-4 flex items-center justify-center gap-2.5 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 transition-all shadow-sm font-medium cursor-pointer active:scale-[0.98]"
                        >
                          {soraGenerating && !soraMessage.includes('基础') ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                              <span>{soraMessage || '引擎深度萃取中...'}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className={`w-5 h-5 ${attributes.soraDigitalHumanUrl ? 'text-slate-400' : 'text-purple-400'}`} />
                              <span>{attributes.soraDigitalHumanUrl ? '重新萃取此模型' : '开始最终角色萃取'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* 右侧：生成历史与日志 */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full min-h-[600px] overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    生成历史与日志
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                  {(!attributes?.soraHistory || attributes.soraHistory.length === 0) ? (
                    <div className="text-center text-slate-500 py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
                      暂无生成历史
                    </div>
                  ) : (
                    attributes.soraHistory.map((item: SoraHistoryItem, idx: number) => (
                      <div key={item.taskId} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                          <span className="font-mono text-xs text-slate-500 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-sm">
                            Task: {item.taskId.slice(-8)}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 tracking-tight">
                              {new Date(item.createdAt).toLocaleString()}
                            </span>
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${item.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              item.status === 'failed' ? 'bg-red-50 text-red-700 border-red-100' :
                                'bg-sky-50 text-sky-700 border-sky-100'
                              }`}>
                              {item.status === 'completed' ? '成功' : item.status === 'failed' ? '失败' : '生成中...'}
                            </span>
                          </div>
                        </div>

                        <div className="p-5 flex flex-col sm:flex-row gap-5">
                          {item.videoUrl ? (
                            <div className="w-full sm:w-48 aspect-video bg-black rounded-lg overflow-hidden shrink-0 border border-slate-200 relative group">
                              <video src={item.videoUrl} className="w-full h-full object-cover transition-opacity" controls preload="metadata" />
                            </div>
                          ) : (
                            <div className="w-full sm:w-48 aspect-video bg-slate-50 rounded-lg flex items-center justify-center shrink-0 border border-slate-200">
                              {item.status === 'failed' ? (
                                <span className="text-slate-400 text-sm font-medium">生成失败无视频</span>
                              ) : (
                                <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                              )}
                            </div>
                          )}

                          <div className="flex-1 bg-slate-900 rounded-lg p-4 h-36 overflow-y-auto font-mono text-xs shadow-inner">
                            {item.logs?.length > 0 ? (
                              item.logs.map((log, i) => (
                                <div key={i} className="mb-2 flex gap-2.5 leading-relaxed">
                                  <span className="text-slate-500 shrink-0 select-none">[{new Date(log.time).toLocaleTimeString()}]</span>
                                  <span className={log.message.includes('失败') || log.message.includes('error') ? 'text-red-400 font-medium' : 'text-emerald-400'}>
                                    {log.message} {log.progress !== undefined ? <span className="text-emerald-200 ml-1">({log.progress}%)</span> : ''}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-500">暂无日志输出...</span>
                            )}
                          </div>
                        </div>

                        {item.error && (
                          <div className="px-5 py-3 bg-red-50 text-red-700 text-sm border-t border-red-100 break-words">
                            <span className="font-semibold mr-1">错误信息：</span>{item.error}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </>
  );
}
