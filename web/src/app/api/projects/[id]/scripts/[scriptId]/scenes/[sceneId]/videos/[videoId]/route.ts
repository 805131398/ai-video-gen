import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// DELETE /api/projects/[id]/scripts/[scriptId]/scenes/[sceneId]/videos/[videoId]
// 删除视频
export async function DELETE(
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

    // 删除视频
    await prisma.sceneVideo.delete({
      where: {
        id: videoId,
      },
    });

    // 如果删除的是选中的视频，自动选中最新的视频
    if (video.isSelected) {
      const latestVideo = await prisma.sceneVideo.findFirst({
        where: {
          sceneId,
          status: 'completed',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (latestVideo) {
        await prisma.sceneVideo.update({
          where: {
            id: latestVideo.id,
          },
          data: {
            isSelected: true,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: '视频已删除',
    });
  } catch (error) {
    console.error('删除视频失败:', error);
    return NextResponse.json(
      { error: '删除视频失败' },
      { status: 500 }
    );
  }
}
