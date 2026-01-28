import { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import { auth } from '@/lib/auth';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'your-secret-key';

export interface AuthUser {
  id: string;
  phone?: string;
  email?: string;
  tenantId?: string;
}

/**
 * 统一认证中间件 - 支持两种认证方式:
 * 1. NextAuth session (cookie-based) - 用于 web 应用
 * 2. JWT Bearer token (header-based) - 用于 Electron 客户端
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  // 方式 1: 尝试从 Authorization header 获取 JWT token (Electron 客户端)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = verify(token, JWT_SECRET) as AuthUser;
      return {
        id: decoded.id,
        phone: decoded.phone,
        email: decoded.email,
        tenantId: decoded.tenantId,
      };
    } catch (error) {
      console.error('JWT verification failed:', error);
      // JWT 验证失败,继续尝试 NextAuth
    }
  }

  // 方式 2: 尝试从 NextAuth session 获取用户信息 (Web 应用)
  try {
    const session = await auth();
    if (session?.user?.id) {
      return {
        id: session.user.id,
        phone: (session.user as { phone?: string }).phone,
        email: session.user.email || undefined,
      };
    }
  } catch (error) {
    console.error('NextAuth session failed:', error);
  }

  return null;
}
