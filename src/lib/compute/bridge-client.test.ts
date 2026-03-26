import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
    prisma: {
        fleetStats: {
            findMany: vi.fn(),
        },
    },
}));

import { getBestBridgeNode, ComputeBridgeClient } from "@/lib/compute/bridge-client";
import { prisma } from "@/lib/db/prisma";

describe("getBestBridgeNode", () => {
    const originalApiKey = process.env.COMPUTE_BRIDGE_API_KEY;
    const originalUrl = process.env.COMPUTE_BRIDGE_URL;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.COMPUTE_BRIDGE_API_KEY = "test-key";
        process.env.COMPUTE_BRIDGE_URL = "http://default-bridge.local";
    });

    afterEach(() => {
        process.env.COMPUTE_BRIDGE_API_KEY = originalApiKey;
        process.env.COMPUTE_BRIDGE_URL = originalUrl;
    });

    it("returns null when COMPUTE_BRIDGE_API_KEY is not set", async () => {
        delete process.env.COMPUTE_BRIDGE_API_KEY;
        const node = await getBestBridgeNode();
        expect(node).toBeNull();
    });

    it("picks the node with fewest containers from fleet stats", async () => {
        vi.mocked(prisma.fleetStats.findMany).mockResolvedValue([
            { nodeId: "http://node-a.local", totalContainers: 5, reportedAt: new Date() },
            { nodeId: "http://node-b.local", totalContainers: 2, reportedAt: new Date() },
            { nodeId: "http://node-c.local", totalContainers: 8, reportedAt: new Date() },
        ] as any);

        const node = await getBestBridgeNode();
        expect(node).not.toBeNull();
        expect(node!.getBaseUrl()).toBe("http://node-b.local");
        expect(node!.getNodeId()).toBe("http://node-b.local");
    });

    it("falls back to default bridge URL when no fleet stats available", async () => {
        vi.mocked(prisma.fleetStats.findMany).mockResolvedValue([]);

        const node = await getBestBridgeNode();
        expect(node).not.toBeNull();
        expect(node!.getBaseUrl()).toBe("http://default-bridge.local");
    });

    it("falls back to default bridge URL when fleet stats query throws", async () => {
        vi.mocked(prisma.fleetStats.findMany).mockRejectedValue(new Error("DB connection failed"));

        const node = await getBestBridgeNode();
        expect(node).not.toBeNull();
        expect(node!.getBaseUrl()).toBe("http://default-bridge.local");
    });

    it("deduplicates per-node stats and uses the first (latest-reported) for each node", async () => {
        const now = new Date();
        const older = new Date(now.getTime() - 60_000);

        vi.mocked(prisma.fleetStats.findMany).mockResolvedValue([
            // node-a appears twice — first entry wins (latest by orderBy desc)
            { nodeId: "http://node-a.local", totalContainers: 3, reportedAt: now },
            { nodeId: "http://node-a.local", totalContainers: 10, reportedAt: older },
            { nodeId: "http://node-b.local", totalContainers: 1, reportedAt: now },
        ] as any);

        const node = await getBestBridgeNode();
        // node-b has 1 container, node-a has 3 (older dup ignored)
        expect(node!.getBaseUrl()).toBe("http://node-b.local");
    });

    it("returns null when no API key and no default URL are set", async () => {
        delete process.env.COMPUTE_BRIDGE_API_KEY;
        delete process.env.COMPUTE_BRIDGE_URL;
        const node = await getBestBridgeNode();
        expect(node).toBeNull();
    });

    it("uses env-keyed nodeId when nodeId is not a URL", async () => {
        vi.mocked(prisma.fleetStats.findMany).mockResolvedValue([
            { nodeId: "node-1", totalContainers: 0, reportedAt: new Date() },
        ] as any);

        // nodeId "node-1" doesn't start with http, so fallback URL is used
        const node = await getBestBridgeNode();
        expect(node!.getBaseUrl()).toBe("http://default-bridge.local");
        expect(node!.getNodeId()).toBe("node-1");
    });
});

describe("ComputeBridgeClient.prewarm", () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
        originalFetch = global.fetch;
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it("sends a POST to /prewarm with snapshotUrl and storageKey", async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        global.fetch = fetchMock;

        const client = new ComputeBridgeClient({
            baseUrl: "http://bridge.local",
            apiKey: "test-key",
            nodeId: "node-1",
        });

        await client.prewarm("https://storage.example.com/snapshot.tar.gz", "agents/user1/snap");

        expect(fetchMock).toHaveBeenCalledOnce();
        expect(fetchMock).toHaveBeenCalledWith(
            "http://bridge.local/prewarm",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({ "X-Bridge-API-Key": "test-key" }),
                body: JSON.stringify({
                    snapshotUrl: "https://storage.example.com/snapshot.tar.gz",
                    storageKey: "agents/user1/snap",
                }),
            })
        );
    });

    it("swallows network errors silently (fire-and-forget semantics)", async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

        const client = new ComputeBridgeClient({
            baseUrl: "http://bridge.local",
            apiKey: "test-key",
        });

        await expect(client.prewarm("https://url", "key")).resolves.toBeUndefined();
    });
});
