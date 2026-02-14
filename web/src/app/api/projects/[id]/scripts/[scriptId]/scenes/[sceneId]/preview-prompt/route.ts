import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { buildVideoPrompt } from "@/lib/services/video-prompt-builder";

interface PreviewPromptRequest {
  promptType?: "smart_combine" | "ai_optimized";
  useStoryboard?: boolean;
  useCharacterImage?: boolean;
  withVoice?: boolean;
  voiceLanguage?: "zh" | "en";
}

/**
 * POST /api/projects/[id]/scripts/[scriptId]/scenes/[sceneId]/preview-prompt
 * 预览视频生成提示词（不实际生成视频）
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; scriptId: string; sceneId: string }>;
  }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: projectId, scriptId, sceneId } = await params;
    const body: PreviewPromptRequest = await request.json();
    const promptType = body.promptType || "smart_combine";
    const useStoryboard = body.useStoryboard || false;
    const useCharacterImage = body.useCharacterImage !== false;
    const withVoice = body.withVoice !== false; // 默认 true
    const voiceLanguage = body.voiceLanguage || "zh"; // 默认中文

    // 查询场景（含项目和角色）
    const scene = await prisma.scriptScene.findFirst({
      where: {
        id: sceneId,
        scriptId,
        script: {
          projectId,
          project: { userId: user.id },
        },
      },
      include: {
        script: {
          include: {
            project: {
              include: { characters: true },
            },
          },
        },
      },
    });

    if (!scene) {
      return NextResponse.json(
        { error: "场景不存在或无权访问" },
        { status: 404 }
      );
    }

    // 计算时长
    const requestedDuration = scene.duration || 10;
    const finalDuration = requestedDuration <= 12 ? 10 : 15;

    // 构建提示词
    let prompt: { en: string; zh: string };
    if (useStoryboard) {
      const storyboard = buildSceneStoryboardPrompt(scene, finalDuration);
      prompt = { en: storyboard, zh: "" };
    } else {
      prompt = await buildVideoPrompt({
        type: promptType,
        scene,
        characters: scene.script.project.characters,
        userId: user.id,
        tenantId: user.tenantId,
        withVoice,
        voiceLanguage,
      });
    }

    // 获取角色信息
    let characterInfo: {
      characterId?: string;
      characterName?: string;
      digitalHumanId?: string;
      referenceImage?: string;
      imageSource?: "digital_human" | "avatar";
    } = {};

    if (useCharacterImage) {
      const content = scene.content as any;
      const characterId = content.characterId;
      if (characterId) {
        const character = scene.script.project.characters.find(
          (c) => c.id === characterId
        );
        if (character) {
          characterInfo.characterId = character.id;
          characterInfo.characterName = character.name;

          const selectedDHId = (character.attributes as any)?.digitalHumanId as
            | string
            | undefined;
          let dh = selectedDHId
            ? await prisma.digitalHuman.findUnique({
                where: { id: selectedDHId },
              })
            : await prisma.digitalHuman.findFirst({
                where: { characterId: character.id },
                orderBy: { createdAt: "desc" },
              });

          if (dh) {
            characterInfo.digitalHumanId = dh.id;
            characterInfo.referenceImage = dh.imageUrl;
            characterInfo.imageSource = "digital_human";
          } else if (character.avatarUrl) {
            characterInfo.referenceImage = character.avatarUrl;
            characterInfo.imageSource = "avatar";
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      prompt,
      characterInfo,
    });
  } catch (error) {
    console.error("Preview prompt error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "预览提示词失败" },
      { status: 500 }
    );
  }
}

/**
 * 构建场景的故事板格式 prompt（与 generate-video 中逻辑一致）
 */
function buildSceneStoryboardPrompt(scene: any, finalDuration: number): string {
  const content = scene.content as any;
  const description = content.description || "";
  const actions = content.actions || {};
  const camera = content.camera || {};
  const visual = content.visual || {};
  const dialogues = content.dialogues || [];

  let sceneDescription = description;
  if (actions.main) sceneDescription += `. ${actions.main}`;
  if (camera.description) sceneDescription += `. Camera: ${camera.description}`;
  if (visual.description) sceneDescription += `. Visual: ${visual.description}`;
  if (dialogues.length > 0) {
    const dialogue = dialogues[0];
    sceneDescription += `. ${dialogue.speaker}: "${dialogue.text}"`;
  }

  return `Shot 1:\nduration: ${finalDuration}sec\nScene: ${sceneDescription}`;
}
