import { prisma } from "@/lib/db/prisma";
import { docker } from "@/lib/docker/client";
import { getComputeBridge } from "@/lib/compute/bridge-client";

export async function cleanupExpiredContainers() {
    const expired = await prisma.container.findMany({
        where: {
            status: "RUNNING",
            expiresAt: { lt: new Date() },
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
                data: { status: "EXPIRED", stoppedAt: new Date() },
            });
        } catch (error) {
            console.error(`Failed to cleanup expired container ${container.id}:`, error);
        }
    }
}
