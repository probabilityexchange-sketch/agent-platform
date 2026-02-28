import { prisma } from "@/lib/db/prisma";
import { docker } from "@/lib/docker/client";
import { getComputeBridge } from "@/lib/compute/bridge-client";

export async function cleanupExpiredContainers() {
    const now = new Date();
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

    // 1. Identify containers expiring within 15 mins that haven't been warned
    const expiringSoon = await prisma.container.findMany({
        where: {
            status: "RUNNING",
            expiresAt: {
                gt: now,
                lt: fifteenMinutesFromNow,
            },
            lastWarningSentAt: null,
        },
    });

    for (const container of expiringSoon) {
        console.log(`[Grace Period] Marking container ${container.id} (${container.subdomain}) as expiring soon.`);
        await prisma.container.update({
            where: { id: container.id },
            data: { lastWarningSentAt: now },
        });
        // Here we could trigger a real notification (email, websocket, etc.)
    }

    // 2. Cleanup containers that have actually expired
    const expired = await prisma.container.findMany({
        where: {
            status: "RUNNING",
            expiresAt: { lt: now },
        },
    });

    if (expired.length === 0) return;

    for (const container of expired) {
        try {
            if (container.dockerId) {
                const bridge = getComputeBridge();
                if (bridge) {
                    await bridge.remove(container.dockerId).catch((e) => {
                        console.warn(`Bridge removal failed for ${container.dockerId}`, e);
                    });
                } else {
                    const dockerContainer = docker.getContainer(container.dockerId);
                    try {
                        await dockerContainer.stop({ t: 10 });
                    } catch (e: unknown) {
                        const dockerErr = e as { statusCode?: number };
                        if (dockerErr.statusCode !== 304 && dockerErr.statusCode !== 404) throw e;
                    }
                    await dockerContainer.remove({ force: true }).catch(() => { });
                }
            }

            await prisma.container.update({
                where: { id: container.id },
                data: { status: "EXPIRED", stoppedAt: now },
            });
        } catch (error) {
            console.error(`Failed to cleanup expired container ${container.id}:`, error);
        }
    }

    // 3. Cleanup orphaned docker containers (managed by us but not in DB)
    const allContainers = await docker.listContainers({
        all: true,
        filters: { label: ["agent-platform.managed=true"] },
    });

    for (const info of allContainers) {
        const dbContainer = await prisma.container.findUnique({
            where: { dockerId: info.Id },
        });

        if (!dbContainer) {
            console.log(`[Orphan] Removing orphaned container ${info.Id.slice(0, 12)}...`);
            const orphan = docker.getContainer(info.Id);
            try {
                await orphan.stop({ t: 5 });
            } catch {
                // might already be stopped
            }
            await orphan.remove({ force: true }).catch((e) => {
                console.warn(`Failed to remove orphaned container ${info.Id.slice(0, 12)}:`, e);
            });
        }
    }
}
