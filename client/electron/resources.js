"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadResource = downloadResource;
exports.getResourcePath = getResourcePath;
exports.ensureResourceDirectory = ensureResourceDirectory;
exports.deleteProjectResources = deleteProjectResources;

const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const database_1 = require("./database");

// 获取资源根目录
function getResourcesRoot() {
    const userDataPath = electron_1.app.getPath('userData');
    return path_1.default.join(userDataPath, 'resources');
}

// 确保资源目录存在
function ensureResourceDirectory(projectId, resourceType, characterId, sceneId) {
    const root = getResourcesRoot();
    let dir = path_1.default.join(root, 'projects', projectId);

    if (resourceType === 'character_avatar' || resourceType === 'digital_human') {
        dir = path_1.default.join(dir, 'characters', characterId);
        if (resourceType === 'digital_human') {
            dir = path_1.default.join(dir, 'digital-humans');
        }
    } else if (resourceType === 'scene_video' || resourceType === 'video_thumbnail') {
        dir = path_1.default.join(dir, 'scenes', sceneId);
    }

    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }

    return dir;
}

// 获取资源本地路径
function getResourcePath(projectId, resourceType, resourceId, characterId, sceneId, ext) {
    const dir = ensureResourceDirectory(projectId, resourceType, characterId, sceneId);

    let filename;
    if (resourceType === 'character_avatar') {
        filename = `avatar${ext}`;
    } else if (resourceType === 'digital_human') {
        filename = `${resourceId}${ext}`;
    } else if (resourceType === 'scene_video') {
        filename = `video${ext}`;
    } else if (resourceType === 'video_thumbnail') {
        filename = `thumbnail${ext}`;
    } else {
        filename = `${resourceId}${ext}`;
    }

    return path_1.default.join(dir, filename);
}

// 从 URL 获取文件扩展名
function getExtensionFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const ext = path_1.default.extname(pathname);
        return ext || '.jpg'; // 默认使用 .jpg
    } catch (error) {
        return '.jpg';
    }
}

// 下载资源文件
async function downloadResource(params) {
    const { url, resourceType, resourceId, projectId, characterId, sceneId } = params;

    try {
        // 检查是否已经下载过
        const existing = (0, database_1.getResourceDownload)(resourceType, resourceId);
        if (existing && existing.status === 'completed' && existing.localPath && fs_1.default.existsSync(existing.localPath)) {
            return {
                success: true,
                localPath: existing.localPath,
            };
        }

        // 获取文件扩展名
        const ext = getExtensionFromUrl(url);

        // 确定本地路径
        const localPath = getResourcePath(projectId, resourceType, resourceId, characterId, sceneId, ext);

        // 保存下载记录（pending 状态）
        (0, database_1.saveResourceDownload)({
            resourceType,
            resourceId,
            remoteUrl: url,
            localPath: null,
            status: 'pending',
            errorMessage: null,
            fileSize: null,
            downloadedSize: 0,
        });

        // 开始下载
        await downloadFile(url, localPath, (downloaded, total) => {
            // 更新下载进度
            (0, database_1.updateResourceDownload)(resourceType, resourceId, {
                status: 'downloading',
                downloadedSize: downloaded,
            });
        });

        // 下载完成，更新状态
        const stats = fs_1.default.statSync(localPath);
        (0, database_1.updateResourceDownload)(resourceType, resourceId, {
            localPath,
            status: 'completed',
            downloadedSize: stats.size,
        });

        return {
            success: true,
            localPath,
        };
    } catch (error) {
        console.error('Error downloading resource:', error);

        // 更新失败状态
        (0, database_1.updateResourceDownload)(resourceType, resourceId, {
            status: 'failed',
            errorMessage: error.message,
        });

        return {
            success: false,
            error: error.message,
        };
    }
}

// 下载文件的核心函数
function downloadFile(url, dest, onProgress) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https_1.default : http_1.default;

        const file = fs_1.default.createWriteStream(dest);
        let downloadedSize = 0;

        const request = protocol.get(url, (response) => {
            // 处理重定向
            if (response.statusCode === 301 || response.statusCode === 302) {
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    file.close();
                    fs_1.default.unlinkSync(dest);
                    downloadFile(redirectUrl, dest, onProgress)
                        .then(resolve)
                        .catch(reject);
                    return;
                }
            }

            if (response.statusCode !== 200) {
                file.close();
                fs_1.default.unlinkSync(dest);
                reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
                return;
            }

            const totalSize = parseInt(response.headers['content-length'] || '0', 10);

            response.on('data', (chunk) => {
                downloadedSize += chunk.length;
                if (onProgress) {
                    onProgress(downloadedSize, totalSize);
                }
            });

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve();
            });
        });

        request.on('error', (err) => {
            file.close();
            if (fs_1.default.existsSync(dest)) {
                fs_1.default.unlinkSync(dest);
            }
            reject(err);
        });

        file.on('error', (err) => {
            file.close();
            if (fs_1.default.existsSync(dest)) {
                fs_1.default.unlinkSync(dest);
            }
            reject(err);
        });
    });
}

// 删除项目的所有资源文件
function deleteProjectResources(projectId) {
    try {
        const root = getResourcesRoot();
        const projectDir = path_1.default.join(root, 'projects', projectId);

        if (fs_1.default.existsSync(projectDir)) {
            fs_1.default.rmSync(projectDir, { recursive: true, force: true });
        }

        return true;
    } catch (error) {
        console.error('Error deleting project resources:', error);
        return false;
    }
}
