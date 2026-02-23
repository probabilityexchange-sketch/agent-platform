import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/fleet/stats
 * Returns the latest fleet statistics for monitoring dashboard.
 * Optional query params:
 * - nodeId: Filter by specific node
 * - since: ISO timestamp to get stats after a certain time
 */
export async function GET(req: NextRequest) {
    try {
        const nodeId = req.nextUrl.searchParams.get("nodeId");
        const since = req.nextUrl.searchParams.get("since");

        const where: {
            nodeId?: string;
            reportedAt?: { gte: Date };
        } = {};

        if (nodeId) {
            where.nodeId = nodeId;
        }

        if (since) {
            where.reportedAt = { gte: new Date(since) };
        }

        // Get the latest stats from each node
        const latestStats = await prisma.$queryRaw<Array<{
            nodeId: string;
            nodeRegion: string;
            totalContainers: bigint;
            totalCpuPercent: number;
            totalMemoryUsed: bigint;
            totalMemoryLimit: bigint;
            totalNetworkRx: bigint;
            totalNetworkTx: bigint;
            reportedAt: Date;
        }>>`
      SELECT fs.*
      FROM FleetStats fs
      INNER JOIN (
        SELECT nodeId, MAX(reportedAt) as maxReported
        FROM FleetStats
        ${nodeId ? prisma.$queryRawUnsafe(`WHERE nodeId = '${nodeId}'`) : prisma.$queryRawUnsafe('')}
        GROUP BY nodeId
      ) latest ON fs.nodeId = latest.nodeId AND fs.reportedAt = latest.maxReported
    `;

        // Calculate aggregate totals
        const aggregate = {
            totalContainers: 0,
            avgCpuPercent: 0,
            totalMemoryUsed: BigInt(0),
            totalMemoryLimit: BigInt(0),
            totalNetworkRx: BigInt(0),
            totalNetworkTx: BigInt(0),
            nodes: latestStats.length,
        };

        for (const stat of latestStats) {
            aggregate.totalContainers += Number(stat.totalContainers);
            aggregate.avgCpuPercent += Number(stat.totalCpuPercent);
            aggregate.totalMemoryUsed += stat.totalMemoryUsed;
            aggregate.totalMemoryLimit += stat.totalMemoryLimit;
            aggregate.totalNetworkRx += stat.totalNetworkRx;
            aggregate.totalNetworkTx += stat.totalNetworkTx;
        }

        if (latestStats.length > 0) {
            aggregate.avgCpuPercent /= latestStats.length;
        }

        return NextResponse.json({
            nodes: latestStats.map((s) => ({
                ...s,
                totalContainers: Number(s.totalContainers),
                totalMemoryUsed: s.totalMemoryUsed.toString(),
                totalMemoryLimit: s.totalMemoryLimit.toString(),
                totalNetworkRx: s.totalNetworkRx.toString(),
                totalNetworkTx: s.totalNetworkTx.toString(),
            })),
            aggregate: {
                ...aggregate,
                totalMemoryUsed: aggregate.totalMemoryUsed.toString(),
                totalMemoryLimit: aggregate.totalMemoryLimit.toString(),
                totalNetworkRx: aggregate.totalNetworkRx.toString(),
                totalNetworkTx: aggregate.totalNetworkTx.toString(),
            },
        });
    } catch (err) {
        console.error("Failed to fetch fleet stats:", err);
        return NextResponse.json(
            { error: "Failed to fetch fleet stats" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/fleet/stats
 * Called by bridge servers to report their stats.
 * Requires x-bridge-api-key header for authentication.
 *
 * Body: {
 *   nodeId: string,
 *   nodeRegion: string,
 *   totalContainers: number,
 *   totalCpuPercent: number,
 *   totalMemoryUsed: bigint,
 *   totalMemoryLimit: bigint,
 *   totalNetworkRx: bigint,
 *   totalNetworkTx: bigint
 * }
 */
export async function POST(req: NextRequest) {
    const bridgeKey = req.headers.get("x-bridge-api-key");
    if (!bridgeKey || bridgeKey !== process.env.COMPUTE_BRIDGE_API_KEY) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const {
            nodeId,
            nodeRegion,
            totalContainers,
            totalCpuPercent,
            totalMemoryUsed,
            totalMemoryLimit,
            totalNetworkRx,
            totalNetworkTx,
        } = body;

        if (!nodeId || !nodeRegion) {
            return NextResponse.json(
                { error: "nodeId and nodeRegion are required" },
                { status: 400 }
            );
        }

        const stat = await prisma.fleetStats.create({
            data: {
                nodeId,
                nodeRegion,
                totalContainers: totalContainers ?? 0,
                totalCpuPercent: totalCpuPercent ?? 0,
                totalMemoryUsed: BigInt(totalMemoryUsed ?? 0),
                totalMemoryLimit: BigInt(totalMemoryLimit ?? 0),
                totalNetworkRx: BigInt(totalNetworkRx ?? 0),
                totalNetworkTx: BigInt(totalNetworkTx ?? 0),
            },
        });

        return NextResponse.json({ success: true, id: stat.id });
    } catch (err) {
        console.error("Failed to record fleet stats:", err);
        return NextResponse.json(
            { error: "Failed to record fleet stats" },
            { status: 500 }
        );
    }
}
