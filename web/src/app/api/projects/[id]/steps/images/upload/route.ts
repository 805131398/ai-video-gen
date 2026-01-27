import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StepStatus } from "@/generated/prisma/enums";
import { StorageFactory } from "@/lib/storage";

// POST /api/projects/[id]/steps/images/upload - 上传图片
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: projectId } = await params;

    // 验证项目归属
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      include: { versions: { where: { isMain: true }, take: 1 } },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const versionId = project.currentVersionId || project.versions[0]?.id;
    if (!versionId) {
      return NextResponse.json({ error: "版本不存在" }, { status: 404 });
    }

    // 解析上传的文件
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "请选择要上传的图片" }, { status: 400 });
    }

    // 获取或创建图片步骤
    const imageStep = await prisma.projectStep.upsert({
      where: {
        versionId_stepType: { versionId, stepType: "IMAGE_SELECT" },
      },
      create: {
        versionId,
        stepType: "IMAGE_SELECT",
        status: StepStatus.IN_PROGRESS,
      },
      update: {},
    });

    // 使用本地存储服务上传文件
    const storageAdapter = StorageFactory.getAdapter();
    const uploadedImages: { url: string; name: string }[] = [];

    for (const file of files) {
      // 验证文件类型
      if (!file.type.startsWith("image/")) {
        continue;
      }

      // 限制文件大小（20MB）
      if (file.size > 20 * 1024 * 1024) {
        continue;
      }

      try {
        // 读取文件内容
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 生成存储 key
        const key = StorageFactory.generateKey(
          session.user.tenantId || 'default',
          'project-images',
          file.name
        );

        // 上传到本地存储
        const result = await storageAdapter.upload(buffer, key, file.type);

        uploadedImages.push({
          url: result.url,
          name: file.name,
        });
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        // 继续处理其他文件
      }
    }

    if (uploadedImages.length === 0) {
      return NextResponse.json({ error: "没有有效的图片文件" }, { status: 400 });
    }

    // 添加上传的图片选项
    await prisma.stepOption.createMany({
      data: uploadedImages.map((img, i) => ({
        stepId: imageStep.id,
        assetUrl: img.url,
        metadata: { source: "upload", fileName: img.name },
        sortOrder: Date.now() + i,
      })),
    });

    // 更新版本当前步骤
    await prisma.projectVersion.update({
      where: { id: versionId },
      data: { currentStep: "IMAGE_SELECT" },
    });

    return NextResponse.json({
      success: true,
      count: uploadedImages.length,
    });
  } catch (error) {
    console.error("上传图片失败:", error);
    const message = error instanceof Error ? error.message : "上传失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
