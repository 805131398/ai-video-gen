import { useEffect, useState, useMemo, useRef } from 'react';
import {
    Wrench, Plus, Star, Edit2, Trash2, X, Eye, EyeOff,
    MessageSquare, Image, Video, Music, ChevronRight, Zap, Loader2,
} from 'lucide-react';
import { AiToolConfig, AiToolType, VideoGenConfig, ParamField, ResponseField } from '../../types';
import {
    getAiToolConfigs,
    saveAiToolConfig,
    deleteAiToolConfig,
    setDefaultAiToolConfig,
} from '../../services/aiTool';

// 工具类型定义
const TOOL_TYPES: { type: AiToolType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { type: 'text_chat', label: '文本对话', icon: MessageSquare },
    { type: 'image_gen', label: '图片生成', icon: Image },
    { type: 'video_gen', label: '视频生成', icon: Video },
    { type: 'music_gen', label: '音乐生成', icon: Music },
];

// 供应商（统一 OpenAI 兼容协议）
const PROVIDER_PRESETS: Record<string, { label: string; baseUrl: string }> = {
    openai_compatible: { label: 'OpenAI 兼容', baseUrl: 'https://api.openai.com/v1' },
};

// 空表单
const EMPTY_FORM = {
    name: '',
    provider: 'openai_compatible',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    modelName: '',
    description: '',
};

// Sora 视频生成预设
const SORA_DEFAULT_VIDEO_CONFIG: VideoGenConfig = {
    endpoints: {
        generate: {
            path: '/videos/generations',
            method: 'POST',
            params: [
                { key: 'model', label: '模型', value: 'sora-2', type: 'select', options: ['sora-2', 'sora-2-pro', 'sora-2-vip'], required: true, remark: '标准版/专业版/VIP版' },
                { key: 'duration', label: '视频时长(秒)', value: 10, type: 'select', options: [10, 15, 25], remark: 'sora-2 仅支持 10/15 秒' },
                { key: 'aspect_ratio', label: '宽高比', value: '16:9', type: 'select', options: ['16:9', '9:16'] },
                { key: 'thumbnail', label: '生成缩略图', value: true, type: 'boolean' },
                { key: 'metadata.n', label: '生成数量', value: 1, type: 'select', options: [1, 2, 3, 4], remark: '1-4 个变体' },
                { key: 'metadata.watermark', label: '水印', value: false, type: 'boolean' },
                { key: 'metadata.hd', label: '高清模式', value: false, type: 'boolean', remark: '需 sora-2-pro 且时长非 25 秒' },
                { key: 'metadata.private', label: '隐私模式', value: false, type: 'boolean', remark: '视频不会被发布' },
                { key: 'metadata.style', label: '视频风格', value: '', type: 'select', options: ['', 'anime', 'comic', 'news', 'selfie', 'nostalgic', 'thanksgiving'], remark: '留空表示无风格' },
                { key: 'metadata.storyboard', label: '故事板', value: false, type: 'boolean' },
            ],
            responseMapping: [
                { key: 'taskId', label: '任务ID', path: 'id', remark: '用于后续查询任务状态' },
            ],
        },
        status: {
            path: '/videos/{taskId}',
            method: 'GET',
            params: [],
            responseMapping: [
                { key: 'status', label: '任务状态', path: 'status', remark: '如 completed, pending, failed' },
                { key: 'videoUrl', label: '视频地址', path: 'output.video_url' },
                { key: 'thumbnailUrl', label: '缩略图地址', path: 'output.thumbnail_url' },
            ],
        },
        upload: {
            path: '/uploads',
            method: 'POST',
            params: [
                { key: 'file', label: '图片文件', value: '', type: 'file', required: true, remark: '支持 jpg/png 等常见图片格式' },
            ],
            responseMapping: [
                { key: 'imageUrl', label: '图片地址', path: 'url', remark: '上传后的图片 URL，用于图生视频' },
            ],
        },
    },
};

// 接口标签
const ENDPOINT_LABELS: Record<string, string> = {
    generate: '生成接口',
    status: '状态查询',
    upload: '图片上传',
};

// 空参数模板
const EMPTY_PARAM: ParamField = { key: '', label: '', value: '', type: 'string' };

// 参数类型选项
const PARAM_TYPES: { value: ParamField['type']; label: string }[] = [
    { value: 'string', label: '字符串' },
    { value: 'number', label: '数字' },
    { value: 'boolean', label: '布尔值' },
    { value: 'select', label: '下拉选择' },
    { value: 'file', label: '文件上传' },
];

