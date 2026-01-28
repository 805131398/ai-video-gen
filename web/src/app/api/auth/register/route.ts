import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/prisma';
import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';
const ACCESS_TOKEN_EXPIRES = '1h';
const REFRESH_TOKEN_EXPIRES = '7d';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, password, phone } = body;

    // 验证必填字段 - 支持邮箱或手机号注册
    if (!password) {
      return NextResponse.json(
        { error: '密码为必填项' },
        { status: 400 }
      );
    }

    if (!email && !phone) {
      return NextResponse.json(
        { error: '邮箱或手机号至少需要提供一个' },
        { status: 400 }
      );
    }

    // 检查邮箱是否已被使用
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

    // 检查手机号是否已存在
    if (phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone },
      });

      if (existingPhone) {
        return NextResponse.json(
          { error: '该手机号已被注册' },
          { status: 400 }
        );
      }
    }

    // 加密密码
    const hashedPassword = await hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        name: username || email || phone || '用户',
        email: email || null,
        phone: phone || null,
        password: hashedPassword,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    // 生成 JWT tokens
    const accessToken = sign(
      { userId: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES }
    );

    const refreshToken = sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES }
    );

    return NextResponse.json(
      {
        message: '注册成功',
        user: {
          id: user.id,
          username: user.name,
          email: user.email,
          phone: user.phone,
          created_at: user.createdAt,
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
        },
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
