import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, Plus, Trash2, MessageSquare, Settings2, X, Loader2, Bot, User,
  Edit2, Check, Copy, Download, FolderOpen, CheckCircle2,
  ChevronDown, Sparkles, Image, Video, Music, Star, Layers,
} from 'lucide-react';
import { AiToolType, AiToolConfig, ChatConversation, ChatMessage } from '../types';
import { getAiToolConfigs } from '../services/aiTool';
import {
  saveChatConversation,
  getChatConversations,
  deleteChatConversation,
  updateChatConversationTitle,
  saveChatMessage,
  getChatMessages,
  sendChatMessage,
  onChatStreamChunk,
} from '../services/chatService';
import { showToast } from '../components/ui/mini-toast';

// 从 Markdown 内容中提取资源 URL
function extractResourceUrls(content: string): { url: string; type: 'image' | 'video' | 'audio' }[] {
  const resources: { url: string; type: 'image' | 'video' | 'audio' }[] = [];
  // Markdown 图片: ![alt](url)
  const imgRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    const url = match[1];
    if (/\.(mp4|mov|avi|webm|mkv)$/i.test(url)) {
      resources.push({ url, type: 'video' });
    } else if (/\.(mp3|wav|ogg|flac)$/i.test(url)) {
      resources.push({ url, type: 'audio' });
    } else {
      resources.push({ url, type: 'image' });
    }
  }
  // 也检测纯 URL 行（以 http 开头，以资源扩展名结尾）
  const urlLineRegex = /(?:^|\s)(https?:\/\/[^\s]+?(?:\.(?:jpg|jpeg|png|gif|webp|mp4|mov|webm|mp3|wav)))(?:\s|$)/gim;
  while ((match = urlLineRegex.exec(content)) !== null) {
    const url = match[1];
    if (!resources.some((r) => r.url === url)) {
      if (/\.(mp4|mov|webm)$/i.test(url)) {
        resources.push({ url, type: 'video' });
      } else if (/\.(mp3|wav)$/i.test(url)) {
        resources.push({ url, type: 'audio' });
      } else {
        resources.push({ url, type: 'image' });
      }
    }
  }
  return resources;
}

const TOOL_TYPE_LABELS: Record<AiToolType, string> = {
  text_chat: '对话',
  image_gen: '图片',
  video_gen: '视频',
  music_gen: '音乐',
};

const TOOL_TYPE_ICONS: Record<AiToolType, typeof Sparkles> = {
  text_chat: Sparkles,
  image_gen: Image,
  video_gen: Video,
  music_gen: Music,
};

