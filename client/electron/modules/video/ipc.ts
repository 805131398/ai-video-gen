import { ipcMain } from 'electron';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { saveAiUsageLog } from '../database/service';

// 从嵌套对象中按点号路径取值
function getByPath(obj: any, dotPath: string): any {
    // 支持 data[0].url 和 data.0.url 两种数组索引写法
    const keys = dotPath.replace(/\[(\d+)\]/g, '.$1').split('.');
    return keys.reduce((o, k) => o?.[k], obj);
}

// 将点号路径的 key 设置到嵌套对象中
function setByPath(obj: any, dotPath: string, value: any): void {
    const keys = dotPath.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) current[keys[i]] = {};
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
}

export function registerVideoHandlers() {
    // 视频生成 — 提交任务
    ipcMain.handle('video:generate', async (_event, request: any) => {
        const { baseUrl, apiKey, generateConfig, prompt, imageUrl, paramValues,
            conversationId, modelConfigId, modelName } = request;
        const logId = crypto.randomUUID();
        const startTime = Date.now();

        try {
            const body: any = {};
            body.prompt = prompt;
            if (imageUrl) body.image_url = imageUrl;

            for (const param of generateConfig.params) {
                if (param.type === 'file') continue;
                const value = paramValues[param.key] !== undefined ? paramValues[param.key] : param.value;
                setByPath(body, param.key, value);
            }

            const url = baseUrl.replace(/\/+$/, '') + generateConfig.path;
            const response = await fetch(url, {
                method: generateConfig.method,
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const responseText = await response.text();
            let responseJson: any;
            try { responseJson = JSON.parse(responseText); } catch { responseJson = null; }

            if (!response.ok) {
                saveAiUsageLog({
                    id: logId, toolType: 'video_gen', modelName: modelName || null,
                    modelConfigId: modelConfigId || null, status: 'error',
                    errorMessage: `HTTP ${response.status}: ${responseText.slice(0, 2000)}`,
                    durationMs: Date.now() - startTime,
                    requestBody: JSON.stringify({ url, body }),
                    responseBody: responseText.slice(0, 5000),
                    userInput: prompt.slice(0, 500), baseUrl,
                    conversationId: conversationId || null,
                    createdAt: new Date().toISOString(),
                });
                return { success: false, error: `HTTP ${response.status}: ${responseText.slice(0, 500)}` };
            }

            let taskId: string | undefined;
            for (const mapping of generateConfig.responseMapping) {
                if (mapping.key === 'taskId' && responseJson) {
                    taskId = String(getByPath(responseJson, mapping.path));
                }
            }

            saveAiUsageLog({
                id: logId, toolType: 'video_gen', modelName: modelName || null,
                modelConfigId: modelConfigId || null, status: 'success',
                durationMs: Date.now() - startTime,
                requestBody: JSON.stringify({ url, body }),
                responseBody: responseText.slice(0, 5000),
                userInput: prompt.slice(0, 500), aiOutput: taskId || '',
                baseUrl, conversationId: conversationId || null,
                createdAt: new Date().toISOString(),
            });

            return { success: true, taskId, rawResponse: responseJson };
        } catch (error: any) {
            saveAiUsageLog({
                id: logId, toolType: 'video_gen', modelName: modelName || null,
                modelConfigId: modelConfigId || null, status: 'error',
                errorMessage: error.message, durationMs: Date.now() - startTime,
                requestBody: JSON.stringify({ prompt, paramValues }),
                userInput: prompt.slice(0, 500), baseUrl,
                conversationId: conversationId || null,
                createdAt: new Date().toISOString(),
            });
            return { success: false, error: error.message };
        }
    });

    // 视频生成 — 轮询任务状态
    ipcMain.handle('video:pollStatus', async (_event, request: any) => {
        const { baseUrl, apiKey, statusConfig, taskId, conversationId, modelConfigId, modelName } = request;

        try {
            const statusPath = statusConfig.path.replace('{taskId}', taskId);
            const url = baseUrl.replace(/\/+$/, '') + statusPath;

            console.log(`[video:pollStatus] taskId=${taskId}, url=${url}`);

            const response = await fetch(url, {
                method: statusConfig.method,
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            });

            const responseText = await response.text();
            let responseJson: any;
            try { responseJson = JSON.parse(responseText); } catch { responseJson = null; }

            console.log(`[video:pollStatus] taskId=${taskId}, HTTP ${response.status}, body=${responseText.slice(0, 1000)}`);

            if (!response.ok) {
                const errorMsg = `HTTP ${response.status}: ${responseText.slice(0, 500)}`;
                console.error(`[video:pollStatus] 请求失败: ${errorMsg}`);
                saveAiUsageLog({
                    id: crypto.randomUUID(), toolType: 'video_gen', modelName: modelName || null,
                    modelConfigId: modelConfigId || null, status: 'error',
                    errorMessage: errorMsg,
                    requestBody: JSON.stringify({ url, taskId }),
                    responseBody: responseText.slice(0, 5000),
                    userInput: `poll:${taskId}`, baseUrl,
                    conversationId: conversationId || null,
                    extraData: JSON.stringify({ stage: 'poll_status', httpStatus: response.status }),
                    createdAt: new Date().toISOString(),
                });
                return { success: false, error: errorMsg };
            }

            const result: any = { success: true, rawResponse: responseJson };
            for (const mapping of statusConfig.responseMapping) {
                if (responseJson) {
                    const resolved = getByPath(responseJson, mapping.path);
                    console.log(`[video:pollStatus] mapping: key="${mapping.key}", path="${mapping.path}" → ${JSON.stringify(resolved)}`);
                    result[mapping.key] = resolved;
                }
            }

            console.log(`[video:pollStatus] taskId=${taskId}, mapped result: status=${result.status}, videoUrl=${result.videoUrl || 'N/A'}`);

            // 记录终态日志（完成或失败）
            const mappedStatus = (result.status || '').toLowerCase();
            const isTerminal = ['completed', 'complete', 'succeeded', 'success', 'failed', 'error', 'cancelled'].some(
                s => mappedStatus.includes(s)
            );
            if (isTerminal) {
                const isSuccess = ['completed', 'complete', 'succeeded', 'success'].some(s => mappedStatus.includes(s));
                saveAiUsageLog({
                    id: crypto.randomUUID(), toolType: 'video_gen', modelName: modelName || null,
                    modelConfigId: modelConfigId || null, status: isSuccess ? 'success' : 'error',
                    errorMessage: isSuccess ? null : `任务终态: ${result.status}`,
                    requestBody: JSON.stringify({ url, taskId }),
                    responseBody: responseText.slice(0, 5000),
                    userInput: `poll:${taskId}`,
                    aiOutput: result.videoUrl || '',
                    baseUrl, conversationId: conversationId || null,
                    extraData: JSON.stringify({ stage: 'poll_terminal', mappedStatus: result.status, videoUrl: result.videoUrl, thumbnailUrl: result.thumbnailUrl }),
                    createdAt: new Date().toISOString(),
                });
            }

            return result;
        } catch (error: any) {
            console.error(`[video:pollStatus] 异常: taskId=${taskId}, error=${error.message}`);
            saveAiUsageLog({
                id: crypto.randomUUID(), toolType: 'video_gen', modelName: modelName || null,
                modelConfigId: modelConfigId || null, status: 'error',
                errorMessage: error.message,
                requestBody: JSON.stringify({ taskId }),
                userInput: `poll:${taskId}`, baseUrl,
                conversationId: conversationId || null,
                extraData: JSON.stringify({ stage: 'poll_exception' }),
                createdAt: new Date().toISOString(),
            });
            return { success: false, error: error.message };
        }
    });

    // 视频生成 — 上传图片
    ipcMain.handle('video:upload', async (_event, request: any) => {
        const { baseUrl, apiKey, uploadConfig, filePath } = request;

        try {
            const url = baseUrl.replace(/\/+$/, '') + uploadConfig.path;
            const fileParam = uploadConfig.params.find((p: any) => p.type === 'file');
            const fieldName = fileParam?.key || 'file';

            const fileBuffer = await fs.readFile(filePath);
            const fileName = path.basename(filePath);
            const blob = new Blob([fileBuffer]);
            const formData = new FormData();
            formData.append(fieldName, blob, fileName);

            const response = await fetch(url, {
                method: uploadConfig.method,
                headers: { 'Authorization': `Bearer ${apiKey}` },
                body: formData,
            });

            const responseText = await response.text();
            let responseJson: any;
            try { responseJson = JSON.parse(responseText); } catch { responseJson = null; }

            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}: ${responseText.slice(0, 500)}` };
            }

            let imageUrl: string | undefined;
            for (const mapping of uploadConfig.responseMapping) {
                if (mapping.key === 'imageUrl' && responseJson) {
                    imageUrl = String(getByPath(responseJson, mapping.path));
                }
            }
            return { success: true, imageUrl };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });
}
