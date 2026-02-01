import {
  Project,
  ProjectCharacter,
  DigitalHuman,
  ProjectScript,
  ScriptScene,
  SceneVideo,
  DownloadResourceParams,
} from '../types';

/**
 * 本地数据服务
 * 负责将服务端数据同步到本地数据库，并下载资源文件
 */

// ==================== 项目管理 ====================

/**
 * 同步项目到本地
 */
export async function syncProjectToLocal(project: Project): Promise<boolean> {
  try {
    // 保存项目基本信息
    await window.electron.db.saveProject(project);

    // 如果有角色，同步角色数据
    if (project.characters && project.characters.length > 0) {
      for (const character of project.characters) {
        await syncCharacterToLocal(project.id, character);
      }
    }

    return true;
  } catch (error) {
    console.error('Error syncing project to local:', error);
    return false;
  }
}

/**
 * 从本地获取项目
 */
export async function getProjectFromLocal(projectId: string): Promise<Project | null> {
  try {
    const project = await window.electron.db.getProject(projectId);
    if (!project) return null;

    // 加载角色数据
    const characters = await window.electron.db.getProjectCharacters(projectId);

    // 为每个角色加载数字人
    for (const character of characters) {
      character.digitalHumans = await window.electron.db.getDigitalHumans(character.id);
    }

    project.characters = characters;
    return project;
  } catch (error) {
    console.error('Error getting project from local:', error);
    return null;
  }
}

/**
 * 从本地获取所有项目
 */
export async function getProjectsFromLocal(): Promise<Project[]> {
  try {
    return await window.electron.db.getProjects();
  } catch (error) {
    console.error('Error getting projects from local:', error);
    return [];
  }
}

/**
 * 从本地删除项目
 */
export async function deleteProjectFromLocal(projectId: string): Promise<boolean> {
  try {
    return await window.electron.db.deleteProject(projectId);
  } catch (error) {
    console.error('Error deleting project from local:', error);
    return false;
  }
}

// ==================== 角色管理 ====================

/**
 * 同步角色到本地
 */
export async function syncCharacterToLocal(
  projectId: string,
  character: ProjectCharacter
): Promise<boolean> {
  try {
    // 保存角色基本信息
    await window.electron.db.saveCharacter(character);

    // 下载头像（如果有）
    if (character.avatarUrl) {
      downloadResourceInBackground({
        url: character.avatarUrl,
        resourceType: 'character_avatar',
        resourceId: character.id,
        projectId,
        characterId: character.id,
      });
    }

    // 同步数字人数据
    if (character.digitalHumans && character.digitalHumans.length > 0) {
      for (const dh of character.digitalHumans) {
        await syncDigitalHumanToLocal(projectId, character.id, dh);
      }
    }

    return true;
  } catch (error) {
    console.error('Error syncing character to local:', error);
    return false;
  }
}

/**
 * 从本地获取项目角色
 */
export async function getCharactersFromLocal(projectId: string): Promise<ProjectCharacter[]> {
  try {
    const characters = await window.electron.db.getProjectCharacters(projectId);

    // 为每个角色加载数字人
    for (const character of characters) {
      character.digitalHumans = await window.electron.db.getDigitalHumans(character.id);
    }

    return characters;
  } catch (error) {
    console.error('Error getting characters from local:', error);
    return [];
  }
}

// ==================== 数字人管理 ====================

/**
 * 同步数字人到本地
 */
export async function syncDigitalHumanToLocal(
  projectId: string,
  characterId: string,
  digitalHuman: DigitalHuman
): Promise<boolean> {
  try {
    // 保存数字人基本信息
    await window.electron.db.saveDigitalHuman(digitalHuman);

    // 下载数字人图片
    if (digitalHuman.imageUrl) {
      downloadResourceInBackground({
        url: digitalHuman.imageUrl,
        resourceType: 'digital_human',
        resourceId: digitalHuman.id,
        projectId,
        characterId,
      });
    }

    return true;
  } catch (error) {
    console.error('Error syncing digital human to local:', error);
    return false;
  }
}

/**
 * 从本地获取数字人列表
 */
export async function getDigitalHumansFromLocal(characterId: string): Promise<DigitalHuman[]> {
  try {
    return await window.electron.db.getDigitalHumans(characterId);
  } catch (error) {
    console.error('Error getting digital humans from local:', error);
    return [];
  }
}