// 抽屉滑入动画
const drawerStyle = document.createElement('style');
drawerStyle.textContent = `@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`;
if (!document.querySelector('[data-drawer-anim]')) { drawerStyle.setAttribute('data-drawer-anim', ''); document.head.appendChild(drawerStyle); }

export default function AiToolManagement() {
    const [configs, setConfigs] = useState<AiToolConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeType, setActiveType] = useState<AiToolType>('text_chat');

    // Dialog 状态
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [dialogType, setDialogType] = useState<AiToolType>('text_chat');
    const [form, setForm] = useState(EMPTY_FORM);
    const [showApiKey, setShowApiKey] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [videoConfig, setVideoConfig] = useState<VideoGenConfig>(structuredClone(SORA_DEFAULT_VIDEO_CONFIG));
    const [activeEndpoint, setActiveEndpoint] = useState<'generate' | 'status' | 'upload'>('generate');
    // 参数编辑 dialog
    const [paramDialogOpen, setParamDialogOpen] = useState(false);
    const [editingParamIdx, setEditingParamIdx] = useState<number | null>(null);
    const [paramForm, setParamForm] = useState<ParamField>(structuredClone(EMPTY_PARAM));
    const [paramOptionsText, setParamOptionsText] = useState('');
    // 响应映射编辑 dialog
    const [respDialogOpen, setRespDialogOpen] = useState(false);
    const [editingRespIdx, setEditingRespIdx] = useState<number | null>(null);
    const [respForm, setRespForm] = useState<ResponseField>({ key: '', label: '', path: '' });

    // 编辑面板滚动 ref
    const panelRef = useRef<HTMLDivElement>(null);

    // 测试连接状态
    const [testingId, setTestingId] = useState<string | null>(null);
    const [testLogOpen, setTestLogOpen] = useState(false);
    const [testLog, setTestLog] = useState<{ lines: string[]; success: boolean | null; configName: string }>({
        lines: [], success: null, configName: '',
    });

    useEffect(() => {
        loadConfigs();
    }, []);

    const loadConfigs = async () => {
        try {
            setLoading(true);
            const data = await getAiToolConfigs();
            setConfigs(data);
        } catch (err) {
            console.error('加载工具配置失败:', err);
        } finally {
            setLoading(false);
        }
    };

    // 当前类型的配置
    const filteredConfigs = useMemo(() => {
        return configs.filter((c) => c.toolType === activeType);
    }, [configs, activeType]);

    // 每种类型的数量
    const typeCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const c of configs) {
            counts[c.toolType] = (counts[c.toolType] || 0) + 1;
        }
        return counts;
    }, [configs]);

    const handleOpenNew = () => {
        setEditingId(null);
        setDialogType(activeType);
        setForm(EMPTY_FORM);
        setVideoConfig(structuredClone(SORA_DEFAULT_VIDEO_CONFIG));
        setActiveEndpoint('generate');
        setShowApiKey(false);
        setError('');
        setDialogOpen(true);
        setTimeout(() => panelRef.current?.scrollTo({ top: 0 }), 0);
    };

    const handleOpenEdit = (config: AiToolConfig) => {
        setEditingId(config.id);
        setDialogType(config.toolType);
        setForm({
            name: config.name,
            provider: config.provider,
            baseUrl: config.baseUrl,
            apiKey: config.apiKey,
            modelName: config.modelName || '',
            description: config.description || '',
        });
        if (config.toolType === 'video_gen' && config.extraConfig) {
            setVideoConfig(structuredClone(config.extraConfig));
        } else {
            setVideoConfig(structuredClone(SORA_DEFAULT_VIDEO_CONFIG));
        }
        setShowApiKey(false);
        setActiveEndpoint('generate');
        setError('');
        setDialogOpen(true);
        setTimeout(() => panelRef.current?.scrollTo({ top: 0 }), 0);
    };

    const handleProviderChange = (provider: string) => {
        const preset = PROVIDER_PRESETS[provider];
        setForm((prev) => ({
            ...prev,
            provider,
            baseUrl: preset?.baseUrl || prev.baseUrl,
        }));
    };

    // 参数编辑相关（per-endpoint）
    const currentEndpoint = videoConfig.endpoints[activeEndpoint];

    const handleOpenParamNew = () => {
        setEditingParamIdx(null);
        setParamForm(structuredClone(EMPTY_PARAM));
        setParamOptionsText('');
        setParamDialogOpen(true);
    };

    const handleOpenParamEdit = (idx: number) => {
        const p = currentEndpoint.params[idx];
        setEditingParamIdx(idx);
        setParamForm(structuredClone(p));
        setParamOptionsText(p.options?.map(String).join(', ') || '');
        setParamDialogOpen(true);
    };

    const handleSaveParam = () => {
        const param = { ...paramForm, key: paramForm.key.trim(), label: paramForm.label.trim() };
        if (!param.key || !param.label) return;
        if (param.type === 'select') {
            param.options = paramOptionsText.split(',').map(s => s.trim()).filter(Boolean).map(s => {
                const n = Number(s);
                return isNaN(n) ? s : n;
            });
        } else {
            delete param.options;
        }
        if (param.type === 'number') param.value = Number(param.value) || 0;
        if (param.type === 'boolean') param.value = Boolean(param.value);

        setVideoConfig(prev => {
            const ep = { ...prev.endpoints[activeEndpoint] };
            const params = [...ep.params];
            if (editingParamIdx !== null) {
                params[editingParamIdx] = param;
            } else {
                params.push(param);
            }
            ep.params = params;
            return { ...prev, endpoints: { ...prev.endpoints, [activeEndpoint]: ep } };
        });
        setParamDialogOpen(false);
    };

    const handleDeleteParam = (idx: number) => {
        setVideoConfig(prev => {
            const ep = { ...prev.endpoints[activeEndpoint] };
            ep.params = ep.params.filter((_, i) => i !== idx);
            return { ...prev, endpoints: { ...prev.endpoints, [activeEndpoint]: ep } };
        });
    };

    const handleParamValueChange = (idx: number, newValue: string | number | boolean) => {
        setVideoConfig(prev => {
            const ep = { ...prev.endpoints[activeEndpoint] };
            const params = [...ep.params];
            params[idx] = { ...params[idx], value: newValue };
            ep.params = params;
            return { ...prev, endpoints: { ...prev.endpoints, [activeEndpoint]: ep } };
        });
    };

    // 响应映射编辑相关
    const handleOpenRespNew = () => {
        setEditingRespIdx(null);
        setRespForm({ key: '', label: '', path: '' });
        setRespDialogOpen(true);
    };

    const handleOpenRespEdit = (idx: number) => {
        setEditingRespIdx(idx);
        setRespForm(structuredClone(currentEndpoint.responseMapping[idx]));
        setRespDialogOpen(true);
    };

    const handleSaveResp = () => {
        const field = { ...respForm, key: respForm.key.trim(), label: respForm.label.trim(), path: respForm.path.trim() };
        if (!field.key || !field.label || !field.path) return;
        setVideoConfig(prev => {
            const ep = { ...prev.endpoints[activeEndpoint] };
            const mapping = [...ep.responseMapping];
            if (editingRespIdx !== null) {
                mapping[editingRespIdx] = field;
            } else {
                mapping.push(field);
            }
            ep.responseMapping = mapping;
            return { ...prev, endpoints: { ...prev.endpoints, [activeEndpoint]: ep } };
        });
        setRespDialogOpen(false);
    };

    const handleDeleteResp = (idx: number) => {
        setVideoConfig(prev => {
            const ep = { ...prev.endpoints[activeEndpoint] };
            ep.responseMapping = ep.responseMapping.filter((_, i) => i !== idx);
            return { ...prev, endpoints: { ...prev.endpoints, [activeEndpoint]: ep } };
        });
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.baseUrl.trim() || !form.apiKey.trim()) {
            setError('请填写必填字段（名称、Base URL、API Key）');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const now = new Date().toISOString();
            const config: AiToolConfig = {
                id: editingId || crypto.randomUUID(),
                toolType: dialogType,
                name: form.name.trim(),
                provider: form.provider,
                baseUrl: form.baseUrl.trim(),
                apiKey: form.apiKey.trim(),
                modelName: form.modelName.trim() || null,
                description: form.description.trim() || null,
                isDefault: false,
                sortOrder: 0,
                extraConfig: dialogType === 'video_gen' ? videoConfig : null,
                createdAt: editingId ? (configs.find((c) => c.id === editingId)?.createdAt || now) : now,
                updatedAt: now,
            };

            // 如果编辑已有的，保持 isDefault 状态
            if (editingId) {
                const existing = configs.find((c) => c.id === editingId);
                if (existing) {
                    config.isDefault = existing.isDefault;
                    config.sortOrder = existing.sortOrder;
                }
            }

            await saveAiToolConfig(config);
            await loadConfigs();
            setDialogOpen(false);
        } catch (err: any) {
            setError(err.message || '保存失败');
        } finally {
            setSaving(false);
        }
    };

    const handleSetDefault = async (config: AiToolConfig) => {
        try {
            await setDefaultAiToolConfig(config.toolType as AiToolType, config.id);
            await loadConfigs();
        } catch (err) {
            console.error('设置默认失败:', err);
        }
    };

    const handleDelete = async (config: AiToolConfig) => {
        if (!confirm(`确定要删除 "${config.name}" 吗？`)) return;
        try {
            await deleteAiToolConfig(config.id);
            await loadConfigs();
        } catch (err) {
            console.error('删除失败:', err);
        }
    };

    const handleTestConnection = async (config: AiToolConfig) => {
        setTestingId(config.id);
        const logs: string[] = [];
        const log = (msg: string) => {
            logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
            setTestLog({ lines: [...logs], success: null, configName: config.name });
        };

        setTestLogOpen(true);
        setTestLog({ lines: [], success: null, configName: config.name });

        // 智能处理 Base URL：去除尾部斜杠和已知路径后缀
        let baseUrl = config.baseUrl.replace(/\/+$/, '');
        const knownSuffixes = ['/chat/completions', '/completions', '/images/generations', '/embeddings', '/audio'];
        for (const suffix of knownSuffixes) {
            if (baseUrl.endsWith(suffix)) {
                log(`⚠️ Base URL 包含路径 "${suffix}"，已自动去除`);
                baseUrl = baseUrl.slice(0, -suffix.length);
                break;
            }
        }

        const authHeader = `Bearer ${config.apiKey}`;

        try {
            // 第一步：尝试 GET /models
            const modelsUrl = `${baseUrl}/models`;
            log(`>>> GET ${modelsUrl}`);
            log(`>>> Authorization: Bearer ${config.apiKey.slice(0, 8)}${'•'.repeat(8)}`);

            const startTime = Date.now();
            const response = await fetch(modelsUrl, {
                method: 'GET',
                headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
            });
            const elapsed = Date.now() - startTime;
            log(`<<< 状态码: ${response.status} ${response.statusText}  (${elapsed}ms)`);

            if (response.ok) {
                // /models 成功
                const text = await response.text();
                try {
                    const json = JSON.parse(text);
                    if (json.data && Array.isArray(json.data)) {
                        const models = json.data.slice(0, 5).map((m: any) => m.id || m.model || m.name);
                        log(`<<< 可用模型 (前${Math.min(5, json.data.length)}个，共${json.data.length}个):`);
                        models.forEach((m: string) => log(`    • ${m}`));
                    } else {
                        const preview = JSON.stringify(json, null, 2).slice(0, 400);
                        log(`<<< 响应体:\n${preview}${text.length > 400 ? '\n...(已截断)' : ''}`);
                    }
                } catch {
                    log(`<<< 响应体:\n${text.slice(0, 400)}${text.length > 400 ? '\n...(已截断)' : ''}`);
                }
                log(`✅ 连接成功！`);
                setTestLog({ lines: [...logs], success: true, configName: config.name });
                return;
            }

            // /models 返回非 200（如 404），降级到最小 chat completion 测试
            log(`\n⚠️ /models 端点不可用，尝试发送最小 chat 请求验证...`);
            const chatUrl = `${baseUrl}/chat/completions`;
            log(`>>> POST ${chatUrl}`);

            const chatBody = {
                model: config.modelName || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'hi' }],
                max_tokens: 1,
            };
            log(`>>> Body: ${JSON.stringify(chatBody)}`);

            const chatStart = Date.now();
            const chatResp = await fetch(chatUrl, {
                method: 'POST',
                headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify(chatBody),
            });
            const chatElapsed = Date.now() - chatStart;
            log(`<<< 状态码: ${chatResp.status} ${chatResp.statusText}  (${chatElapsed}ms)`);

            const chatText = await chatResp.text();
            try {
                const chatJson = JSON.parse(chatText);
                const preview = JSON.stringify(chatJson, null, 2).slice(0, 500);
                log(`<<< 响应体:\n${preview}${chatText.length > 500 ? '\n...(已截断)' : ''}`);
            } catch {
                log(`<<< 响应体:\n${chatText.slice(0, 500)}${chatText.length > 500 ? '\n...(已截断)' : ''}`);
            }

            if (chatResp.ok) {
                log(`✅ 连接成功！（通过 chat 接口验证）`);
                setTestLog({ lines: [...logs], success: true, configName: config.name });
            } else {
                log(`❌ 请求失败 (HTTP ${chatResp.status})`);
                setTestLog({ lines: [...logs], success: false, configName: config.name });
            }
        } catch (err: any) {
            log(`❌ 连接失败: ${err.message}`);
            setTestLog({ lines: [...logs], success: false, configName: config.name });
        } finally {
            setTestingId(null);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-gray-600">加载中...</div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* 顶部标题 */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#1E293B] mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        AI 模型配置
                    </h1>
                    <p className="text-[#64748B]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                        管理 AI 模型配置，支持自由切换不同供应商和模型
                    </p>
                </div>
                <button
                    onClick={handleOpenNew}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    新增工具
                </button>
            </div>

            {/* 类型 Tab */}
            <div className="flex gap-2 mb-6">
                {TOOL_TYPES.map(({ type, label, icon: Icon }) => {
                    const isActive = activeType === type;
                    const count = typeCounts[type] || 0;
                    return (
                        <button
                            key={type}
                            onClick={() => setActiveType(type)}
                            className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer
                ${isActive
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }
              `}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                            {count > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 配置列表 */}
            {filteredConfigs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 p-12">
                    <Wrench className="w-16 h-16 text-slate-300 mb-4" />
                    <p className="text-slate-600 font-medium mb-2">
                        还没有 {TOOL_TYPES.find((t) => t.type === activeType)?.label} 配置
                    </p>
                    <p className="text-slate-400 text-sm mb-6">
                        添加一个 API 配置来开始使用
                    </p>
                    <button
                        onClick={handleOpenNew}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        新增工具
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto">
                    {filteredConfigs.map((config) => (
                        <div
                            key={config.id}
                            className={`bg-white rounded-xl border-2 p-5 transition-all hover:shadow-md ${config.isDefault ? 'border-blue-400 shadow-sm ring-1 ring-blue-100' : 'border-slate-200'}`}
                        >
                            {/* 卡片头部 */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-lg text-slate-900 truncate">{config.name}</h3>
                                        {config.isDefault && (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full border border-blue-200">
                                                <Star className="w-3 h-3 fill-current" />
                                                默认
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        {PROVIDER_PRESETS[config.provider]?.label || config.provider}
                                    </p>
                                </div>
                            </div>

                            {/* 配置信息 */}
                            <div className="space-y-2 mb-4">
                                {config.modelName && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-slate-400 w-16 shrink-0">模型:</span>
                                        <span className="text-slate-700 font-mono text-xs bg-slate-50 px-2 py-0.5 rounded truncate">
                                            {config.modelName}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-slate-400 w-16 shrink-0">端点:</span>
                                    <span className="text-slate-500 text-xs truncate">{config.baseUrl}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-slate-400 w-16 shrink-0">密钥:</span>
                                    <span className="text-slate-500 text-xs font-mono">
                                        {config.apiKey.slice(0, 8)}{'•'.repeat(12)}
                                    </span>
                                </div>
                                {config.description && (
                                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">{config.description}</p>
                                )}
                                {config.toolType === 'video_gen' && config.extraConfig?.endpoints && (
                                    <div className="space-y-1.5 mt-2">
                                        {(['generate', 'status', 'upload'] as const).map(ep => {
                                            const epc = (config.extraConfig as VideoGenConfig).endpoints[ep];
                                            if (!epc) return null;
                                            return (
                                                <div key={ep} className="flex items-center gap-1.5 text-xs">
                                                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded border border-violet-200 font-medium">{ENDPOINT_LABELS[ep]}</span>
                                                    <span className="text-slate-400 font-mono">{epc.method} {epc.path}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* 操作按钮 */}
                            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                                {!config.isDefault && (
                                    <button
                                        onClick={() => handleSetDefault(config)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer border border-amber-200"
                                    >
                                        <Star className="w-3.5 h-3.5" />
                                        设为默认
                                    </button>
                                )}
                                <button
                                    onClick={() => handleTestConnection(config)}
                                    disabled={testingId === config.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-200 disabled:opacity-50"
                                >
                                    {testingId === config.id
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <Zap className="w-3.5 h-3.5" />
                                    }
                                    测试
                                </button>
                                <div className="flex-1" />
                                <button
                                    onClick={() => handleOpenEdit(config)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    编辑
                                </button>
                                <button
                                    onClick={() => handleDelete(config)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    删除
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 抽屉式编辑面板 */}
            {dialogOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* 遮罩 */}
                    <div className="absolute inset-0 bg-black/30" onClick={() => setDialogOpen(false)} />
                    {/* 抽屉主体 */}
                    <div className="relative w-[82%] max-w-[1200px] bg-white shadow-2xl flex flex-col animate-[slideInRight_0.25s_ease-out]">
                        {/* 头部 */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {editingId ? '编辑工具配置' : '新增工具配置'}
                            </h2>
                            <button
                                onClick={() => setDialogOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* 内容区：左右两栏 */}
                        <div ref={panelRef} className="flex-1 overflow-y-auto">
                            <div className={`p-6 ${dialogType === 'video_gen' ? 'flex gap-6' : 'max-w-xl'}`}>
                                {/* 左栏：基础配置 */}
                                <div className={`space-y-4 ${dialogType === 'video_gen' ? 'w-[380px] shrink-0' : 'w-full'}`}>
                                    <h3 className="text-sm font-semibold text-slate-800 pb-2 border-b border-slate-100">基础配置</h3>
                                    {/* 工具类型 + 供应商 */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                工具类型 <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={dialogType}
                                                onChange={(e) => setDialogType(e.target.value as AiToolType)}
                                                disabled={!!editingId}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
                                            >
                                                {TOOL_TYPES.map(({ type, label }) => (
                                                    <option key={type} value={type}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                供应商
                                            </label>
                                            <select
                                                value={form.provider}
                                                onChange={(e) => handleProviderChange(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                {Object.entries(PROVIDER_PRESETS).map(([key, { label }]) => (
                                                    <option key={key} value={key}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* 名称 */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            配置名称 <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            placeholder="例如：GPT-4o、通义千问-Plus"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Base URL */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            API Base URL <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.baseUrl}
                                            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                                            placeholder="https://api.example.com/v1"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* API Key */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            API Key <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showApiKey ? 'text' : 'password'}
                                                value={form.apiKey}
                                                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                                                placeholder="sk-..."
                                                className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                            >
                                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* 模型名称 */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            模型名称
                                        </label>
                                        <input
                                            type="text"
                                            value={form.modelName}
                                            onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                                            placeholder="例如：gpt-4o、qwen-plus"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* 备注 */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            备注说明
                                        </label>
                                        <textarea
                                            value={form.description}
                                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                                            placeholder="可选，记录用途或注意事项"
                                            rows={2}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                        />
                                    </div>

                                    {/* 错误信息 */}
                                    {error && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                            {error}
                                        </div>
                                    )}
                                </div>

                                {/* 右栏：视频生成接口配置 */}
                                {dialogType === 'video_gen' && (
                                    <div className="flex-1 min-w-0 space-y-4">
                                        <h3 className="text-sm font-semibold text-slate-800 pb-2 border-b border-slate-100">接口配置</h3>
                                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                                            {/* 接口 Tab 切换 */}
                                            <div className="flex border-b border-slate-200 bg-slate-50">
                                                {(['generate', 'status', 'upload'] as const).map(ep => (
                                                    <button key={ep} type="button" onClick={() => setActiveEndpoint(ep)} className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer ${activeEndpoint === ep ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                                                        {ENDPOINT_LABELS[ep]}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* 当前接口配置 */}
                                            <div className="p-4 space-y-4">
                                                {/* 路径 + 方法 */}
                                                <div className="flex gap-2">
                                                    <select value={currentEndpoint.method} onChange={(e) => setVideoConfig(prev => { const ep = { ...prev.endpoints[activeEndpoint], method: e.target.value as 'GET' | 'POST' }; return { ...prev, endpoints: { ...prev.endpoints, [activeEndpoint]: ep } }; })} className="w-24 px-2 py-1.5 border border-slate-300 rounded text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                                        <option value="GET">GET</option>
                                                        <option value="POST">POST</option>
                                                    </select>
                                                    <input type="text" value={currentEndpoint.path} onChange={(e) => setVideoConfig(prev => { const ep = { ...prev.endpoints[activeEndpoint], path: e.target.value }; return { ...prev, endpoints: { ...prev.endpoints, [activeEndpoint]: ep } }; })} className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="/videos/generations" />
                                                </div>

                                                {/* 请求参数 */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-medium text-slate-600">请求参数 ({currentEndpoint.params.length})</span>
                                                        <button type="button" onClick={handleOpenParamNew} className="flex items-center gap-1 px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 rounded cursor-pointer"><Plus className="w-3 h-3" />添加</button>
                                                    </div>
                                                    {currentEndpoint.params.length === 0 ? (
                                                        <div className="text-xs text-slate-400 text-center py-3 bg-slate-50 rounded">无请求参数</div>
                                                    ) : (
                                                        <div className="border border-slate-200 rounded divide-y divide-slate-100">
                                                            {currentEndpoint.params.map((p, idx) => (
                                                                <div key={idx} className="px-3 py-2 flex items-center gap-2 hover:bg-slate-50 group">
                                                                    <div className="w-24 shrink-0">
                                                                        <div className="text-sm font-medium text-slate-700 truncate">{p.label}</div>
                                                                        <div className="text-xs text-slate-400 font-mono truncate">{p.key}</div>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        {p.type === 'file' ? (
                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded border border-indigo-200 font-medium">FormData 文件字段</span>
                                                                        ) : p.type === 'boolean' ? (
                                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                                <input type="checkbox" checked={Boolean(p.value)} onChange={(e) => handleParamValueChange(idx, e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                                                <span className="text-xs text-slate-600">{p.value ? '是' : '否'}</span>
                                                                            </label>
                                                                        ) : p.type === 'select' && p.options ? (
                                                                            <select value={String(p.value)} onChange={(e) => { const v = e.target.value; const n = Number(v); handleParamValueChange(idx, isNaN(n) || v === '' ? v : n); }} className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                                                                {p.options.map(opt => <option key={String(opt)} value={String(opt)}>{String(opt) || '(空)'}</option>)}
                                                                            </select>
                                                                        ) : p.type === 'number' ? (
                                                                            <input type="number" value={Number(p.value)} onChange={(e) => handleParamValueChange(idx, Number(e.target.value))} className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                                                        ) : (
                                                                            <input type="text" value={String(p.value)} onChange={(e) => handleParamValueChange(idx, e.target.value)} className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                                        <button type="button" onClick={() => handleOpenParamEdit(idx)} className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"><Edit2 className="w-3 h-3" /></button>
                                                                        <button type="button" onClick={() => handleDeleteParam(idx)} className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 响应字段映射 */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-medium text-slate-600">响应映射 ({currentEndpoint.responseMapping.length})</span>
                                                        <button type="button" onClick={handleOpenRespNew} className="flex items-center gap-1 px-2 py-0.5 text-xs text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"><Plus className="w-3 h-3" />添加</button>
                                                    </div>
                                                    {currentEndpoint.responseMapping.length === 0 ? (
                                                        <div className="text-xs text-slate-400 text-center py-3 bg-slate-50 rounded">无响应映射</div>
                                                    ) : (
                                                        <div className="border border-slate-200 rounded divide-y divide-slate-100">
                                                            {currentEndpoint.responseMapping.map((r, idx) => (
                                                                <div key={idx} className="px-3 py-2 flex items-center gap-3 hover:bg-slate-50 group">
                                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-mono rounded border border-emerald-200">{r.key}</span>
                                                                        <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                                                                        <span className="text-xs font-mono text-slate-600 truncate">{r.path}</span>
                                                                    </div>
                                                                    <span className="text-xs text-slate-400 shrink-0">{r.label}</span>
                                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                                        <button type="button" onClick={() => handleOpenRespEdit(idx)} className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"><Edit2 className="w-3 h-3" /></button>
                                                                        <button type="button" onClick={() => handleDeleteResp(idx)} className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 底部操作栏 */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/80 shrink-0">
                            <button
                                onClick={() => setDialogOpen(false)}
                                disabled={saving}
                                className="px-5 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm font-medium"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !form.name.trim() || !form.baseUrl.trim() || !form.apiKey.trim()}
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer text-sm font-medium"
                            >
                                {saving ? '保存中...' : editingId ? '更新' : '创建'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 测试连接日志 Dialog */}
            {testLogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-[860px] max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-semibold text-slate-900">
                                    测试连接 — {testLog.configName}
                                </h2>
                                {testLog.success === true && (
                                    <span className="px-2.5 py-0.5 bg-green-50 text-green-600 text-xs font-medium rounded-full border border-green-200">
                                        成功
                                    </span>
                                )}
                                {testLog.success === false && (
                                    <span className="px-2.5 py-0.5 bg-red-50 text-red-600 text-xs font-medium rounded-full border border-red-200">
                                        失败
                                    </span>
                                )}
                                {testLog.success === null && testLog.lines.length > 0 && (
                                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                )}
                            </div>
                            <button
                                onClick={() => setTestLogOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap leading-6 bg-slate-50 rounded-lg p-4 border border-slate-200">
                                {testLog.lines.length === 0 ? '正在连接...' : testLog.lines.join('\n')}
                            </pre>
                        </div>
                        <div className="flex justify-end px-6 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button
                                onClick={() => setTestLogOpen(false)}
                                className="px-5 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm font-medium"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 参数编辑 Dialog */}
            {paramDialogOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-[440px]">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
                            <h3 className="text-sm font-semibold text-slate-900">{editingParamIdx !== null ? '编辑参数' : '添加参数'}</h3>
                            <button onClick={() => setParamDialogOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">字段名 (key) *</label>
                                    <input type="text" value={paramForm.key} onChange={(e) => setParamForm(p => ({ ...p, key: e.target.value }))} placeholder="如 metadata.n" className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">显示名称 (label) *</label>
                                    <input type="text" value={paramForm.label} onChange={(e) => setParamForm(p => ({ ...p, label: e.target.value }))} placeholder="如 生成数量" className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">值类型</label>
                                    <select value={paramForm.type} onChange={(e) => setParamForm(p => ({ ...p, type: e.target.value as ParamField['type'] }))} className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                        {PARAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">默认值</label>
                                    {paramForm.type === 'file' ? (
                                        <div className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-400">文件类型无默认值，运行时选择</div>
                                    ) : paramForm.type === 'boolean' ? (
                                        <select value={String(paramForm.value)} onChange={(e) => setParamForm(p => ({ ...p, value: e.target.value === 'true' }))} className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                            <option value="false">否 (false)</option>
                                            <option value="true">是 (true)</option>
                                        </select>
                                    ) : (
                                        <input type={paramForm.type === 'number' ? 'number' : 'text'} value={String(paramForm.value)} onChange={(e) => setParamForm(p => ({ ...p, value: paramForm.type === 'number' ? Number(e.target.value) : e.target.value }))} className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                    )}
                                </div>
                            </div>
                            {paramForm.type === 'select' && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">可选值 (逗号分隔)</label>
                                    <input type="text" value={paramOptionsText} onChange={(e) => setParamOptionsText(e.target.value)} placeholder="如 10, 15, 25 或 anime, comic, news" className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">备注</label>
                                <input type="text" value={paramForm.remark || ''} onChange={(e) => setParamForm(p => ({ ...p, remark: e.target.value || undefined }))} placeholder="可选，显示在使用场景中" className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={paramForm.required || false} onChange={(e) => setParamForm(p => ({ ...p, required: e.target.checked || undefined }))} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm text-slate-700">必填参数</span>
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setParamDialogOpen(false)} className="px-4 py-1.5 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm">取消</button>
                            <button onClick={handleSaveParam} disabled={!paramForm.key.trim() || !paramForm.label.trim()} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer text-sm">确定</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 响应映射编辑 Dialog */}
            {respDialogOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-[440px]">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
                            <h3 className="text-sm font-semibold text-slate-900">{editingRespIdx !== null ? '编辑响应映射' : '添加响应映射'}</h3>
                            <button onClick={() => setRespDialogOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">内部标识 (key) *</label>
                                    <input type="text" value={respForm.key} onChange={(e) => setRespForm(r => ({ ...r, key: e.target.value }))} placeholder="如 taskId, videoUrl" className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">显示名称 (label) *</label>
                                    <input type="text" value={respForm.label} onChange={(e) => setRespForm(r => ({ ...r, label: e.target.value }))} placeholder="如 任务ID" className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">JSON 字段路径 (path) *</label>
                                <input type="text" value={respForm.path} onChange={(e) => setRespForm(r => ({ ...r, path: e.target.value }))} placeholder="如 id, output.video_url" className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                <p className="text-xs text-slate-400 mt-1">API 响应 JSON 中的字段路径，支持点号嵌套</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">备注</label>
                                <input type="text" value={respForm.remark || ''} onChange={(e) => setRespForm(r => ({ ...r, remark: e.target.value || undefined }))} placeholder="可选" className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setRespDialogOpen(false)} className="px-4 py-1.5 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm">取消</button>
                            <button onClick={handleSaveResp} disabled={!respForm.key.trim() || !respForm.label.trim() || !respForm.path.trim()} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer text-sm">确定</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
