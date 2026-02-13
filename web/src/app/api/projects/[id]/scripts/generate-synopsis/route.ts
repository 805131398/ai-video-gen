import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";
import { withUsageLogging } from "@/lib/services/ai-usage-service";
import { AIModelType } from "@/generated/prisma/enums";
import { createAIClient } from "@/lib/ai/client";

// Token 估算辅助函数
function estimateTokenCount(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

// POST /api/projects/[id]/scripts/generate-synopsis - AI 生成脚本大概
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { characterIds, tone, existingSynopsis } = body;

    // 验证参数
    if (!characterIds || !Array.isArray(characterIds) || characterIds.length === 0) {
      return NextResponse.json(
        { error: "请至少选择一个角色" },
        { status: 400 }
      );
    }

    // 验证项目归属
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 获取角色信息
    const characters = await prisma.projectCharacter.findMany({
      where: {
        id: { in: characterIds },
        projectId: id,
      },
    });

    if (characters.length === 0) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    // 获取 AI 配置
    const config = await getEffectiveAIConfig(
      AIModelType.TEXT,
      user.id,
      user.tenantId || undefined
    );

    if (!config) {
      return NextResponse.json(
        { error: "未找到可用的文本生成 AI 配置" },
        { status: 500 }
      );
    }

    // 构建角色描述
    const characterDescriptions = characters
      .map((char) => `- ${char.name}: ${char.description}`)
      .join("\n");

    // 构建提示词
    const systemPrompt = `你是一个专业的短视频剧本创作专家。请根据项目信息和角色设定，生成一个简洁的剧本大概。

要求：
- 剧本大概应该是 100-300 字的简短描述
- 描述剧本的核心故事线和主要情节
- 体现角色特点和关系
- 符合短视频的节奏和风格
${tone ? `- 基调风格：${tone}` : ""}

重要要求（结尾引导话术）：
- 必须在剧本大概的结尾添加引导性话术，这是短视频营销的关键环节
- 引导话术要根据内容类型智能调整，自然融入故事
- 引导话术的核心结构：
  1. 先描述问题得到解决或目标达成（如：XX终于好了、技术提升了、找到了好方法等）
  2. 表达愿意帮助他人的真诚态度
  3. 使用"咨询"、"交流"、"聊聊"、"推荐"等温和的词汇
  4. 避免过于商业化的表达

不同类型内容的引导话术示例：

【健康疾病类】
"XX的病终于稳定下来了，如果有同样问题的朋友还有这种困扰的话可以找我咨询，只为帮助每一位朋友。"

【产品评测类】
"用了这个XX后效果真的很明显，如果你也想提升XX可以找我交流，我会分享更多使用心得。"
"这款XX确实解决了我的问题，如果你也在纠结选什么产品，可以来找我聊聊，帮你少走弯路。"

【美食探店类】
"这家店的味道真的很棒，如果你也想知道更多好吃的地方可以找我推荐，我会持续分享。"

【技能教学类】
"通过这个方法我的XX技术提升了很多，如果你也想学习可以找我交流，一起进步。"

【生活经验类】
"这个方法真的帮我解决了大问题，如果你也遇到类似的困扰，欢迎找我聊聊，希望能帮到你。"

【旅游攻略类】
"这次旅行的体验太棒了，如果你也想了解更多旅游攻略可以找我交流，我会分享更多实用信息。"

话术要点：
- 要自然融入故事，不能生硬
- 要体现真诚帮助的态度，不是推销
- 要根据内容类型调整具体表达
- 要使用温和、友好的语气

特殊情况：
- 如果用户在项目主题或描述中明确提到"不要引导话术"、"不要结尾引导"、"不需要引导"等，则不添加引导话术
- 否则默认必须添加引导话术

- 只输出剧本大概内容，不要其他说明`;

    const prompt = `项目主题：${project.topic}
${project.themeName ? `主题名称：${project.themeName}` : ""}
${project.themeDesc ? `主题描述：${project.themeDesc}` : ""}

角色设定：
${characterDescriptions}

${existingSynopsis ? `用户已输入的内容：\n${existingSynopsis}\n\n请基于用户已输入的内容进行扩展、续写或完善，保持风格和内容的连贯性。如果用户输入的内容已经比较完整，可以适当润色并确保添加结尾引导话术。\n\n` : ""}请生成剧本大概：`;

    // 调用 AI 生成（带日志记录）
    const synopsis = await withUsageLogging(
      {
        tenantId: user.tenantId,
        userId: user.id,
        projectId: id,
        modelType: "TEXT",
        modelConfigId: config.id,
        taskId: `synopsis-${Date.now()}`,
      },
      async () => {
        const client = createAIClient(config);
        const result = await client.generateText(prompt, systemPrompt, {
          temperature: 0.7,
        });

        return {
          result: result.trim(),
          inputTokens: estimateTokenCount(prompt + systemPrompt),
          outputTokens: estimateTokenCount(result),
          requestUrl: config.apiUrl,
          requestBody: { prompt, systemPrompt, characterIds, tone },
          responseBody: { synopsis: result.trim() },
        };
      }
    );

    return NextResponse.json({ synopsis });
  } catch (error) {
    console.error("生成脚本大概失败:", error);
    const message = error instanceof Error ? error.message : "生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
