import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/lib/auth/middleware";
import {
    buildStorageKey,
    getSnapshotUploadUrl,
    recordSnapshot,
    getStorageVolume,
    getSnapshotDownloadUrl,
} from "@/lib/storage/storage-service";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/storage/snapshot?agentSlug=...
 * Returns the current snapshot metadata for the authenticated user + agent.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await requireAuth();
        const agentSlug = req.nextUrl.searchParams.get("agentSlug");
        if (!agentSlug) {
            return NextResponse.json({ error: "agentSlug is required" }, { status: 400 });
        }

        const volume = await getStorageVolume(auth.userId, agentSlug);
        if (!volume) {
            return NextResponse.json({ exists: false });
        }

        return NextResponse.json({
            exists: true,
            agentSlug: volume.agentSlug,
            sizeBytes: volume.sizeBytes?.toString(),
            lastSyncAt: volume.lastSyncAt,
        });
    } catch (err) {
        return handleAuthError(err);
    }
}

/**
 * POST /api/storage/snapshot
 * Called by the EC2 bridge after a successful snapshot upload.
 * Updates the StorageVolume record with the new size/timestamp.
 *
 * Also called by the client to get a signed upload URL before
 * triggering the bridge to upload.
 *
 * Body: { agentSlug: string, action: "record" | "upload-url", sizeBytes?: number }
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth();
        const body = await req.json();
        const { agentSlug, action, sizeBytes } = body;

        if (!agentSlug || !action) {
            return NextResponse.json({ error: "agentSlug and action are required" }, { status: 400 });
        }

        const storageKey = buildStorageKey(auth.userId, agentSlug);

        if (action === "upload-url") {
            const signedUrl = await getSnapshotUploadUrl(storageKey);
            if (!signedUrl) {
                return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
            }
            return NextResponse.json({ signedUrl, storageKey });
        }

        if (action === "record") {
            if (typeof sizeBytes !== "number") {
                return NextResponse.json({ error: "sizeBytes is required for record action" }, { status: 400 });
            }
            await recordSnapshot(auth.userId, agentSlug, storageKey, sizeBytes);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (err) {
        return handleAuthError(err);
    }
}

/**
 * Internal-only: called by the bridge server via a shared secret.
 * Allows the bridge to record a completed snapshot without a user session.
 * PUT /api/storage/snapshot
 * Headers: x-bridge-api-key
 * Body: { storageKey: string, userId: string, agentSlug: string, sizeBytes: number }
 */
export async function PUT(req: NextRequest) {
    const bridgeKey = req.headers.get("x-bridge-api-key");
    if (!bridgeKey || bridgeKey !== process.env.COMPUTE_BRIDGE_API_KEY) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { storageKey, userId, agentSlug, sizeBytes } = await req.json();
        if (!storageKey || !userId || !agentSlug || typeof sizeBytes !== "number") {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await recordSnapshot(userId, agentSlug, storageKey, sizeBytes);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Bridge snapshot record failed:", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
