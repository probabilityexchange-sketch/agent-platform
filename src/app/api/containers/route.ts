import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { requireAuth, handleAuthError } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { provisionContainer, ProvisioningError } from "@/lib/docker/provisioner";
import { cleanupExpiredContainers } from "@/lib/docker/cleanup";
import { checkRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limit";
import { ensureUserHasUsername } from "@/lib/utils/username";

const provisionSchema = z.object({
  agentId: z.string().min(1),
  hours: z.number().int().min(1).max(72),
});

function mapProvisioningError(error: ProvisioningError): {
  status: number;
  payload: { error: string; detail?: string };
} {
  switch (error.code) {
    case "AGENT_NOT_AVAILABLE":
      return {
        status: 404,
        payload: { error: "Agent not available", detail: error.message },
      };
    case "DOCKER_NETWORK_NOT_FOUND":
      return {
        status: 500,
        payload: { error: "Docker network is not available", detail: error.message },
      };
    case "DOCKER_IMAGE_PULL_FAILED":
      return {
        status: 500,
        payload: {
          error: "Failed to pull agent image from registry",
          detail: error.message,
        },
      };
    case "DOCKER_CONTAINER_CREATE_FAILED":
      return {
        status: 500,
        payload: { error: "Failed to create agent container", detail: error.message },
      };
    case "DOCKER_CONTAINER_START_FAILED":
      return {
        status: 500,
        payload: { error: "Agent container failed to start", detail: error.message },
      };
    default:
      return {
        status: 500,
        payload: { error: "Failed to provision agent container", detail: error.message },
      };
  }
}

export async function GET() {
  try {
    const auth = await requireAuth();

    // Lazy cleanup of expired containers
    await cleanupExpiredContainers().catch((e) =>
      console.error("Lazy cleanup failed", e)
    );

    const containers = await prisma.container.findMany({
      where: { userId: auth.userId },
      include: { agent: { select: { name: true, slug: true, creditsPerHour: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      containers: containers.map((c) => ({
        id: c.id,
        dockerId: c.dockerId,
        subdomain: c.subdomain,
        agentId: c.agentId,
        agentName: c.agent.name,
        agentSlug: c.agent.slug,
        status: c.status,
        url: c.url,
        password: c.password,
        creditsUsed: c.creditsUsed,
        expiresAt: c.expiresAt.toISOString(),
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  let createdContainerId: string | null = null;
  let creditsReserved = 0;
  let userId: string | null = null;

  try {
    const auth = await requireAuth();
    userId = auth.userId;

    const rateLimit = await checkRateLimit(
      `provision:${auth.userId}`,
      RATE_LIMITS.provision
    );
    if (!rateLimit.allowed) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
      );
      return NextResponse.json(
        {
          error: "Too many provisioning requests. Please wait and try again.",
          retryAfterSec,
        },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    const body = await request.json();
    const parsed = provisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { agentId, hours } = parsed.data;

    // 1. Transaction: Check balance, reserve credits, and create "PROVISIONING" record
    const provisionData = await prisma.$transaction(async (tx) => {
      const agent = await tx.agentConfig.findUnique({ where: { id: agentId } });
      if (!agent || !agent.active) throw new Error("AGENT_NOT_FOUND");

      const user = await tx.user.findUnique({ where: { id: auth.userId } });
      if (!user) throw new Error("USER_NOT_FOUND");

      const creditsNeeded = hours * agent.creditsPerHour;

      if (user.creditBalance < creditsNeeded) throw new Error("INSUFFICIENT_CREDITS");
      const resolvedUsername =
        user.username ?? (await ensureUserHasUsername(tx, user.id, user.walletAddress));

      creditsReserved = creditsNeeded;

      await tx.user.update({
        where: { id: auth.userId },
        data: { creditBalance: { decrement: creditsNeeded } },
      });

      await tx.creditTransaction.create({
        data: {
          userId: auth.userId,
          type: "USAGE",
          status: "CONFIRMED",
          amount: -creditsNeeded,
          description: `Provisioning ${agent.name} for ${hours}h`,
        },
      });

      // Create initial container record
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
      const container = await tx.container.create({
        data: {
          userId: auth.userId,
          agentId: agent.id,
          subdomain: `temp-${nanoid(10)}`, // temporary, will be updated by provisioner
          status: "PROVISIONING",
          creditsUsed: creditsNeeded,
          expiresAt,
        },
      });

      return {
        containerId: container.id,
        agentSlug: agent.slug,
        username: resolvedUsername,
        agentName: agent.name,
      };
    });

    createdContainerId = provisionData.containerId;

    // 2. Provision Docker container
    let result;
    try {
      result = await provisionContainer(
        auth.userId,
        provisionData.agentSlug,
        provisionData.username
      );
    } catch (dockerError) {
      console.error("Docker provisioning failed:", dockerError);
      if (dockerError instanceof ProvisioningError) {
        throw dockerError;
      }
      throw new ProvisioningError(
        "DOCKER_PROVISION_FAILED",
        dockerError instanceof Error
          ? dockerError.message
          : "Unknown provisioning failure"
      );
    }

    // 3. Update container record with final status and Docker metadata
    await prisma.container.update({
      where: { id: createdContainerId },
      data: {
        status: "RUNNING",
        dockerId: result.dockerId,
        subdomain: result.subdomain,
        url: result.url,
        password: result.password,
      },
    });

    return NextResponse.json({
      containerId: createdContainerId,
      url: result.url,
      password: result.password,
      expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
    });

  } catch (error: unknown) {
    // Handle rollbacks if we failed after reserving credits
    if (userId && creditsReserved > 0 && createdContainerId) {
      try {
        await prisma.$transaction(async (tx) => {
          // Refund credits
          await tx.user.update({
            where: { id: userId! },
            data: { creditBalance: { increment: creditsReserved } },
          });

          // Record refund
          await tx.creditTransaction.create({
            data: {
              userId: userId!,
              type: "REFUND",
              status: "CONFIRMED",
              amount: creditsReserved,
              containerId: createdContainerId!,
              description: `Refund for failed provisioning`,
            },
          });

          // Update container status
          await tx.container.update({
            where: { id: createdContainerId! },
            data: { status: "ERROR" },
          });
        });
      } catch (rollbackError) {
        console.error("Critical: Rollback failed!", rollbackError);
      }
    }

    if (error instanceof Error) {
      if (error instanceof ProvisioningError) {
        const mapped = mapProvisioningError(error);
        return NextResponse.json(mapped.payload, { status: mapped.status });
      }

      const message = error.message;
      if (message === "AGENT_NOT_FOUND") return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      if (message === "INSUFFICIENT_CREDITS") return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
      if (message === "USERNAME_GENERATION_FAILED") {
        return NextResponse.json(
          { error: "Unable to prepare account profile" },
          { status: 500 }
        );
      }
      if (message === "DOCKER_PROVISION_FAILED") return NextResponse.json({ error: "Failed to provision agent container" }, { status: 500 });
    }

    return handleAuthError(error);
  }
}
