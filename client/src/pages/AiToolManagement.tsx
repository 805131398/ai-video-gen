import { useEffect, useState, useMemo } from 'react';
import {
    Wrench, Plus, Star, Edit2, Trash2, X, Eye, EyeOff,
    MessageSquare, Image, Video, Music, ChevronRight, Zap, Loader2,
} from 'lucide-react';
import { AiToolConfig, AiToolType } from '../types';
import {
    getAiToolConfigs,
    saveAiToolConfig,
    deleteAiToolConfig,
    setDefaultAiToolConfig,
} from '../services/aiTool';

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
        setShowApiKey(false);
        setError('');
        setDialogOpen(true);
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
        setShowApiKey(false);
        setError('');
        setDialogOpen(true);
    };

    const handleProviderChange = (provider: string) => {
        const preset = PROVIDER_PRESETS[provider];
        setForm((prev) => ({
            ...prev,
            provider,
            baseUrl: preset?.baseUrl || prev.baseUrl,
        }));
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
                            className={`bg-white rounded-xl border-2 p-5 transition-all hover:shadow-md ${config.isDefault ? 'border-blue-400 shadow-sm ring-1 ring-blue-100' : 'border-slate-200'
                                }`}
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

            {/* 新增/编辑 Dialog */}
            {dialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-[560px] max-h-[85vh] overflow-y-auto">
                        {/* Dialog 头部 */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {editingId ? '编辑工具配置' : '新增工具配置'}
                            </h2>
                            <button
                                onClick={() => setDialogOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* 表单 */}
                        <div className="px-6 py-5 space-y-5">
                            {/* 工具类型 */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    工具类型 <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={dialogType}
                                    onChange={(e) => setDialogType(e.target.value as AiToolType)}
                                    disabled={!!editingId}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
                                >
                                    {TOOL_TYPES.map(({ type, label }) => (
                                        <option key={type} value={type}>{label}</option>
                                    ))}
                                </select>
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
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* 供应商 */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    供应商
                                </label>
                                <select
                                    value={form.provider}
                                    onChange={(e) => handleProviderChange(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    {Object.entries(PROVIDER_PRESETS).map(([key, { label }]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
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
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                        className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* 描述 */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    备注说明
                                </label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="可选，记录用途或注意事项"
                                    rows={2}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                            </div>

                            {/* 错误信息 */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Dialog 底部 */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
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
                                        ✅ 成功
                                    </span>
                                )}
                                {testLog.success === false && (
                                    <span className="px-2.5 py-0.5 bg-red-50 text-red-600 text-xs font-medium rounded-full border border-red-200">
                                        ❌ 失败
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
        </div>
    );
}
