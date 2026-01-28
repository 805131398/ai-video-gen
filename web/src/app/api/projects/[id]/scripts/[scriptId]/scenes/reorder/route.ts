import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scriptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { id: projectId, scriptId } = await params;
    const { sceneIds } = await request.json();

    if (!Array.isArray(sceneIds)) {
      return NextResponse.json({ error: '无效的场景 ID 列表' }, { status: 400 });
    }

    // 验证剧本归属
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

    // 批量更新场景排序
    await Promise.all(
      sceneIds.map((sceneId, index) =>
        prisma.scriptScene.updateMany({
          where: {
            id: sceneId,
            scriptId,
          },
          data: {
            sortOrder: index,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新场景排序失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
