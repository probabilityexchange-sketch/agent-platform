import { NextRequest, NextResponse } from "next/server";
import { auditLeadSchema } from "@/lib/audit/schema";
import { queueAuditLead } from "@/lib/audit/queue";
import { checkRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  const { allowed } = await checkRateLimit(`audit-request:${ip}`, RATE_LIMITS.general);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = auditLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 }
    );
  }

  try {
    await queueAuditLead(parsed.data);
    return NextResponse.json({
      success: true,
      message: "Audit request queued",
      businessName: parsed.data.businessName,
    });
  } catch (error: any) {
    console.error("[AuditRequest] Failed to queue audit lead:", error?.message || error);
    return NextResponse.json({ error: "Unable to queue audit request" }, { status: 503 });
  }
}
