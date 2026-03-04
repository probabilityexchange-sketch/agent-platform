import { NextResponse } from "next/server";
import { getCreditPacks } from "@/lib/tokenomics";

export async function GET() {
  return NextResponse.json({
    plan: { id: "free", name: "Free Tier", price: 0 },
    packages: getCreditPacks(),
  });
}
