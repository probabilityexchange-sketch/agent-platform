import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
    try {
        // Use process.cwd() to get the root of the project
        const projectRoot = process.env.PROJECT_ROOT || process.cwd();
        const skillsDir = path.join(projectRoot, "skills");

        const entries = await fs.readdir(skillsDir, { withFileTypes: true });

        const skills = await Promise.all(
            entries
                .filter(entry => entry.isDirectory())
                .map(async (entry) => {
                    const skillPath = path.join(skillsDir, entry.name, "SKILL.md");
                    try {
                        await fs.access(skillPath);
                        return {
                            name: entry.name,
                            slug: entry.name,
                            hasDoc: true
                        };
                    } catch {
                        return {
                            name: entry.name,
                            slug: entry.name,
                            hasDoc: false
                        };
                    }
                })
        );

        return NextResponse.json({ skills });
    } catch (error) {
        console.error("Error listing skills:", error);
        return NextResponse.json({ skills: [] });
    }
}
