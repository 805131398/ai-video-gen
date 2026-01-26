import { prisma } from "@/lib/prisma";
import { AIModelType, AILogStatus } from "@prisma/client";

interface LogAIUsageParams {
  tenantId: string;
  userId: string;
  projectId?: string;
  modelType: AIModelType;
  modelConfigId?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  latencyMs: number;
  status: AILogStatus;
  errorMessage?: string;
}

/**
 * Log AI API usage
 */
export async function logAIUsage(params: LogAIUsageParams) {
  try {
    const log = await prisma.aIUsageLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        projectId: params.projectId,
        modelType: params.modelType,
        modelConfigId: params.modelConfigId,
        inputTokens: params.inputTokens || 0,
        outputTokens: params.outputTokens || 0,
        cost: params.cost || 0,
        latencyMs: params.latencyMs,
        status: params.status,
        errorMessage: params.errorMessage,
      },
    });
    return log;
  } catch (error) {
    console.error("Failed to log AI usage:", error);
    // Don't throw - logging failure shouldn't break the main flow
    return null;
  }
}

/**
 * Estimate cost based on model type and tokens
 * These are approximate rates, should be configurable
 */
export function estimateCost(
  modelType: AIModelType,
  inputTokens: number,
  outputTokens: number
): number {
  // Rates per 1K tokens (in USD, approximate)
  const rates: Record<AIModelType, { input: number; output: number }> = {
    TEXT: { input: 0.001, output: 0.002 },    // GPT-3.5 level
    IMAGE: { input: 0.02, output: 0 },         // Per image
    VIDEO: { input: 0.05, output: 0 },         // Per video (mock)
    VOICE: { input: 0.015, output: 0 },        // Per 1K chars
  };

  const rate = rates[modelType];
  const inputCost = (inputTokens / 1000) * rate.input;
  const outputCost = (outputTokens / 1000) * rate.output;

  return Math.round((inputCost + outputCost) * 10000) / 10000; // Round to 4 decimals
}

/**
 * Helper to measure API call latency
 */
export async function withUsageLogging<T>(
  params: Omit<LogAIUsageParams, "latencyMs" | "status" | "errorMessage">,
  fn: () => Promise<{ result: T; inputTokens?: number; outputTokens?: number }>
): Promise<T> {
  const startTime = Date.now();

  try {
    const { result, inputTokens, outputTokens } = await fn();
    const latencyMs = Date.now() - startTime;

    const cost = estimateCost(
      params.modelType,
      inputTokens || 0,
      outputTokens || 0
    );

    await logAIUsage({
      ...params,
      inputTokens,
      outputTokens,
      cost,
      latencyMs,
      status: "SUCCESS",
    });

    return result;
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    await logAIUsage({
      ...params,
      latencyMs,
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}
