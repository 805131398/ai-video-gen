import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

// GET /api/characters - 获取当前用户的所有角色（无论是否关联项目）
export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user?.id) {
            return NextResponse.json({ error: "未授权" }, { status: 401 });
        }

        const characters = await prisma.projectCharacter.findMany({
            where: {
                userId: user.id
            },
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        });

        return NextResponse.json({ data: characters });
    } catch (error) {
        console.error("获取角色列表失败:", error);
        return NextResponse.json({ error: "获取失败" }, { status: 500 });
    }
}

// POST /api/characters - 创建独立角色
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user?.id) {
            return NextResponse.json({ error: "未授权" }, { status: 401 });
        }

        const body = await request.json();
        const { name, description, avatarUrl, attributes, sortOrder, projectId } = body;

        if (!name || !description) {
            return NextResponse.json(
                { error: "角色名称和描述不能为空" },
                { status: 400 }
            );
        }

        // Optional: If projectId is provided, verify project ownership
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

        const character = await prisma.projectCharacter.create({
            data: {
                userId: user.id,
                tenantId: user.tenantId, // Inherit user's tenant
                projectId: projectId || null,
                name,
                description,
                avatarUrl,
                attributes,
                sortOrder: sortOrder || 0,
            },
        });

        return NextResponse.json(character, { status: 201 });
    } catch (error) {
        console.error("创建角色失败:", error);
        return NextResponse.json({ error: "创建失败" }, { status: 500 });
    }
}