export default function AiChat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = (searchParams.get('type') as AiToolType) || null;

  // 模型配置
  const [allConfigs, setAllConfigs] = useState<AiToolConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');

  // 对话
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // 输入
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const streamContentRef = useRef('');

  // 高级配置
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);

  // 图片预览
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 模型选择面板
  const [showModelPanel, setShowModelPanel] = useState(false);
  const modelPanelRef = useRef<HTMLDivElement>(null);

  // 对话列表类型筛选 (null = 全部)
  const [filterToolType, setFilterToolType] = useState<AiToolType | null>(initialType);

  // 编辑标题
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const skipMessageReloadRef = useRef(false);

  // 消息保存状态: messageId -> 'saving' | 'saved'
  const [savingStates, setSavingStates] = useState<Record<string, 'saving' | 'saved'>>({});

  // 加载模型配置
  useEffect(() => {
    getAiToolConfigs().then((configs) => {
      setAllConfigs(configs);
      // 预选当前类型的默认模型（优先筛选类型，否则选全局默认）
      const targetType = initialType || 'text_chat';
      const defaultConfig = configs.find((c) => c.toolType === targetType && c.isDefault)
        || configs.find((c) => c.toolType === targetType)
        || configs.find((c) => c.isDefault)
        || configs[0];
      if (defaultConfig) setSelectedConfigId(defaultConfig.id);
    });
  }, [initialType]);

  // URL type 参数变化时同步 filterToolType
  useEffect(() => {
    const urlType = searchParams.get('type') as AiToolType | null;
    setFilterToolType(urlType);
  }, [searchParams]);

  // filterToolType 变化时同步 URL
  const handleFilterChange = (type: AiToolType | null) => {
    setFilterToolType(type);
    if (type) {
      setSearchParams({ type }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  // 加载对话列表
  useEffect(() => {
    getChatConversations().then(setConversations);
  }, []);

  // 首次加载时自动选中第一个对话
  useEffect(() => {
    if (conversations.length > 0 && !activeConvId) {
      setActiveConvId(conversations[0].id);
    }
  }, [conversations, activeConvId]);

  // 切换对话时加载消息
  useEffect(() => {
    if (skipMessageReloadRef.current) {
      skipMessageReloadRef.current = false;
      return;
    }
    if (activeConvId) {
      getChatMessages(activeConvId).then((msgs) => {
        setMessages(msgs);
        setTimeout(() => inputRef.current?.focus(), 100);
      });
    } else {
      setMessages([]);
    }
  }, [activeConvId]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 点击外部关闭模型面板
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelPanelRef.current && !modelPanelRef.current.contains(e.target as Node)) {
        setShowModelPanel(false);
      }
    };
    if (showModelPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModelPanel]);

  const selectedConfig = allConfigs.find((c) => c.id === selectedConfigId);

  // 按类型分组模型
  const groupedConfigs = allConfigs.reduce<Record<string, AiToolConfig[]>>((acc, c) => {
    if (!acc[c.toolType]) acc[c.toolType] = [];
    acc[c.toolType].push(c);
    return acc;
  }, {});

  // 新建对话
  const handleNewConversation = useCallback(async () => {
    const now = new Date().toISOString();
    const conv: ChatConversation = {
      id: crypto.randomUUID(),
      title: '新对话',
      modelConfigId: selectedConfigId || null,
      toolType: selectedConfig?.toolType || initialType || 'text_chat',
      createdAt: now,
      updatedAt: now,
    };
    await saveChatConversation(conv);
    setConversations((prev) => [conv, ...prev]);
    setActiveConvId(conv.id);
    setMessages([]);
    setInput('');
  }, [selectedConfigId, selectedConfig, initialType]);

  // 删除对话
  const handleDeleteConversation = async (convId: string) => {
    await deleteChatConversation(convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConvId === convId) {
      setActiveConvId(null);
      setMessages([]);
    }
  };

  // 保存标题编辑
  const handleSaveTitle = async (convId: string) => {
    if (!editingTitle.trim()) return;
    await updateChatConversationTitle(convId, editingTitle.trim());
    setConversations((prev) =>
      prev.map((c) => c.id === convId ? { ...c, title: editingTitle.trim() } : c)
    );
    setEditingTitleId(null);
  };

  // 发送消息
  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming || !selectedConfig) return;

    let convId = activeConvId;

    // 如果没有活跃对话，自动创建
    if (!convId) {
      const now = new Date().toISOString();
      const conv: ChatConversation = {
        id: crypto.randomUUID(),
        title: text.slice(0, 20) + (text.length > 20 ? '...' : ''),
        modelConfigId: selectedConfigId,
        toolType: selectedConfig.toolType,
        createdAt: now,
        updatedAt: now,
      };
      await saveChatConversation(conv);
      setConversations((prev) => [conv, ...prev]);
      convId = conv.id;
      skipMessageReloadRef.current = true;
      setActiveConvId(convId);
    }

    // 保存用户消息
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      conversationId: convId,
      role: 'user',
      content: text,
      modelName: null,
      createdAt: new Date().toISOString(),
    };
    await saveChatMessage(userMsg);
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // 准备 AI 回复占位
    const assistantMsgId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      conversationId: convId,
      role: 'assistant',
      content: '',
      modelName: selectedConfig.modelName || selectedConfig.name,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setIsStreaming(true);
    streamContentRef.current = '';

    // 监听流式响应
    const unsubscribe = onChatStreamChunk((chunk) => {
      if (chunk.type === 'delta' && chunk.content) {
        streamContentRef.current += chunk.content;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: streamContentRef.current }
              : m
          )
        );
      } else if (chunk.type === 'done') {
        setIsStreaming(false);
        // 保存完整的 AI 回复
        saveChatMessage({
          ...assistantMsg,
          content: streamContentRef.current,
        });
        unsubscribe();
      } else if (chunk.type === 'error') {
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: `❌ 错误: ${chunk.error}` }
              : m
          )
        );
        unsubscribe();
      }
    });

    // 构建历史消息
    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    sendChatMessage({
      baseUrl: selectedConfig.baseUrl,
      apiKey: selectedConfig.apiKey,
      model: selectedConfig.modelName || 'gpt-3.5-turbo',
      messages: history,
      temperature,
      maxTokens,
      conversationId: convId,
      modelConfigId: selectedConfigId,
      toolType: selectedConfig.toolType,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 复制消息内容
  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showToast('已复制到剪贴板');
    } catch {
      showToast('复制失败', 'error');
    }
  };

  // 保存资源到本地（默认路径或自定义路径）
  const handleSaveResources = async (msg: ChatMessage, customPath?: string) => {
    const resources = extractResourceUrls(msg.content);
    if (resources.length === 0) return;

    setSavingStates((prev) => ({ ...prev, [msg.id]: 'saving' }));

    try {
      let updatedContent = msg.content;
      let allSuccess = true;

      for (const resource of resources) {
        const resourceId = crypto.randomUUID();
        const result = await window.electron.resources.download({
          url: resource.url,
          resourceType: 'chat_resource',
          resourceId,
          conversationId: msg.conversationId,
          ...(customPath ? { customSavePath: customPath } : {}),
        });

        if (result.success && result.localPath) {
          // 替换远程 URL 为本地路径
          const localUrl = `local-resource://${result.localPath}`;
          updatedContent = updatedContent.replace(resource.url, localUrl);
        } else {
          allSuccess = false;
        }
      }

      if (allSuccess) {
        // 更新消息内容到数据库
        await saveChatMessage({ ...msg, content: updatedContent });
        // 更新 UI
        setMessages((prev) =>
          prev.map((m) => m.id === msg.id ? { ...m, content: updatedContent } : m)
        );
        setSavingStates((prev) => ({ ...prev, [msg.id]: 'saved' }));
        showToast('资源已保存到本地');
      } else {
        setSavingStates((prev) => { const s = { ...prev }; delete s[msg.id]; return s; });
        showToast('部分资源保存失败', 'error');
      }
    } catch (error) {
      console.error('Save resources error:', error);
      setSavingStates((prev) => { const s = { ...prev }; delete s[msg.id]; return s; });
      showToast('保存失败', 'error');
    }
  };

  // 另存为
  const handleSaveAs = async (msg: ChatMessage) => {
    try {
      const selectedPath = await window.electron.storage.selectFolder();
      if (selectedPath) {
        await handleSaveResources(msg, selectedPath);
      }
    } catch (error) {
      console.error('Save as error:', error);
      showToast('另存为失败', 'error');
    }
  };

  // 对话列表按时间分组（支持类型筛选）
  const groupConversations = () => {
    const filtered = filterToolType
      ? conversations.filter((c) => c.toolType === filterToolType)
      : conversations;
    const today: ChatConversation[] = [];
    const yesterday: ChatConversation[] = [];
    const earlier: ChatConversation[] = [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);

    for (const conv of filtered) {
      const d = new Date(conv.updatedAt);
      if (d >= todayStart) today.push(conv);
      else if (d >= yesterdayStart) yesterday.push(conv);
      else earlier.push(conv);
    }
    return { today, yesterday, earlier, filteredCount: filtered.length };
  };

  const { today, yesterday, earlier, filteredCount } = groupConversations();

  const renderConvGroup = (label: string, convs: ChatConversation[]) => {
    if (convs.length === 0) return null;
    return (
      <div key={label}>
        <div className="text-xs text-slate-400 px-3 py-1.5 font-medium">{label}</div>
        {convs.map((conv) => (
          <div
            key={conv.id}
            className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              activeConvId === conv.id ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
            }`}
            onClick={() => setActiveConvId(conv.id)}
          >
            {(() => { const TypeIcon = TOOL_TYPE_ICONS[conv.toolType] || MessageSquare; return <TypeIcon className="w-4 h-4 flex-shrink-0" />; })()}
            {editingTitleId === conv.id ? (
              <div className="flex-1 flex items-center gap-1">
                <input
                  className="flex-1 text-sm bg-white border border-slate-300 rounded px-1.5 py-0.5"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle(conv.id)}
                  autoFocus
                />
                <button onClick={() => handleSaveTitle(conv.id)} className="text-green-500 hover:text-green-700">
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="flex-1 text-sm truncate">{conv.title}</span>
            )}
            <div className="hidden group-hover:flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setEditingTitleId(conv.id); setEditingTitle(conv.title); }}
                className="p-0.5 text-slate-400 hover:text-slate-600"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                className="p-0.5 text-slate-400 hover:text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex">
      {/* 左侧：对话历史 */}
      <div className="w-64 flex-shrink-0 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-3">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            新对话
          </button>
        </div>

        {/* 类型筛选栏 */}
        <div className="flex items-center gap-1 px-3 pb-2">
          <button
            onClick={() => handleFilterChange(null)}
            title="全部"
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors cursor-pointer ${
              filterToolType === null
                ? 'bg-blue-100 text-blue-600'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>
          {(Object.keys(TOOL_TYPE_LABELS) as AiToolType[]).map((type) => {
            const Icon = TOOL_TYPE_ICONS[type];
            return (
              <button
                key={type}
                onClick={() => handleFilterChange(type)}
                title={TOOL_TYPE_LABELS[type]}
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors cursor-pointer ${
                  filterToolType === type
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {renderConvGroup('今天', today)}
          {renderConvGroup('昨天', yesterday)}
          {renderConvGroup('更早', earlier)}
          {filteredCount === 0 && (
            <div className="text-center text-slate-400 text-sm py-8">
              {conversations.length === 0 ? '暂无对话' : '该类型暂无对话'}
            </div>
          )}
        </div>
      </div>

      {/* 右侧：对话主区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-200 bg-white">
          <div className="relative flex-1" ref={modelPanelRef}>
            <button
              onClick={() => setShowModelPanel(!showModelPanel)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer text-sm"
            >
              {selectedConfig ? (
                <>
                  {(() => { const Icon = TOOL_TYPE_ICONS[selectedConfig.toolType]; return <Icon className="w-4 h-4 text-blue-500" />; })()}
                  <span className="font-medium text-slate-700">{selectedConfig.name}</span>
                  {selectedConfig.modelName && (
                    <span className="text-slate-400">{selectedConfig.modelName}</span>
                  )}
                </>
              ) : (
                <span className="text-slate-400">选择模型</span>
              )}
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showModelPanel ? 'rotate-180' : ''}`} />
            </button>

            {/* 模型选择 Popover */}
            {showModelPanel && (
              <div className="absolute top-full left-0 mt-2 w-[420px] bg-white rounded-xl border border-slate-200 shadow-lg z-20 overflow-hidden">
                <div className="p-3 max-h-80 overflow-y-auto space-y-4">
                  {allConfigs.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-6">
                      请先在 AI 模型配置中添加模型
                    </div>
                  ) : (
                    (Object.keys(TOOL_TYPE_LABELS) as AiToolType[]).map((type) => {
                      const configs = groupedConfigs[type];
                      if (!configs || configs.length === 0) return null;
                      const Icon = TOOL_TYPE_ICONS[type];
                      return (
                        <div key={type}>
                          <div className="flex items-center gap-1.5 mb-2 px-1">
                            <Icon className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{TOOL_TYPE_LABELS[type]}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {configs.map((config) => (
                              <button
                                key={config.id}
                                onClick={() => {
                                  setSelectedConfigId(config.id);
                                  setShowModelPanel(false);
                                }}
                                className={`flex flex-col items-start gap-1 p-3 rounded-lg border transition-all cursor-pointer text-left ${
                                  selectedConfigId === config.id
                                    ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
                                    : 'border-slate-150 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <span className={`text-sm font-medium truncate ${
                                    selectedConfigId === config.id ? 'text-blue-700' : 'text-slate-700'
                                  }`}>{config.name}</span>
                                  {config.isDefault && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                                </div>
                                {config.modelName && (
                                  <span className="text-xs text-slate-400 truncate w-full">{config.modelName}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer ${
              showAdvanced ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            高级配置
          </button>
        </div>

        {/* 高级配置面板 */}
        {showAdvanced && (
          <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Temperature:</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-slate-500 w-8">{temperature}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Max Tokens:</label>
              <input
                type="number"
                min="1"
                max="128000"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)}
                className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
              />
            </div>
            <button
              onClick={() => setShowAdvanced(false)}
              className="ml-auto p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && !activeConvId && (
            <div className="flex-1 flex flex-col items-center justify-center h-full text-slate-400">
              <Bot className="w-16 h-16 mb-4 text-slate-300" />
              <p className="text-lg font-medium mb-1">开始一段新对话</p>
              <p className="text-sm">选择模型后输入消息即可开始</p>
            </div>
          )}
          {messages.map((msg) => {
            const isAssistant = msg.role === 'assistant';
            const hasContent = !!msg.content;
            const resources = isAssistant && hasContent ? extractResourceUrls(msg.content) : [];
            const hasResources = resources.length > 0;
            const saveState = savingStates[msg.id];
            const isAlreadySaved = hasContent && msg.content.includes('local-resource://');

            return (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {isAssistant && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-blue-600" />
                </div>
              )}
              <div className={`max-w-[70%] ${isAssistant ? '' : ''}`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white whitespace-pre-wrap'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {isAssistant ? (
                    hasContent ? (
                      <div className="prose prose-sm prose-slate max-w-none prose-p:my-1 prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-code:text-pink-600 prose-code:before:content-none prose-code:after:content-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          urlTransform={(url) => {
                            if (url.startsWith('local-resource://')) return url;
                            return defaultUrlTransform(url);
                          }}
                          components={{
                            img: ({ src, alt }) => (
                              <img
                                src={src}
                                alt={alt || ''}
                                className="max-w-[240px] max-h-[180px] w-auto h-auto rounded-lg cursor-pointer hover:opacity-80 transition-opacity object-contain"
                                onClick={() => src && setPreviewImage(src)}
                              />
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : ''
                    )
                  ) : (
                    msg.content
                  )}
                </div>
                {/* AI 消息操作栏 */}
                {isAssistant && hasContent && (
                  <div className="flex items-center gap-3 mt-1.5 ml-1">
                    <button
                      onClick={() => handleCopyMessage(msg.content)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>复制</span>
                    </button>
                    {hasResources && (
                      <>
                        {(saveState === 'saved' || isAlreadySaved) && (
                          <span className="flex items-center gap-1 text-xs text-green-500">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>已保存</span>
                          </span>
                        )}
                        <button
                          onClick={() => handleSaveResources(msg)}
                          disabled={saveState === 'saving'}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {saveState === 'saving' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>{saveState === 'saving' ? '保存中...' : '保存'}</span>
                        </button>
                        <button
                          onClick={() => handleSaveAs(msg)}
                          disabled={saveState === 'saving'}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>另存为</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-slate-600" />
                </div>
              )}
            </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedConfig ? '输入消息...' : '请先选择模型'}
              disabled={!selectedConfig || isStreaming}
              rows={1}
              className="flex-1 resize-none px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400 max-h-32 overflow-y-auto"
              style={{ minHeight: '44px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming || !selectedConfig}
              className="flex items-center justify-center w-11 h-11 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex-shrink-0"
            >
              {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 图片预览 Lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImage}
              alt="预览"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
