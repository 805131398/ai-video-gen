import { ipcMain } from 'electron';
import crypto from 'crypto';
import { saveAiUsageLog } from '../database/service';

export function registerChatHandlers() {
    ipcMain.handle('chat:sendMessage', async (event, request: any) => {
        const startTime = Date.now();
        const logId = crypto.randomUUID();
        const { baseUrl, apiKey, model, messages, temperature, maxTokens, conversationId, modelConfigId, toolType } = request;

        let url = baseUrl.replace(/\/+$/, '');
        // 去除已知路径后缀，避免重复拼接
        const knownSuffixes = ['/chat/completions', '/completions', '/images/generations', '/embeddings', '/audio'];
        for (const suffix of knownSuffixes) {
            if (url.endsWith(suffix)) {
                url = url.slice(0, -suffix.length);
                break;
            }
        }
        url = `${url}/chat/completions`;

        const body: any = {
            model,
            messages,
            stream: true,
        };
        if (temperature !== undefined) body.temperature = temperature;
        if (maxTokens !== undefined) body.max_tokens = maxTokens;

        // 用户输入摘要（取最后一条 user 消息）
        const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
        const userInput = lastUserMsg?.content?.slice(0, 500) || '';

        // 请求体快照（隐藏 apiKey）
        const requestBodySnapshot = JSON.stringify({ url, model, messages, temperature, maxTokens });

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                const durationMs = Date.now() - startTime;
                event.sender.send('chat:streamChunk', {
                    type: 'error',
                    error: `HTTP ${response.status}: ${errorText}`,
                });
                // 记录错误日志
                saveAiUsageLog({
                    id: logId, toolType: toolType || 'text_chat', modelName: model,
                    modelConfigId: modelConfigId || null, status: 'error',
                    errorMessage: `HTTP ${response.status}: ${errorText.slice(0, 2000)}`,
                    durationMs, requestBody: requestBodySnapshot,
                    responseBody: errorText.slice(0, 5000),
                    userInput, baseUrl, temperature, maxTokens,
                    conversationId: conversationId || null,
                    createdAt: new Date().toISOString(),
                });
                return '';
            }

            const reader = response.body?.getReader();
            if (!reader) {
                event.sender.send('chat:streamChunk', { type: 'error', error: '无法读取响应流' });
                saveAiUsageLog({
                    id: logId, toolType: toolType || 'text_chat', modelName: model,
                    modelConfigId: modelConfigId || null, status: 'error',
                    errorMessage: '无法读取响应流', durationMs: Date.now() - startTime,
                    requestBody: requestBodySnapshot, userInput, baseUrl, temperature, maxTokens,
                    conversationId: conversationId || null, createdAt: new Date().toISOString(),
                });
                return '';
            }

            const decoder = new TextDecoder();
            let fullContent = '';
            let buffer = '';
            let usageInfo: any = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data:')) continue;
                    const data = trimmed.slice(5).trim();
                    if (data === '[DONE]') continue;

                    try {
                        const json = JSON.parse(data);
                        const content = json.choices?.[0]?.delta?.content;
                        if (content) {
                            fullContent += content;
                            event.sender.send('chat:streamChunk', { type: 'delta', content });
                        }
                        // 提取 usage 信息（部分 API 在最后一个 chunk 返回）
                        if (json.usage) {
                            usageInfo = json.usage;
                        }
                    } catch { /* ignore parse errors */ }
                }
            }

            const durationMs = Date.now() - startTime;
            event.sender.send('chat:streamChunk', { type: 'done' });

            // 记录成功日志
            saveAiUsageLog({
                id: logId, toolType: toolType || 'text_chat', modelName: model,
                modelConfigId: modelConfigId || null, status: 'success',
                durationMs,
                promptTokens: usageInfo?.prompt_tokens || null,
                completionTokens: usageInfo?.completion_tokens || null,
                totalTokens: usageInfo?.total_tokens || null,
                requestBody: requestBodySnapshot,
                responseBody: fullContent.slice(0, 10000),
                userInput, aiOutput: fullContent.slice(0, 500),
                baseUrl, temperature, maxTokens,
                conversationId: conversationId || null,
                createdAt: new Date().toISOString(),
            });

            return fullContent;
        } catch (error: any) {
            const durationMs = Date.now() - startTime;
            event.sender.send('chat:streamChunk', {
                type: 'error',
                error: error.message || '请求失败',
            });
            // 记录异常日志
            saveAiUsageLog({
                id: logId, toolType: toolType || 'text_chat', modelName: model,
                modelConfigId: modelConfigId || null, status: 'error',
                errorMessage: error.message || '请求失败', durationMs,
                requestBody: requestBodySnapshot, userInput,
                baseUrl, temperature, maxTokens,
                conversationId: conversationId || null,
                createdAt: new Date().toISOString(),
            });
            return '';
        }
    });
}
