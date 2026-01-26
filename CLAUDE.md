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