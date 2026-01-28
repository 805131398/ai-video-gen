# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Video Generation Platform - a full-stack web application for AI-powered short video creation. Users go through a 14-step workflow: topic input → title generation/selection → copywriting attributes → copy generation/selection → image generation/selection → video generation/selection → voice configuration/generation → final composition.

## Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma 7 ORM
- **Auth**: NextAuth.js 5 (JWT strategy, credentials provider)
- **UI**: shadcn/ui + Radix UI + Tailwind CSS v4
- **State**: Zustand, SWR for data fetching
- **Testing**: Vitest + Testing Library

## Commands

All commands run from `web/` directory:

```bash
pnpm dev              # Start dev server (Turbopack)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm test             # Run tests (watch mode)
pnpm test:run         # Run tests once

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio
pnpm db:seed          # Seed database
```

## Architecture

```
web/
├── prisma/
│   └── schema.prisma          # Database schema (Prisma output: src/generated/prisma)
├── src/
│   ├── app/
│   │   ├── (main)/            # User-facing routes (video creation studio)
│   │   ├── admin/             # Admin panel (users, roles, AI config, templates)
│   │   ├── api/               # API routes
│   │   └── login/
│   ├── components/
│   │   ├── studio/            # 14-step video creation workflow components
│   │   ├── admin/             # Admin panel components
│   │   └── ui/                # shadcn/ui components
│   ├── lib/
│   │   ├── ai/                # AI service layer (text, image, video, voice generators)
│   │   ├── services/          # Business logic (project-service, ai-config-service)
│   │   ├── storage/           # Multi-provider storage (Ali OSS, AWS S3, Tencent COS)
│   │   ├── auth.ts            # NextAuth configuration
│   │   └── prisma.ts          # Prisma client singleton
│   └── types/                 # TypeScript type definitions
```

## Key Patterns

- **Path alias**: `@/*` maps to `./src/*`
- **Prisma client**: Generated to `src/generated/prisma` (not default location)
- **Multi-tenancy**: Tenant isolation at database level via `tenantId` on most models
- **RBAC**: Role-based access control with permissions and menu access
- **Version control**: Git-like branching for project versions (parent-child relationships)
- **Storage abstraction**: Adapter pattern for cloud storage providers

## Database Models (Key)

- `Project`, `ProjectVersion`, `ProjectStep`, `StepOption` - Video creation workflow
- `AIModelConfig`, `PromptTemplate`, `AIUsageLog` - AI configuration and tracking
- `User`, `Role`, `Permission`, `RolePermission`, `UserRole` - RBAC
- `Tenant`, `SystemConfig`, `StorageProvider` - Multi-tenant infrastructure

## Workflow Steps (StepType enum)

TOPIC_INPUT → TITLE_GENERATE → TITLE_SELECT → ATTRIBUTE_SET → COPY_GENERATE → COPY_SELECT → COPY_SEGMENT → IMAGE_GENERATE → IMAGE_SELECT → VIDEO_GENERATE → VIDEO_SELECT → VOICE_CONFIG → VOICE_GENERATE → COMPOSE


## 语言
后续中文回复

## 版本控制
注意提交代码


## Prisma 相关
Prisma 7 的客户端结构不同，需要从具体文件导入

## 文档编辑
基本内容修复或者完善新功能后,可以总结本次修复然后保存到 docs 中。
文档命名尽量使用中文好理解。
docs 根目录不要放单独的文档, 尽量能归类放到文件夹中。

## 工具的使用
### UI 相关的尽量使用
    : 使用 /ui-ux-pro-max   作为 UI 顾问
### 开发或者修改 bug
尽可能调用,不是强制, 只要你觉得这个能方便我们开发即可调用 
|                                |                      |
| ------------------------------ | -------------------- |
| 技能                             | 用途                   |
| brainstorming                  | 在创建功能、构建组件前探索需求和设计   |
| writing-plans                  | 为多步骤任务编写实施计划         |
| executing-plans                | 执行已有的实施计划            |
| test-driven-development        | 测试驱动开发               |
| systematic-debugging           | 系统性调试 bug            |
| requesting-code-review         | 请求代码审查               |
| receiving-code-review          | 处理收到的代码审查反馈          |
| verification-before-completion | 完成前验证                |
| using-git-worktrees            | 使用 git worktree 隔离开发 |
| writing-skills                 | 创建或编辑新技能             |


## 校验结果查看
pnpm run dev 类似的命令不用执行,  我会自己重启项目后告诉你结果。