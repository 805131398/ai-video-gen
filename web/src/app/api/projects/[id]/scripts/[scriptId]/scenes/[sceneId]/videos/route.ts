import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/projects/[id]/scripts/[scriptId]/scenes/[sceneId]/videos
// 获取场景的所有历史视频
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scriptId: string; sceneId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { id: projectId, scriptId, sceneId } = await params;

    // 验证项目和剧本存在
    const script = await prisma.projectScript.findFirst({
      where: {
        id: scriptId,
        projectId,
        project: {
          userId: session.user.id,
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