// ==================== 剧本管理 ====================

/**
 * 同步剧本到本地
 */
export async function syncScriptToLocal(script: ProjectScript): Promise<boolean> {
  try {
    await window.electron.db.saveScript(script);

    // 同步场景数据
    if (script.scenes && script.scenes.length > 0) {
      for (const scene of script.scenes) {
        await syncSceneToLocal(scene);
      }
    }

    return true;
  } catch (error) {
    console.error('Error syncing script to local:', error);
    return false;
  }
}

/**
 * 从本地获取项目剧本
 */
export async function getScriptsFromLocal(projectId: string): Promise<ProjectScript[]> {
  try {
    return await window.electron.db.getProjectScripts(projectId);
  } catch (error) {
    console.error('Error getting scripts from local:', error);
    return [];
  }
}

// ==================== 场景管理 ====================

/**
 * 同步场景到本地
 */
export async function syncSceneToLocal(scene: ScriptScene): Promise<boolean> {
  try {
    await window.electron.db.saveScene(scene);
    return true;
  } catch (error) {
    console.error('Error syncing scene to local:', error);
    return false;
  }
}

/**
 * 从本地获取剧本场景
 */
export async function getScenesFromLocal(scriptId: string): Promise<ScriptScene[]> {
  try {
    return await window.electron.db.getScriptScenes(scriptId);
  } catch (error) {
    console.error('Error getting scenes from local:', error);
    return [];
  }
}

// ==================== 场景视频管理 ====================

/**
 * 同步场景视频到本地
 */
export async function syncSceneVideoToLocal(
  projectId: string,
  sceneId: string,
  video: SceneVideo
): Promise<boolean> {
  try {
    await window.electron.db.saveSceneVideo(video);

    // 下载视频文件
    if (video.videoUrl) {
      downloadResourceInBackground({
        url: video.videoUrl,
        resourceType: 'scene_video',
        resourceId: video.id,
        projectId,
        sceneId,
      });
    }

    // 下载缩略图
    if (video.thumbnailUrl) {
      downloadResourceInBackground({
        url: video.thumbnailUrl,
        resourceType: 'video_thumbnail',
        resourceId: video.id,
        projectId,
        sceneId,
      });
    }

    return true;
  } catch (error) {
    console.error('Error syncing scene video to local:', error);
    return false;
  }
}

/**
 * 从本地获取场景视频
 */
export async function getSceneVideosFromLocal(sceneId: string): Promise<SceneVideo[]> {
  try {
    return await window.electron.db.getSceneVideos(sceneId);
  } catch (error) {
    console.error('Error getting scene videos from local:', error);
    return [];
  }
}

// ==================== 资源下载管理 ====================

/**
 * 后台下载资源（不阻塞）
 */
function downloadResourceInBackground(params: DownloadResourceParams): void {
  window.electron.resources
    .download(params)
    .then((result) => {
      if (!result.success) {
        console.error('Resource download failed:', params, result.error);
      }
    })
    .catch((error) => {
      console.error('Resource download error:', params, error);
    });
}

/**
 * 批量下载资源
 */
export async function batchDownloadResources(
  resources: DownloadResourceParams[]
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;

  const results = await Promise.allSettled(
    resources.map((params) => window.electron.resources.download(params))
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  return { succeeded, failed };
}

/**
 * 获取资源下载状态
 */
export async function getResourceDownloadStatus(
  resourceType: string,
  resourceId: string
) {
  try {
    return await window.electron.resources.getStatus(resourceType, resourceId);
  } catch (error) {
    console.error('Error getting resource download status:', error);
    return null;
  }
}

/**
 * 重试下载资源
 */
export async function retryResourceDownload(
  resourceType: string,
  resourceId: string
) {
  try {
    return await window.electron.resources.retry(resourceType, resourceId);
  } catch (error) {
    console.error('Error retrying resource download:', error);
    return { success: false, error: 'Retry failed' };
  }
}

/**
 * 获取本地资源路径（用于显示）
 */
export function getLocalResourceUrl(localPath: string | null, remoteUrl: string): string {
  // 优先使用本地路径
  if (localPath) {
    return `file://${localPath}`;
  }

  // 降级使用远程 URL
  return remoteUrl;
}
