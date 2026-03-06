import { NextResponse } from "next/server";
import { loadSkillCatalog } from "@/lib/skills/catalog";

export const runtime = "nodejs";

export async function GET() {
    try {
        const skills = await loadSkillCatalog();

        return NextResponse.json({ skills });
    } catch (error) {
        console.error("Error listing skills:", error);
        return NextResponse.json({ skills: [] });
    }
}
