import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dispatchWorkflowSchedule } from "@/lib/workflows/service";

const schema = z.object({
  workflowId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> },
) {
  const { scheduleId } = await params;
  const token = req.headers.get("x-workflow-schedule-token");
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);

  if (!token) {
    return NextResponse.json({ error: "Missing schedule token" }, { status: 401 });
  }

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const result = await dispatchWorkflowSchedule({
      scheduleId,
      workflowId: parsed.data.workflowId,
      token,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "WORKFLOW_SCHEDULE_NOT_FOUND") {
      return NextResponse.json({ error: "Workflow schedule not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "WORKFLOW_SCHEDULE_INACTIVE") {
      return NextResponse.json({ error: "Workflow schedule is not active" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "WORKFLOW_SCHEDULE_FORBIDDEN") {
      return NextResponse.json({ error: "Invalid schedule token" }, { status: 403 });
    }
    throw error;
  }
}
