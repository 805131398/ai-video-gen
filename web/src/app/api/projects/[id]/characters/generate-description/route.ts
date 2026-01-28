import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { createAIClient } from "@/lib/ai/client";
import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";
import { AIModelType } from "@/generated/prisma/enums";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/projects/[id]/characters/generate-description - AI 生成角色描述
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: projectId } = await context.params;

    // 验证项目所有权
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
      include: {
        theme: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "项目不存在或无权访问" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { characterName } = body;

    if (!characterName) {
      return NextResponse.json(
        { error: "角色名称不能为空" },
        { status: 400 }
      );
    }

    // 获取 AI 配置
    const config = await getEffectiveAIConfig(
      AIModelType.TEXT,
      user.id,
      user.tenantId
    );

    if (!config) {
      return NextResponse.json(
        { error: "未找到可用的 AI 配置" },
        { status: 500 }
      );
    }

    // 构建提示词
    const themeName = project.theme?.name || project.themeName || "通用";
    const themeDesc = project.theme?.description || project.themeDesc || "";

    const systemPrompt = `你是一个专业的角色设定专家。请根据角色名称和项目主题，生成详细的角色描述。

要求：
1. 描述要具体、生动，包含外貌、年龄、性格、穿着等特征
2. 描述要符合项目主题风格
3. 描述要适合用于 AI 图像生成，保持角色一致性
4. 字数控制在 50-150 字之间
5. 只输出角色描述内容，不要其他说明`;

    const prompt = `项目主题：${themeName}
${themeDesc ? `主题描述：${themeDesc}\n` : ""}
角色名称：${characterName}

请生成该角色的详细描述：`;

    // 调用 AI 生成
    const client = createAIClient(config);
    const description = await client.generateText(prompt, systemPrompt, {
      temperature: 0.7,
    });

    return NextResponse.json({
      description: description.trim(),
    });
  } catch (error) {
    console.error("AI 生成角色描述失败:", error);
    return NextResponse.json(
      { error: "生成失败，请重试" },
      { status: 500 }
    );
  }
}
