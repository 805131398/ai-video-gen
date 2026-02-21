import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

type RouteContext = {
    params: Promise<{ id: string }>;
};

// GET /api/characters/[id] - 获取单个独立角色
export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const user = await getAuthUser(request);
        if (!user?.id) {
            return NextResponse.json({ error: "未授权" }, { status: 401 });
        }

        const { id: characterId } = await context.params;

        const character = await prisma.projectCharacter.findFirst({
            where: {
                id: characterId,
                userId: user.id,
            },
            include: {
                digitalHumans: true
            }
        });

        if (!character) {
            return NextResponse.json({ error: "角色不存在或无权访问" }, { status: 404 });
        }

        return NextResponse.json({ data: character });
    } catch (error) {
        console.error("获取角色失败:", error);
        return NextResponse.json({ error: "获取失败" }, { status: 500 });
    }
}

// PUT /api/characters/[id] - 更新独立角色
export async function PUT(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const user = await getAuthUser(request);
        if (!user?.id) {
            return NextResponse.json({ error: "未授权" }, { status: 401 });
        }

        const { id: characterId } = await context.params;

        const existingCharacter = await prisma.projectCharacter.findFirst({
            where: {
                id: characterId,
                userId: user.id,
            },
        });

        if (!existingCharacter) {
            return NextResponse.json(
                { error: "角色不存在或无权访问" },
                { status: 404 }
            );
        }

        const body = await request.json();
        const { name, description, avatarUrl, attributes, sortOrder, projectId } = body;

        // Optional: verification of projectId if they are associating it during update
        if (projectId) {
            const project = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    userId: user.id,
                },
            });
            if (!project) {
                return NextResponse.json(
                    { error: "项目不存在或无权访问" },
                    { status: 404 }
                );
            }
        }

        const character = await prisma.projectCharacter.update({
            where: {
                id: characterId,
            },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(avatarUrl !== undefined && { avatarUrl }),
                ...(attributes !== undefined && { attributes }),
                ...(sortOrder !== undefined && { sortOrder }),
                ...(projectId !== undefined && { projectId }), // Update projectId assignment if sent (even null)
            },
        });

        return NextResponse.json(character);
    } catch (error) {
        console.error("更新角色失败:", error);
        return NextResponse.json({ error: "更新失败" }, { status: 500 });
    }
}

// DELETE /api/characters/[id] - 删除独立角色
export async function DELETE(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const user = await getAuthUser(request);
        if (!user?.id) {
            return NextResponse.json({ error: "未授权" }, { status: 401 });
        }

        const { id: characterId } = await context.params;

        const character = await prisma.projectCharacter.findFirst({
            where: {
                id: characterId,
                userId: user.id,
            },
        });

        if (!character) {
            return NextResponse.json(
                { error: "角色不存在或无权访问" },
                { status: 404 }
            );
        }

        await prisma.projectCharacter.delete({
            where: {
                id: characterId,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("删除角色失败:", error);
        return NextResponse.json({ error: "删除失败" }, { status: 500 });
    }
}
