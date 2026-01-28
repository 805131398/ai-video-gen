import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// PATCH /api/projects/[id]/scripts/[scriptId]/scenes/[sceneId]/videos/[videoId]/select
// 选择视频（标记为 isSelected）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scriptId: string; sceneId: string; videoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { id: projectId, scriptId, sceneId, videoId } = await params;

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

    // 验证视频存在
    const video = await prisma.sceneVideo.findFirst({
      where: {
        id: videoId,
        sceneId,
      },
    });

    if (!video) {
      return NextResponse.json({ error: '视频不存在' }, { status: 404 });
    }

    // 使用事务：先取消该场景所有视频的选中状态，再选中指定视频
    await prisma.$transaction([
      // 取消该场景所有视频的选中状态
      prisma.sceneVideo.updateMany({
        where: {
          sceneId,
        },
        data: {
          isSelected: false,
        },
      }),
      // 选中指定视频
      prisma.sceneVideo.update({
        where: {
          id: videoId,
        },
        data: {
          isSelected: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: '视频已选中',
    });
  } catch (error) {
    console.error('选择视频失败:', error);
    return NextResponse.json(
      { error: '选择视频失败' },
      { status: 500 }
    );
  }
}
