import { docker } from "./client";
import { prisma } from "@/lib/db/prisma";
import { getComputeBridge } from "@/lib/compute/bridge-client";

export async function stopContainer(containerId: string): Promise<void> {
  const container = await prisma.container.findUnique({
    where: { id: containerId },
    include: { agent: true },
  });
  if (!container || !container.dockerId) return;

  try {
    const bridge = getComputeBridge();
    if (bridge) {
      await bridge.remove(container.dockerId);
    } else {
      const dockerContainer = docker.getContainer(container.dockerId);
      await dockerContainer.stop({ t: 10 });
      await dockerContainer.remove({ force: true });
    }
  } catch (error: unknown) {
    const err = error as { statusCode?: number };
    if (err.statusCode !== 304 && err.statusCode !== 404) {
      throw error;
    }
  }

  // Calculate refund
  const now = new Date();
  const totalMs = container.expiresAt.getTime() - container.createdAt.getTime();
  const usedMs = now.getTime() - container.createdAt.getTime();
  const unusedRatio = Math.max(0, (totalMs - usedMs) / totalMs);
  const refundTokens = Math.floor(container.tokensUsed * unusedRatio);

  await prisma.$transaction(async (tx) => {
    await tx.container.update({
      where: { id: containerId },
      data: { status: "STOPPED", stoppedAt: now },
    });

    if (refundTokens > 0) {
      await tx.user.update({
        where: { id: container.userId },
        data: { tokenBalance: { increment: refundTokens } },
      });

      await tx.tokenTransaction.create({
        data: {
          userId: container.userId,
          type: "REFUND",
          status: "CONFIRMED",
          amount: refundTokens,
          containerId: container.id,
          description: `Refund for early stop of ${container.subdomain}`,
        },
      });
    }
  });
}

export async function extendContainer(
  containerId: string,
  additionalHours: number
): Promise<{ newExpiresAt: Date; tokensCharged: number }> {
  return await prisma.$transaction(async (tx) => {
    const container = await tx.container.findUnique({
      where: { id: containerId },
      include: { agent: true, user: true },
    });

    if (!container) throw new Error("Container not found");
    if (container.status !== "RUNNING") throw new Error("Container not running");

    const tokensNeeded = additionalHours * container.agent.tokensPerHour;
    if (container.user.tokenBalance < tokensNeeded) {
      throw new Error("Insufficient tokens");
    }

    const newExpiresAt = new Date(
      container.expiresAt.getTime() + additionalHours * 60 * 60 * 1000
    );

    await tx.container.update({
      where: { id: containerId },
      data: {
        expiresAt: newExpiresAt,
        tokensUsed: { increment: tokensNeeded },
      },
    });

    await tx.user.update({
      where: { id: container.userId },
      data: { tokenBalance: { decrement: tokensNeeded } },
    });

    await tx.tokenTransaction.create({
      data: {
        userId: container.userId,
        type: "USAGE",
        status: "CONFIRMED",
        amount: -tokensNeeded,
        containerId: container.id,
        description: `Extended ${container.subdomain} by ${additionalHours}h`,
      },
    });

    return { newExpiresAt, tokensCharged: tokensNeeded };
  });
}

export async function getContainerLogs(
  dockerId: string,
  tail: number = 100
): Promise<string> {
  const bridge = getComputeBridge();
  if (bridge) {
    // Note: The bridge API for logs isn't fully implemented yet, but we'll adapt it.
    // Ideally we'd add an /inspect or /logs route. For now, we'll placeholder it as inspect data
    // or a dedicated logs route if we decide to add one.
    return "Log retrieval via bridge not yet fully implemented.";
  }

  const container = docker.getContainer(dockerId);
  const logs = await container.logs({
    stdout: true,
    stderr: true,
    tail,
    timestamps: true,
  });
  return logs.toString();
}

/**
 * Ensures a container is up and running.
 * If it's paused, it resumes it. If it's stopped, it starts it.
 */
export async function ensureContainerRunning(containerId: string): Promise<void> {
  const container = await prisma.container.findUnique({
    where: { id: containerId },
  });
  if (!container || !container.dockerId) return;

  const bridge = getComputeBridge();

  try {
    if (bridge) {
      const inspect = await bridge.inspect(container.dockerId);
      const state = inspect.State;
      if (state.Paused) {
        // Unfortunately dockerode doesn't have a direct "unpause" matching the bridge call easily
        // but we'll assume the bridge has a resume/start logic.
        await bridge.start(container.dockerId);
      } else if (!state.Running) {
        await bridge.start(container.dockerId);
      }
    } else {
      const dockerContainer = docker.getContainer(container.dockerId);
      const inspect = await dockerContainer.inspect();
      const state = inspect.State;
      if (state.Paused) {
        await dockerContainer.unpause();
      } else if (!state.Running) {
        await dockerContainer.start();
      }
    }

    if (container.status !== "RUNNING") {
      await prisma.container.update({
        where: { id: containerId },
        data: { status: "RUNNING" },
      });
    }
  } catch (error) {
    console.error(`Failed to ensure container ${containerId} is running:`, error);
    throw error;
  }
}
