import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, password, name, email } = body;

    // 验证必填字段
    if (!phone || !password) {
      return NextResponse.json(
        { error: '手机号和密码为必填项' },
        { status: 400 }
      );
    }

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: '该手机号已被注册' },
        { status: 400 }
      );
    }

    // 如果提供了邮箱，检查邮箱是否已被使用
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: '该邮箱已被注册' },
          { status: 400 }
        );
      }
    }

    // 加密密码
    const hashedPassword = await hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        phone,
        password: hashedPassword,
        name: name || phone,
        email: email || null,
        isActive: true,
      },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: '注册成功',
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('注册错误:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
