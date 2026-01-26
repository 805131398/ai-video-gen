import { prisma } from '@/lib/prisma';
import {
  StepType,
  ProjectListQuery,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateVersionRequest,
  UpdateStepRequest,
  CopywritingAttributes,
} from '@/types/ai-video';
import { Prisma } from '@/generated/prisma/client';

type JsonInput = Prisma.InputJsonValue | undefined;

// ==================== Project CRUD ====================

export async function createProject(
  userId: string,
  data: CreateProjectRequest,
  tenantId?: string
) {
  return prisma.$transaction(async (tx) => {
    // Create project
    const project = await tx.project.create({
      data: {
        userId,
        tenantId,
        topic: data.topic,
        title: data.title,
        status: 'DRAFT',
        isPublic: false,
      },
    });

    // Create initial version (main branch)
    const version = await tx.projectVersion.create({
      data: {
        projectId: project.id,
        versionNo: 1,
        isMain: true,
        currentStep: 'TOPIC_INPUT',
      },
    });

    // Update project with current version
    const updatedProject = await tx.project.update({
      where: { id: project.id },
      data: { currentVersionId: version.id },
      include: {
        versions: {
          include: { steps: { include: { options: true } } },
        },
      },
    });

    return updatedProject;
  });
}

export async function getProjectById(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    include: {
      versions: {
        orderBy: { versionNo: 'desc' },
        include: {
          steps: {
            orderBy: { createdAt: 'asc' },
            include: { options: { orderBy: { sortOrder: 'asc' } } },
          },
        },
      },
    },
  });

  return project;
}

export async function getProjectList(userId: string, query: ProjectListQuery) {
  const {
    page = 1,
    pageSize = 10,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const where: Prisma.ProjectWhereInput = {
    userId,
    ...(status && { status }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { topic: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: {
        versions: {
          where: { isMain: true },
          take: 1,
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return { data, total, page, pageSize };
}

export async function updateProject(
  projectId: string,
  userId: string,
  data: UpdateProjectRequest
) {
  return prisma.project.update({
    where: { id: projectId, userId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.status && { status: data.status }),
      ...(data.currentVersionId && { currentVersionId: data.currentVersionId }),
      ...(data.coverUrl !== undefined && { coverUrl: data.coverUrl }),
      ...(data.finalVideoUrl !== undefined && { finalVideoUrl: data.finalVideoUrl }),
      ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
    },
    include: {
      versions: {
        orderBy: { versionNo: 'desc' },
        include: {
          steps: {
            orderBy: { createdAt: 'asc' },
            include: { options: { orderBy: { sortOrder: 'asc' } } },
          },
        },
      },
    },
  });
}

export async function deleteProject(projectId: string, userId: string) {
  return prisma.project.delete({
    where: { id: projectId, userId },
  });
}

// ==================== Version Management ====================

export async function createVersion(
  projectId: string,
  userId: string,
  data: CreateVersionRequest
) {
  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      versions: { orderBy: { versionNo: 'desc' }, take: 1 },
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  const nextVersionNo = (project.versions[0]?.versionNo ?? 0) + 1;

  return prisma.$transaction(async (tx) => {
    // Create new version
    const version = await tx.projectVersion.create({
      data: {
        projectId,
        parentVersionId: data.parentVersionId,
        versionNo: nextVersionNo,
        branchName: data.branchName,
        isMain: false,
        currentStep: 'TOPIC_INPUT',
      },
    });

    // If branching from parent, copy steps
    if (data.parentVersionId) {
      const parentSteps = await tx.projectStep.findMany({
        where: { versionId: data.parentVersionId },
        include: { options: true },
      });

      for (const step of parentSteps) {
        const newStep = await tx.projectStep.create({
          data: {
            versionId: version.id,
            stepType: step.stepType,
            selectedOptionId: null,
            attributes: step.attributes ?? undefined,
            status: step.status,
          },
        });

        // Copy options
        if (step.options.length > 0) {
          await tx.stepOption.createMany({
            data: step.options.map((opt) => ({
              stepId: newStep.id,
              content: opt.content,
              assetUrl: opt.assetUrl,
              metadata: opt.metadata ?? undefined,
              isSelected: opt.isSelected,
              sortOrder: opt.sortOrder,
            })),
          });
        }
      }
    }

    return version;
  });
}

export async function getVersionList(projectId: string, userId: string) {
  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  return prisma.projectVersion.findMany({
    where: { projectId },
    orderBy: { versionNo: 'desc' },
    include: {
      parentVersion: { select: { id: true, versionNo: true, branchName: true } },
      steps: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, stepType: true, status: true },
      },
    },
  });
}

export async function switchVersion(
  projectId: string,
  versionId: string,
  userId: string
) {
  // Verify project ownership and version exists
  const [project, version] = await Promise.all([
    prisma.project.findFirst({ where: { id: projectId, userId } }),
    prisma.projectVersion.findFirst({ where: { id: versionId, projectId } }),
  ]);

  if (!project) {
    throw new Error('Project not found');
  }
  if (!version) {
    throw new Error('Version not found');
  }

  return prisma.project.update({
    where: { id: projectId },
    data: { currentVersionId: versionId },
    include: {
      versions: {
        orderBy: { versionNo: 'desc' },
        include: {
          steps: {
            orderBy: { createdAt: 'asc' },
            include: { options: { orderBy: { sortOrder: 'asc' } } },
          },
        },
      },
    },
  });
}

// ==================== Step Management ====================

export async function createStep(
  versionId: string,
  stepType: StepType,
  attributes?: CopywritingAttributes
) {
  return prisma.projectStep.create({
    data: {
      versionId,
      stepType,
      attributes: attributes as JsonInput,
      status: 'PENDING',
    },
    include: { options: true },
  });
}

export async function updateStep(stepId: string, data: UpdateStepRequest) {
  const updateData: Prisma.ProjectStepUpdateInput = {};
  if (data.selectedOptionId) updateData.selectedOptionId = data.selectedOptionId;
  if (data.attributes) updateData.attributes = data.attributes as JsonInput;
  if (data.status) updateData.status = data.status;

  return prisma.projectStep.update({
    where: { id: stepId },
    data: updateData,
    include: { options: { orderBy: { sortOrder: 'asc' } } },
  });
}

export async function updateVersionStep(versionId: string, stepType: StepType) {
  return prisma.projectVersion.update({
    where: { id: versionId },
    data: { currentStep: stepType },
  });
}

// ==================== Option Management ====================

export interface CreateOptionData {
  content?: string;
  assetUrl?: string;
  metadata?: Record<string, unknown>;
}

export async function addStepOptions(stepId: string, options: CreateOptionData[]) {
  const existingCount = await prisma.stepOption.count({ where: { stepId } });

  return prisma.stepOption.createMany({
    data: options.map((opt, index) => ({
      stepId,
      content: opt.content,
      assetUrl: opt.assetUrl,
      metadata: opt.metadata as JsonInput,
      isSelected: false,
      sortOrder: existingCount + index,
    })),
  });
}

export async function selectOption(stepId: string, optionId: string) {
  return prisma.$transaction(async (tx) => {
    // Deselect all options for this step
    await tx.stepOption.updateMany({
      where: { stepId },
      data: { isSelected: false },
    });

    // Select the specified option
    await tx.stepOption.update({
      where: { id: optionId },
      data: { isSelected: true },
    });

    // Update step with selected option
    return tx.projectStep.update({
      where: { id: stepId },
      data: { selectedOptionId: optionId },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
  });
}

export async function clearStepOptions(stepId: string) {
  return prisma.stepOption.deleteMany({ where: { stepId } });
}
