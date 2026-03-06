import { NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/lib/auth/middleware";
import { getWorkflowRunById } from "@/lib/workflows/service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const auth = await requireAuth();
    const { runId } = await params;
    const run = await getWorkflowRunById(auth.userId, runId);

    if (!run) {
      return NextResponse.json({ error: "Workflow run not found" }, { status: 404 });
    }

    return NextResponse.json({ run });
  } catch (error) {
    return handleAuthError(error);
  }
}
