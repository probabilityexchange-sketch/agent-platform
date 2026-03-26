import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { getComposioClient } from "@/lib/composio/client";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const composio = await getComposioClient();
    if (!composio) return NextResponse.json({ error: "no client" });

    const allToolkitsResponse = await (composio.toolkits as any).get({ limit: 10 });

    return NextResponse.json({
      type: typeof allToolkitsResponse,
      isArray: Array.isArray(allToolkitsResponse),
      keys: typeof allToolkitsResponse === 'object' && allToolkitsResponse !== null ? Object.keys(allToolkitsResponse) : [],
      response: allToolkitsResponse
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
