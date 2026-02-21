import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  User,
  Camera,
  FileText,
  Edit3,
  MessageSquare,
  Info,
  Languages,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  getScript,
  getScriptScenes,
  generateSceneVideo,
  previewPrompt,
  translatePrompt
} from '../services/script';
import { getProjectCharacters } from '../services/project';
import { saveGenerationSnapshot, saveScenePromptCache, getScenePromptCache } from '../services/localDataService';
import { ensureReferenceImageAccessible } from '../services/providerUpload';
import {
  ProjectScript,
  ScriptScene,
  SceneContent,
  ProjectCharacter,
  PreviewPromptResponse,
  GenerationSnapshot,
} from '../types';

function InfoTip({ text }: { text: string }) {
  return (
    <span className="relative group/tip inline-flex ml-1">
      <Info className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500 cursor-help transition-colors" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-2 text-xs text-white bg-slate-800 rounded-lg max-w-[220px] w-max opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-opacity z-50 leading-relaxed">
        {text}
      </span>
    </span>
  );
}

export default function SceneVideoGenerate() {
  const { id, scriptId, sceneId } = useParams<{
    id: string;
    scriptId: string;
    sceneId: string;
  }>();
  const navigate = useNavigate();

  // 数据状态
  const [script, setScript] = useState<ProjectScript | null>(null);
  const [scene, setScene] = useState<ScriptScene | null>(null);
  const [characters, setCharacters] = useState<ProjectCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 提示词状态（双语）
  const [promptEn, setPromptEn] = useState('');
  const [promptZh, setPromptZh] = useState('');
  const [originalPromptEn, setOriginalPromptEn] = useState('');
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptLang, setPromptLang] = useState<'zh' | 'en'>('zh');
  const [zhEdited, setZhEdited] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [characterInfo, setCharacterInfo] = useState<
    PreviewPromptResponse['characterInfo']
  >({});

  // 角色图片本地路径
  const [localImageUrl, setLocalImageUrl] = useState<string>('');

  // 生成选项
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [promptType, setPromptType] = useState<
    'smart_combine' | 'ai_optimized'
  >('ai_optimized');
  const [useStoryboard, setUseStoryboard] = useState(false);
  const [useCharacterImage, setUseCharacterImage] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(true);

  // 声音选项
  const [withVoice, setWithVoice] = useState(true);
  const [voiceLanguage, setVoiceLanguage] = useState<'zh' | 'en'>('zh');

  // 生成状态
  const [generating, setGenerating] = useState(false);

  // 计算时长
  const sceneDuration = scene?.duration || 10;
  const finalDuration = sceneDuration <= 12 ? 10 : 15;

  // 加载数据
  const loadData = useCallback(async () => {
    if (!id || !scriptId || !sceneId) return;
    try {
      setLoading(true);
      const [scriptData, scenesData, charsData] = await Promise.all([
        getScript(id, scriptId),
        getScriptScenes(id, scriptId),
        getProjectCharacters(id),
      ]);
      setScript(scriptData);
      setCharacters(charsData);
      const currentScene = scenesData.find((s: ScriptScene) => s.id === sceneId);
      setScene(currentScene || null);
    } catch (err: any) {
      setError(err.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id, scriptId, sceneId]);

  // 加载提示词（支持指定类型，默认使用当前 promptType）
  const loadPrompt = useCallback(async (overrideType?: 'smart_combine' | 'ai_optimized') => {
    if (!id || !scriptId || !sceneId) return;
    try {
      setPromptLoading(true);
      const result = await previewPrompt(id, scriptId, sceneId, {
        promptType: overrideType || promptType,
        useStoryboard,
        useCharacterImage,
        withVoice,
        voiceLanguage,
      });
      const { en, zh } = result.prompt;
      setPromptEn(en);
      setPromptZh(zh);
      setOriginalPromptEn(en);
      setZhEdited(false);
      setCharacterInfo(result.characterInfo || {});

      // 保存到本地缓存
      await saveScenePromptCache({
        sceneId,
        projectId: id,
        scriptId,
        promptEn: en,
        promptZh: zh,
        promptType: overrideType || promptType,
        useStoryboard,
        useCharacterImage,
        aspectRatio,
        characterId: result.characterInfo?.characterId,
        characterName: result.characterInfo?.characterName,
        digitalHumanId: result.characterInfo?.digitalHumanId,
        referenceImage: result.characterInfo?.referenceImage,
        imageSource: result.characterInfo?.imageSource,
        withVoice,
        voiceLanguage,
      });
    } catch (err: any) {
      console.error('Preview prompt error:', err);
      setPromptEn('提示词生成失败，请重试');
      setPromptZh('');
    } finally {
      setPromptLoading(false);
    }
  }, [id, scriptId, sceneId, promptType, useStoryboard, useCharacterImage, aspectRatio, withVoice, voiceLanguage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 初始加载：先尝试从本地缓存读取，没有缓存则用 smart_combine 快速生成
  useEffect(() => {
    if (!loading && scene && !promptEn && sceneId) {
      const loadFromCacheOrGenerate = async () => {
        try {
          const cached = await getScenePromptCache(sceneId);
          if (cached && cached.promptEn) {
            // 从缓存恢复
            setPromptEn(cached.promptEn);
            setPromptZh(cached.promptZh || '');
            setOriginalPromptEn(cached.promptEn);
            setZhEdited(false);
            if (cached.promptType) {
              setPromptType(cached.promptType as 'smart_combine' | 'ai_optimized');
            }
            if (cached.aspectRatio) {
              setAspectRatio(cached.aspectRatio);
            }
            setUseStoryboard(cached.useStoryboard);
            setUseCharacterImage(cached.useCharacterImage);
            setWithVoice(cached.withVoice !== false);
            setVoiceLanguage(cached.voiceLanguage || 'zh');
            setCharacterInfo({
              characterId: cached.characterId,
              characterName: cached.characterName,
              digitalHumanId: cached.digitalHumanId,
              referenceImage: cached.referenceImage,
              imageSource: cached.imageSource,
            });
          } else {
            // 没有缓存，用 smart_combine 快速生成
            loadPrompt('smart_combine');
          }
        } catch {
          // 缓存读取失败，降级生成
          loadPrompt('smart_combine');
        }
      };
      loadFromCacheOrGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, scene]);

  // 解析角色图片本地路径
  useEffect(() => {
    const digitalHumanId = characterInfo.digitalHumanId;
    if (!digitalHumanId) {
      setLocalImageUrl(characterInfo.referenceImage || '');
      return;
    }
    const resolve = async () => {
      try {
        const status = await window.electron.resources.getStatus('digital_human', digitalHumanId);
        if (status && status.status === 'completed' && status.localPath) {
          setLocalImageUrl(`local-resource://${status.localPath}`);
        } else {
          setLocalImageUrl(characterInfo.referenceImage || '');
        }
      } catch {
        setLocalImageUrl(characterInfo.referenceImage || '');
      }
    };
    resolve();
  }, [characterInfo.digitalHumanId, characterInfo.referenceImage]);

  // 同步中文到英文
  const handleTranslateToEn = async () => {
    if (!id || !scriptId || !sceneId || !promptZh) return;
    try {
      setTranslating(true);
      const translated = await translatePrompt(id, promptZh, 'zh-en');
      setPromptEn(translated);
      setZhEdited(false);

      // 更新本地缓存
      await saveScenePromptCache({
        sceneId,
        projectId: id,
        scriptId,
        promptEn: translated,
        promptZh,
        promptType,
        useStoryboard,
        useCharacterImage,
        aspectRatio,
        characterId: characterInfo.characterId,
        characterName: characterInfo.characterName,
        digitalHumanId: characterInfo.digitalHumanId,
        referenceImage: characterInfo.referenceImage,
        imageSource: characterInfo.imageSource,
        withVoice,
        voiceLanguage,
      });
    } catch (err: any) {
      console.error('Translate error:', err);
      setError('翻译失败，请重试');
    } finally {
      setTranslating(false);
    }
  };

  // 开始生成视频
  const handleGenerate = async () => {
    if (!id || !scriptId || !sceneId || !scene) return;
    try {
      setGenerating(true);

      // 如果开启了角色形象作为参考图，检查图片 URL 可用性并按需上传
      let validReferenceImage = characterInfo.referenceImage;
      if (useCharacterImage && characterInfo.referenceImage) {
        try {
          // 解析本地文件路径（localImageUrl 可能是 local-resource:// 格式）
          const localPath = localImageUrl?.startsWith('local-resource://')
            ? decodeURIComponent(localImageUrl.slice('local-resource://'.length))
            : undefined;

          validReferenceImage = await ensureReferenceImageAccessible(
            characterInfo.referenceImage,
            localPath
          );
        } catch (err) {
          console.error('参考图片上传失败:', err);
          setError('参考图片上传失败，请检查供应商上传配置');
          setGenerating(false);
          return;
        }
      }

      // 保存快照到本地
      const snapshot: GenerationSnapshot = {
        id: crypto.randomUUID(),
        projectId: id,
        scriptId,
        sceneId,
        originalPrompt: originalPromptEn,
        finalPrompt: promptEn,
        promptType,
        useStoryboard,
        useCharacterImage,
        aspectRatio,
        characterId: characterInfo.characterId,
        characterName: characterInfo.characterName,
        digitalHumanId: characterInfo.digitalHumanId,
        referenceImage: validReferenceImage || characterInfo.referenceImage,
        sceneContent: JSON.stringify(scene.content),
        createdAt: new Date().toISOString(),
      };
      await saveGenerationSnapshot(snapshot);

      // 调用生成 API（始终使用英文 prompt）
      await generateSceneVideo(id, scriptId, sceneId, {
        promptType,
        useStoryboard,
        useCharacterImage,
        aspectRatio,
        customPrompt: promptEn,
        referenceImage: useCharacterImage ? validReferenceImage : undefined,
      });

      // 跳转回视频列表页
      navigate(`/projects/${id}/script/${scriptId}/scenes/${sceneId}/videos`);
    } catch (err: any) {
      setError(err.response?.data?.error || '生成视频失败');
      setGenerating(false);
    }
  };

  // 获取场景内容
  const content = scene?.content as SceneContent | undefined;

  // 获取主角信息
  const mainCharacter = characters.find(
    (c) => c.id === content?.characterId
  );

  // 获取其他角色
  const otherChars = (content?.characters || [])
    .map((oc: any) => {
      const char = characters.find((c) => c.id === oc.characterId);
      return char ? { ...char, role: oc.role } : null;
    })
    .filter(Boolean) as (ProjectCharacter & { role: string })[];

  // 按角色分组台词
  const getDialoguesForCharacter = (charId: string) =>
    (content?.dialogues || []).filter((d) => d.characterId === charId);

  // 镜头标签
  const cameraTags: string[] = [];
  if (content?.camera) {
    if (content.camera.shotSize) cameraTags.push(content.camera.shotSize);
    if (content.camera.type) cameraTags.push(content.camera.type);
    if (content.camera.movement) cameraTags.push(content.camera.movement);
  }
  if (content?.visual) {
    if (content.visual.lighting) cameraTags.push(content.visual.lighting);
    if (content.visual.mood) cameraTags.push(content.visual.mood);
  }

  if (loading) {
    return (
      <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <>
      <div className="max-w-[1920px] mx-auto px-6 lg:px-8 xl:px-12 py-6">
        {/* 面包屑导航 */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <button
            onClick={() =>
              navigate(
                `/projects/${id}/script/${scriptId}/scenes/${sceneId}/videos`
              )
            }
            className="flex items-center gap-1 hover:text-purple-600 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <span>/</span>
          <button
            onClick={() => navigate(`/projects/${id}/script/${scriptId}`)}
            className="hover:text-purple-600 cursor-pointer transition-colors"
          >
            {script?.title}
          </button>
          <span>/</span>
          <button
            onClick={() => navigate(`/projects/${id}/script/${scriptId}/scenes/${sceneId}/videos`)}
            className="hover:text-purple-600 cursor-pointer transition-colors"
          >
            场景视频
          </button>
          <span>/</span>
          <span className="text-slate-900 font-medium">生成视频</span>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-4">
            {error}
            <button
              onClick={() => setError('')}
              className="ml-2 underline"
            >
              关闭
            </button>
          </div>
        )}

        {/* 左右分栏 */}
        <div className="flex gap-6">
          {/* 左侧 — 场景信息 */}
          <div className="w-[40%] space-y-4">
            {/* 卡片1: 角色与表演 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                角色与表演
                <InfoTip text="这个场景里出场的角色，以及他们的动作和台词" />
              </h3>

              {/* 主要角色 */}
              {mainCharacter ? (
                <div className="border border-purple-100 bg-purple-50/30 rounded-lg p-4 mb-3">
                  <div className="flex items-center gap-3 mb-3">
                    {localImageUrl ? (
                      <img
                        src={localImageUrl}
                        alt={mainCharacter.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-purple-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-purple-500" />
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-slate-900">
                        {mainCharacter.name}
                      </span>
                      <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full">
                        主角
                      </span>
                      {characterInfo.imageSource && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          来源:{' '}
                          {characterInfo.imageSource === 'digital_human'
                            ? '数字人形象'
                            : '角色头像'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 动作 */}
                  {content?.actions && (
                    <div className="space-y-1 text-sm text-slate-600 mb-3">
                      {content.actions.entrance && (
                        <div>
                          <span className="text-slate-400">入场<InfoTip text="角色怎么出现在画面里" />:</span>{' '}
                          {content.actions.entrance}
                        </div>
                      )}
                      {content.actions.main && (
                        <div>
                          <span className="text-slate-400">动作<InfoTip text="角色在场景中做什么" />:</span>{' '}
                          {content.actions.main}
                        </div>
                      )}
                      {content.actions.exit && (
                        <div>
                          <span className="text-slate-400">出场<InfoTip text="角色怎么离开画面" />:</span>{' '}
                          {content.actions.exit}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 主角台词 */}
                  {getDialoguesForCharacter(mainCharacter.id).length > 0 && (
                    <div className="space-y-1">
                      {getDialoguesForCharacter(mainCharacter.id).map(
                        (d, i) => (
                          <div
                            key={i}
                            className="text-sm text-slate-700 italic flex items-start gap-1"
                          >
                            <MessageSquare className="w-3 h-3 mt-1 text-purple-400 shrink-0" />
                            "{d.text}"
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-400 italic p-3 border border-dashed border-slate-200 rounded-lg">
                  未关联角色
                </div>
              )}

              {/* 其他角色 */}
              {otherChars.map((char) => (
                <div
                  key={char.id}
                  className="border border-slate-100 rounded-lg p-3 mb-2"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {char.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({char.role})
                    </span>
                  </div>
                  {getDialoguesForCharacter(char.id).map((d, i) => (
                    <div
                      key={i}
                      className="text-sm text-slate-600 italic ml-9"
                    >
                      "{d.text}"
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* 卡片2: 场景描述 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                场景描述
                <InfoTip text="这个场景讲了什么，发生在哪里" />
              </h3>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-medium text-slate-900">
                  {scene?.title}
                </span>
                {scene?.duration && (
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                    {scene.duration}s
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {content?.description || '暂无描述'}
              </p>
            </div>

            {/* 卡片3: 镜头 & 视觉 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4" />
                镜头 & 视觉
                <InfoTip text="拍摄角度、镜头运动和画面风格" />
              </h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {cameraTags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {content?.camera?.description && (
                <p className="text-sm text-slate-500 mt-2">
                  {content.camera.description}
                </p>
              )}
              {content?.visual?.description && (
                <p className="text-sm text-slate-500">
                  {content.visual.description}
                </p>
              )}
            </div>

            {/* 编辑场景链接 */}
            <button
              onClick={() =>
                navigate(
                  `/projects/${id}/script/${scriptId}/scenes/${sceneId}/edit`
                )
              }
              className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              编辑场景 →
            </button>
          </div>

          {/* 右侧 — 提示词与生成 */}
          <div className="w-[60%] space-y-4">
            {/* 提示词区域 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    视频提示词
                    <InfoTip text="发给 AI 的指令，告诉它生成什么样的视频。你可以手动修改" />
                  </h3>
                  {/* 中/英切换 */}
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setPromptLang('zh')}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${promptLang === 'zh'
                        ? 'bg-white text-slate-900 shadow-sm font-medium'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      中文
                    </button>
                    <button
                      onClick={() => setPromptLang('en')}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${promptLang === 'en'
                        ? 'bg-white text-slate-900 shadow-sm font-medium'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      English
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => loadPrompt()}
                  disabled={promptLoading}
                  className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${promptLoading ? 'animate-spin' : ''}`}
                  />
                  重新生成
                </button>
              </div>
              {/* 声音控制栏 */}
              <div className="flex items-center gap-4 mb-3 px-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWithVoice(!withVoice)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${withVoice
                      ? 'border-purple-200 bg-purple-50 text-purple-700'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                  >
                    {withVoice ? (
                      <Volume2 className="w-3.5 h-3.5" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5" />
                    )}
                    {withVoice ? '有声音' : '无声音'}
                  </button>
                </div>
                {withVoice && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">语音:</span>
                    <select
                      value={voiceLanguage}
                      onChange={(e) => setVoiceLanguage(e.target.value as 'zh' | 'en')}
                      className="text-xs border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="zh">中文</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                )}
              </div>
              {promptLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
                </div>
              ) : (
                <>
                  {promptLang === 'zh' ? (
                    <textarea
                      value={promptZh}
                      onChange={(e) => {
                        setPromptZh(e.target.value);
                        setZhEdited(true);
                      }}
                      rows={8}
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-700 resize-y focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder={promptZh ? undefined : '中文提示词暂无，切换到英文查看'}
                    />
                  ) : (
                    <textarea
                      value={promptEn}
                      onChange={(e) => setPromptEn(e.target.value)}
                      rows={8}
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-700 resize-y focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="提示词将自动生成..."
                    />
                  )}
                  {/* 中文编辑后的同步提示 */}
                  {zhEdited && (
                    <div className="flex items-center justify-between mt-2 px-1">
                      <span className="text-xs text-amber-600">
                        中文已修改，英文版本尚未同步
                      </span>
                      <button
                        onClick={handleTranslateToEn}
                        disabled={translating}
                        className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 disabled:opacity-50"
                      >
                        {translating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Languages className="w-3 h-3" />
                        )}
                        {translating ? '翻译中...' : '同步到英文'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 生成选项 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">
                生成选项
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">
                    宽高比
                    <InfoTip text="视频画面的比例，横屏选 16:9，竖屏选 9:16" />
                  </label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    disabled={useCharacterImage && !!characterInfo.referenceImage}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="16:9">16:9 横屏</option>
                    <option value="9:16">9:16 竖屏</option>
                    <option value="1:1">1:1 方形</option>
                    <option value="4:3">4:3</option>
                    <option value="3:4">3:4</option>
                  </select>
                  {useCharacterImage && characterInfo.referenceImage && (
                    <p className="text-xs text-slate-400 mt-1">
                      使用角色形象时宽高比锁定
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">
                    时长
                    <InfoTip text="视频长度，根据场景时长自动选 10s 或 15s" />
                  </label>
                  <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 bg-slate-50">
                    {finalDuration}s
                    <span className="text-xs text-slate-400 ml-1">
                      (场景 {sceneDuration}s → 自动适配)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 高级设置 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-4 text-sm text-slate-600 hover:text-slate-900"
              >
                <span>高级设置</span>
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {showAdvanced && (
                <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
                  {/* 提示词类型 */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-2">
                      提示词类型
                      <InfoTip text="智能组合：直接拼接场景信息；AI 优化：让 AI 润色提示词" />
                    </label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="promptType"
                          checked={promptType === 'smart_combine'}
                          onChange={() => setPromptType('smart_combine')}
                          className="accent-purple-600"
                        />
                        <span className="text-sm text-slate-700">
                          智能组合
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="promptType"
                          checked={promptType === 'ai_optimized'}
                          onChange={() => setPromptType('ai_optimized')}
                          className="accent-purple-600"
                        />
                        <span className="text-sm text-slate-700">
                          AI 优化
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* 故事板格式 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">
                      故事板格式
                      <InfoTip text="开启后提示词会按时间轴分段描述，适合复杂场景" />
                    </span>
                    <button
                      onClick={() => setUseStoryboard(!useStoryboard)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${useStoryboard ? 'bg-purple-600' : 'bg-slate-200'
                        }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${useStoryboard ? 'translate-x-5' : ''
                          }`}
                      />
                    </button>
                  </div>

                  {/* 角色形象 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">
                      角色形象作为参考图
                      <InfoTip text="把角色照片一起发给 AI，让生成的人物更像角色" />
                    </span>
                    <button
                      onClick={() =>
                        setUseCharacterImage(!useCharacterImage)
                      }
                      className={`relative w-10 h-5 rounded-full transition-colors ${useCharacterImage ? 'bg-purple-600' : 'bg-slate-200'
                        }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${useCharacterImage ? 'translate-x-5' : ''
                          }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 生成按钮 */}
            <button
              onClick={handleGenerate}
              disabled={generating || promptLoading || !promptEn}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  开始生成视频
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
