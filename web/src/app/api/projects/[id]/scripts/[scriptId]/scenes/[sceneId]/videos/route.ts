import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-middleware';
import { logOrUpdateAIUsage } from '@/lib/services/ai-usage-service';

// GET /api/projects/[id]/scripts/[scriptId]/scenes/[sceneId]/videos
// 获取场景的所有历史视频
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scriptId: string; sceneId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { id: projectId, scriptId, sceneId } = await params;

    // 验证项目和剧本存在
    const script = await prisma.projectScript.findFirst({
      where: {
        id: scriptId,
        projectId,
        project: {
          userId: user.id,
        },
      },
    });

    if (!script) {
      return NextResponse.json({ error: '剧本不存在' }, { status: 404 });
    }

    // 验证场景存在
    const scene = await prisma.scriptScene.findFirst({
      where: {
        id: sceneId,
        scriptId,
      },
    });

    if (!scene) {
      return NextResponse.json({ error: '场景不存在' }, { status: 404 });
    }

    // 获取场景的所有视频，按创建时间倒序
    const videos = await prisma.sceneVideo.findMany({
      where: {
        sceneId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 异步记录日志（不阻塞响应）
    // 使用 sceneId 作为 taskId 的一部分，确保同场景的轮询只记录一条
    const hasGenerating = videos.some(
      (v) => v.status === 'pending' || v.status === 'generating'
    );
    if (hasGenerating) {
      logVideoPollUsage(user, projectId, sceneId, videos).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      data: videos,
    });
  } catch (error) {
    console.error('获取场景视频列表失败:', error);
    return NextResponse.json(
      { error: '获取场景视频列表失败' },
      { status: 500 }
    );
  }
}

/**
 * 异步记录视频轮询日志
 * 同一个 sceneId 的轮询只创建一条日志，后续请求累加 requestCount
 */
async function logVideoPollUsage(
  user: { id: string; tenantId?: string | null },
  projectId: string,
  sceneId: string,
  videos: { id: string; status: string; taskId: string | null }[]
) {
  try {
    // 获取 VIDEO 类型的模型配置
    const videoConfig = await prisma.aIModelConfig.findFirst({
      where: {
        modelType: 'VIDEO',
        isActive: true,
        tenantId: user.tenantId || undefined,
      },
    });

    if (!videoConfig) return;

    const taskId = `video-poll-${sceneId}`;

    await logOrUpdateAIUsage({
      tenantId: user.tenantId || null,
      userId: user.id,
      projectId,
      modelType: 'VIDEO',
      modelConfigId: videoConfig.id,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      latencyMs: 0,
      status: 'SUCCESS',
      taskId,
      requestUrl: `/api/projects/${projectId}/scripts/*/scenes/${sceneId}/videos`,
      requestBody: {
        type: 'poll',
        sceneId,
      },
      responseBody: {
        type: 'poll',
        videoCount: videos.length,
        statuses: videos.map((v) => ({ id: v.id, status: v.status })),
      },
    });
  } catch (error) {
    console.error('记录视频轮询日志失败:', error);
  }
}
