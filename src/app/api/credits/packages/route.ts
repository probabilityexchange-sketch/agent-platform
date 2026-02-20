import { NextResponse } from "next/server";
import { getSubscriptionPlan } from "@/lib/credits/engine";

export async function GET() {
  return NextResponse.json({
    plan: getSubscriptionPlan(),
  });
}
