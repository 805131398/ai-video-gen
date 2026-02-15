/**
 * 供应商图片上传服务
 * 在调用 AI 生成接口前，确保参考图片 URL 可被 AI 供应商访问。
 * 流程：检查 URL 可用性 → 不可用则上传到供应商图片托管 → 返回可用 URL
 */
import api from './api';

// 供应商凭证响应
interface ProviderCredential {
  providerName: string;
  displayName: string;
  uploadUrl: string;
  authType: string;
  encryptedApiKey: string;
  iv: string;
  authTag: string;
  responseUrlPath: string;
  config?: {
    fileFieldName?: string;
    extraHeaders?: Record<string, string>;
    extraFormFields?: Record<string, string>;
  };
}

// PBKDF2 参数（与服务端 crypto.ts 保持一致）
const SALT = 'ai-video-gen-upload-salt-2026';
const ITERATIONS = 100000;
const KEY_LENGTH = 32;

/**
 * 主入口：确保参考图片 URL 可被 AI 供应商访问
 * @param referenceImage 当前参考图片 URL（可能是远程 URL 或 local-resource:// 路径）
 * @param localFilePath 本地文件路径（从 local-resource:// 解析出来的）
 * @returns 可用的远程 URL
 */
export async function ensureReferenceImageAccessible(
  referenceImage: string,
  localFilePath?: string
): Promise<string> {
  // 1. 先检查当前 URL 是否可访问（跳过 local-resource:// 协议）
  if (referenceImage && !referenceImage.startsWith('local-resource://')) {
    const accessible = await checkUrlAccessibility(referenceImage);
    if (accessible) {
      return referenceImage;
    }
  }

  // 2. 解析本地文件路径
  const filePath = localFilePath || extractLocalPath(referenceImage);
  if (!filePath) {
    console.warn('无法获取本地文件路径，使用原始 URL');
    return referenceImage;
  }

  // 3. 读取文件信息（base64 + hash）
  const fileInfo = await window.electron.resources.readFileInfo(filePath);
  if (!fileInfo.success || !fileInfo.base64 || !fileInfo.hash) {
    console.warn('读取本地文件失败:', fileInfo.error);
    return referenceImage;
  }

  // 4. 获取供应商凭证
  let credential: ProviderCredential;
  try {
    credential = await getProviderCredential();
  } catch {
    console.warn('无可用的供应商上传配置，使用原始 URL');
    return referenceImage;
  }

  // 5. 检查本地缓存的上传记录
  const cachedRecord = await window.electron.db.getProviderUploadRecord(
    fileInfo.hash,
    credential.providerName
  );
  if (cachedRecord?.remoteUrl) {
    const cachedAccessible = await checkUrlAccessibility(cachedRecord.remoteUrl);
    if (cachedAccessible) {
      return cachedRecord.remoteUrl;
    }
    // 缓存 URL 失效，删除旧记录
    await window.electron.db.deleteProviderUploadRecord(
      fileInfo.hash,
      credential.providerName
    );
  }

  // 6. 上传到供应商
  const remoteUrl = await uploadImageToProvider(
    fileInfo.base64,
    fileInfo.fileName || 'image.png',
    fileInfo.mimeType || 'image/png',
    credential
  );

  // 7. 保存上传记录到本地缓存
  await window.electron.db.saveProviderUploadRecord({
    localResourceHash: fileInfo.hash,
    localPath: filePath,
    providerName: credential.providerName,
    remoteUrl,
    fileSize: fileInfo.size,
    mimeType: fileInfo.mimeType,
  });

  return remoteUrl;
}

/**
 * HEAD 请求检查 URL 是否可访问（超时 5s）
 */
async function checkUrlAccessibility(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 从 local-resource:// URL 中提取本地文件路径
 */
function extractLocalPath(url: string): string | null {
  if (url.startsWith('local-resource://')) {
    return decodeURIComponent(url.slice('local-resource://'.length));
  }
  return null;
}

/**
 * 获取供应商上传凭证
 */
async function getProviderCredential(): Promise<ProviderCredential> {
  const response = await api.get('/upload-configs/credential');
  if (!response.data?.success || !response.data?.data) {
    throw new Error('获取供应商凭证失败');
  }
  return response.data.data;
}

/**
 * 使用 Web Crypto API 解密 API Key
 * 与服务端 PBKDF2 + AES-256-GCM 加密方案对应
 */
async function decryptApiKey(
  encryptedApiKey: string,
  iv: string,
  authTag: string,
  userId: string
): Promise<string> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  // 导入密码材料
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(userId),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // PBKDF2 派生密钥
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(SALT),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH * 8 },
    false,
    ['decrypt']
  );

  // base64 → Uint8Array
  const ciphertext = Uint8Array.from(atob(encryptedApiKey), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const authTagBytes = Uint8Array.from(atob(authTag), c => c.charCodeAt(0));

  // Web Crypto AES-GCM 需要 ciphertext + authTag 拼接
  const combined = new Uint8Array(ciphertext.length + authTagBytes.length);
  combined.set(ciphertext);
  combined.set(authTagBytes, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    derivedKey,
    combined
  );

  return dec.decode(decrypted);
}

/**
 * 上传图片到供应商
 */
async function uploadImageToProvider(
  base64Data: string,
  fileName: string,
  mimeType: string,
  credential: ProviderCredential
): Promise<string> {
  // 获取用户 ID 用于解密
  const user = await window.electron.db.getUser();
  if (!user?.user_id) {
    throw new Error('未登录，无法解密上传凭证');
  }

  // 解密 API Key
  const apiKey = await decryptApiKey(
    credential.encryptedApiKey,
    credential.iv,
    credential.authTag,
    user.user_id
  );

  // 构建 FormData
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });

  const formData = new FormData();
  const fileFieldName = credential.config?.fileFieldName || 'file';
  formData.append(fileFieldName, blob, fileName);

  // 添加额外表单字段
  if (credential.config?.extraFormFields) {
    for (const [key, value] of Object.entries(credential.config.extraFormFields)) {
      formData.append(key, value);
    }
  }

  // 构建请求头
  const headers: Record<string, string> = {};
  if (credential.authType === 'bearer') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (credential.authType === 'api-key') {
    headers['X-API-Key'] = apiKey;
  }
  if (credential.config?.extraHeaders) {
    Object.assign(headers, credential.config.extraHeaders);
  }

  // 发送上传请求
  const response = await fetch(credential.uploadUrl, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`上传失败 (${response.status}): ${text}`);
  }

  const result = await response.json();

  // 从响应中提取图片 URL
  const remoteUrl = extractValueFromPath(result, credential.responseUrlPath);
  if (!remoteUrl || typeof remoteUrl !== 'string') {
    throw new Error(`无法从响应中提取 URL，路径: ${credential.responseUrlPath}`);
  }

  return remoteUrl;
}

/**
 * 从 JSON 对象中按点号路径提取值
 * 例如 extractValueFromPath({ data: { url: "xxx" } }, "data.url") => "xxx"
 */
function extractValueFromPath(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}