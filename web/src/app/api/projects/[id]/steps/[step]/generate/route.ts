import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StepType, StepStatus } from "@/generated/prisma/enums";
import { ROUTE_TO_STEP, type RouteStep } from "@/types/ai-video";
import { generateTitles, generateCopywriting } from "@/lib/ai/text-generator";

// 步骤生成逻辑映射
async function generateStepContent(
  step: RouteStep,
  projectId: string,
  versionId: string,
  body: Record<string, unknown>,
  userId: string,
  tenantId?: string | null
) {
  const stepType = ROUTE_TO_STEP[step];

  switch (step) {
    case "topic": {
      // 保存主题并生成标题
      const { topic } = body as { topic: string };
      if (!topic?.trim()) {
        throw new Error("主题不能为空");
      }

      // 更新项目主题
      await prisma.project.update({
        where: { id: projectId },
        data: { topic: topic.trim() },
      });

      // 直接调用标题生成函数
      const titles = await generateTitles(
        { topic: topic.trim(), count: 5 },
        userId,
        tenantId
      );

      // 创建或更新标题选择步骤
      const titleStep = await prisma.projectStep.upsert({
        where: {
          versionId_stepType: { versionId, stepType: "TITLE_SELECT" },
        },
        create: {
          versionId,
          stepType: "TITLE_SELECT",
          status: StepStatus.COMPLETED,
        },
        update: {
          status: StepStatus.COMPLETED,
        },
      });

      // 删除旧选项并创建新选项
      await prisma.stepOption.deleteMany({ where: { stepId: titleStep.id } });
      await prisma.stepOption.createMany({
        data: titles.map((t, i) => ({
          stepId: titleStep.id,
          content: t.content,
          sortOrder: i,
        })),
      });

      // 更新版本当前步骤
      await prisma.projectVersion.update({
        where: { id: versionId },
        data: { currentStep: "TITLE_SELECT" },
      });

      return { success: true, step: "title" };
    }

    case "attributes": {
      // 保存属性并生成文案
      const { attributes } = body as { attributes: Record<string, string> };

      // 获取已选标题
      const titleStep = await prisma.projectStep.findFirst({
        where: { versionId, stepType: "TITLE_SELECT" },
        include: { options: { where: { isSelected: true } } },
      });

      const selectedTitle = titleStep?.options[0]?.content || "";
      const project = await prisma.project.findUnique({ where: { id: projectId } });

      // 直接调用文案生成函数
      const copies = await generateCopywriting(
        {
          topic: project?.topic || "",
          title: selectedTitle,
          attributes,
          count: 3,
        },
        userId,
        tenantId
      );

      // 保存属性步骤
      await prisma.projectStep.upsert({
        where: {
          versionId_stepType: { versionId, stepType: "ATTRIBUTE_SET" },
        },
        create: {
          versionId,
          stepType: "ATTRIBUTE_SET",
          attributes,
          status: StepStatus.COMPLETED,
        },
        update: {
          attributes,
          status: StepStatus.COMPLETED,
        },
      });

      // 创建文案选择步骤
      const copyStep = await prisma.projectStep.upsert({
        where: {
          versionId_stepType: { versionId, stepType: "COPY_SELECT" },
        },
        create: {
          versionId,
          stepType: "COPY_SELECT",
          status: StepStatus.COMPLETED,
        },
        update: {
          status: StepStatus.COMPLETED,
        },
      });

      // 删除旧选项并创建新选项
      await prisma.stepOption.deleteMany({ where: { stepId: copyStep.id } });
      await prisma.stepOption.createMany({
        data: copies.map((c, i) => ({
          stepId: copyStep.id,
          content: c.content,
          sortOrder: i,
        })),
      });

      // 更新版本当前步骤
      await prisma.projectVersion.update({
        where: { id: versionId },
        data: { currentStep: "COPY_SELECT" },
      });

      return { success: true, step: "copy" };
    }

    case "copy": {
      // 选择文案后生成图片
      const { copyId } = body as { copyId: string };

      // 获取选中的文案内容
      const copyStep = await prisma.projectStep.findFirst({
        where: { versionId, stepType: "COPY_SELECT" },
        include: { options: true },
      });

      const selectedCopy = copyStep?.options.find((o) => o.id === copyId);
      if (!selectedCopy) {
        throw new Error("文案不存在");
      }

      // 更新选中状态
      await prisma.stepOption.updateMany({
        where: { stepId: copyStep!.id },
        data: { isSelected: false },
      });
      await prisma.stepOption.update({
        where: { id: copyId },
        data: { isSelected: true },
      });
      await prisma.projectStep.update({
        where: { id: copyStep!.id },
        data: { selectedOptionId: copyId },
      });

      // 调用图片生成 API
      const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copyContent: selectedCopy.content, count: 4 }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "生成图片失败");
      }

      const data = await res.json();
      const images = data.images || [];

      // 创建图片选择步骤
      const imageStep = await prisma.projectStep.upsert({
        where: {
          versionId_stepType: { versionId, stepType: "IMAGE_SELECT" },
        },
        create: {
          versionId,
          stepType: "IMAGE_SELECT",
          status: StepStatus.COMPLETED,
        },
        update: {
          status: StepStatus.COMPLETED,
        },
      });

      // 删除旧选项并创建新选项
      await prisma.stepOption.deleteMany({ where: { stepId: imageStep.id } });
      await prisma.stepOption.createMany({
        data: images.map((img: { id: string; imageUrl: string }, i: number) => ({
          stepId: imageStep.id,
          assetUrl: img.imageUrl,
          sortOrder: i,
        })),
      });

      // 更新版本当前步骤
      await prisma.projectVersion.update({
        where: { id: versionId },
        data: { currentStep: "IMAGE_SELECT" },
      });

      return { success: true, step: "images" };
    }

    case "images": {
      // 选择图片后生成视频
      const { imageIds } = body as { imageIds: string[] };

      // 获取图片步骤
      const imageStep = await prisma.projectStep.findFirst({
        where: { versionId, stepType: "IMAGE_SELECT" },
        include: { options: true },
      });

      if (!imageStep) {
        throw new Error("图片步骤不存在");
      }

      // 更新选中状态
      await prisma.stepOption.updateMany({
        where: { stepId: imageStep.id },
        data: { isSelected: false },
      });
      await prisma.stepOption.updateMany({
        where: { id: { in: imageIds } },
        data: { isSelected: true },
      });

      const selectedImages = imageStep.options.filter((o) => imageIds.includes(o.id));
      const imageUrls = selectedImages.map((img) => img.assetUrl).filter(Boolean);

      // 调用视频生成 API
      const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls, count: imageUrls.length }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "生成视频失败");
      }

      const data = await res.json();
      const videos = data.videos || [];

      // 创建视频选择步骤
      const videoStep = await prisma.projectStep.upsert({
        where: {
          versionId_stepType: { versionId, stepType: "VIDEO_SELECT" },
        },
        create: {
          versionId,
          stepType: "VIDEO_SELECT",
          status: StepStatus.COMPLETED,
        },
        update: {
          status: StepStatus.COMPLETED,
        },
      });

      // 删除旧选项并创建新选项
      await prisma.stepOption.deleteMany({ where: { stepId: videoStep.id } });
      await prisma.stepOption.createMany({
        data: videos.map((v: { videoUrl: string; thumbnailUrl: string; duration: number }, i: number) => ({
          stepId: videoStep.id,
          assetUrl: v.videoUrl,
          metadata: { thumbnailUrl: v.thumbnailUrl, duration: v.duration },
          sortOrder: i,
        })),
      });

      // 更新版本当前步骤
      await prisma.projectVersion.update({
        where: { id: versionId },
        data: { currentStep: "VIDEO_SELECT" },
      });

      return { success: true, step: "videos" };
    }

    case "voice": {
      // 配音配置后生成配音
      const { voiceId, speed, pitch } = body as { voiceId: string; speed: number; pitch: number };

      // 获取选中的文案
      const copyStep = await prisma.projectStep.findFirst({
        where: { versionId, stepType: "COPY_SELECT" },
        include: { options: { where: { isSelected: true } } },
      });

      const copyContent = copyStep?.options[0]?.content || "";

      // 调用配音生成 API
      const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: copyContent, voiceId, speed, pitch }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "生成配音失败");
      }

      // 保存配音配置步骤
      await prisma.projectStep.upsert({
        where: {
          versionId_stepType: { versionId, stepType: "VOICE_CONFIG" },
        },
        create: {
          versionId,
          stepType: "VOICE_CONFIG",
          attributes: { voiceId, speed, pitch },
          status: StepStatus.COMPLETED,
        },
        update: {
          attributes: { voiceId, speed, pitch },
          status: StepStatus.COMPLETED,
        },
      });

      // 更新版本当前步骤
      await prisma.projectVersion.update({
        where: { id: versionId },
        data: { currentStep: "COMPOSE" },
      });

      return { success: true, step: "compose" };
    }

    case "compose": {
      // 最终合成
      // 获取选中的视频
      const videoStep = await prisma.projectStep.findFirst({
        where: { versionId, stepType: "VIDEO_SELECT" },
        include: { options: { where: { isSelected: true } } },
      });

      const videoIds = videoStep?.options.map((o) => o.id) || [];

      // 获取配音配置
      const voiceStep = await prisma.projectStep.findFirst({
        where: { versionId, stepType: "VOICE_CONFIG" },
      });

      const voiceConfig = voiceStep?.attributes as { voiceId: string; speed: number; pitch: number } | null;

      // 调用合成 API
      const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/compose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoIds, voiceConfig }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "视频合成失败");
      }

      const data = await res.json();

      // 创建合成步骤
      const composeStep = await prisma.projectStep.upsert({
        where: {
          versionId_stepType: { versionId, stepType: "COMPOSE" },
        },
        create: {
          versionId,
          stepType: "COMPOSE",
          status: StepStatus.COMPLETED,
        },
        update: {
          status: StepStatus.COMPLETED,
        },
      });

      // 保存合成结果
      await prisma.stepOption.deleteMany({ where: { stepId: composeStep.id } });
      await prisma.stepOption.create({
        data: {
          stepId: composeStep.id,
          assetUrl: data.videoUrl,
          isSelected: true,
        },
      });

      // 更新项目状态
      await prisma.project.update({
        where: { id: projectId },
        data: {
          finalVideoUrl: data.videoUrl,
          status: "COMPLETED",
        },
      });

      return { success: true, videoUrl: data.videoUrl };
    }

    default:
      throw new Error(`不支持的步骤: ${step}`);
  }
}

// POST /api/projects/[id]/steps/[step]/generate - 触发步骤生成
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; step: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: projectId, step } = await params;
    const body = await request.json();

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

    // 验证步骤类型
    const validSteps: RouteStep[] = ["topic", "title", "attributes", "copy", "images", "videos", "voice", "compose"];
    if (!validSteps.includes(step as RouteStep)) {
      return NextResponse.json({ error: "无效的步骤" }, { status: 400 });
    }

    const result = await generateStepContent(
      step as RouteStep,
      projectId,
      versionId,
      body,
      session.user.id,
      session.user.tenantId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("步骤生成失败:", error);
    const message = error instanceof Error ? error.message : "生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
