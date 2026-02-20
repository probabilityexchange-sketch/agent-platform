import fs from "fs";
import path from "path";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function RoadmapPage() {
    const roadmapPath = path.join(process.cwd(), "ROADMAP.md");
    let roadmapContent = "";

    try {
        roadmapContent = fs.readFileSync(roadmapPath, "utf-8");
    } catch (error) {
        console.error("Failed to read ROADMAP.md", error);
        roadmapContent = "# Roadmap\nRoadmap content is currently unavailable.";
    }

    // Very simple markdown-to-JSX converter to avoid adding heavy libraries
    const sections = roadmapContent.split("## ").filter(s => s.trim() !== "");
    const title = roadmapContent.split("\n")[0].replace("# ", "");
    const intro = roadmapContent.split("\n").slice(1, roadmapContent.indexOf("## ")).join("\n");

    return (
        <div className="max-w-4xl mx-auto py-10 px-4">
            <div className="mb-10 text-center">
                <h1 className="text-4xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    {title}
                </h1>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {intro.replace(/# .*\n/, "").trim()}
                </p>
            </div>

            <div className="space-y-8">
                {sections.map((section, idx) => {
                    const lines = section.split("\n");
                    const header = lines[0];
                    const content = lines.slice(1).join("\n").trim();

                    // Identify objectives
                    const objectiveMatch = content.match(/\*\*Objective\*\*: (.*)/);
                    const objective = objectiveMatch ? objectiveMatch[1] : null;
                    const remainingContent = objective ? content.replace(/\*\*Objective\*\*: .*/, "").trim() : content;

                    return (
                        <div
                            key={idx}
                            className="relative pl-8 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-border group"
                        >
                            <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-primary border border-background shadow-[0_0_8px_rgba(109,40,217,0.5)]" />

                            <div className="bg-card/50 border border-border rounded-xl p-6 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                                    <span className="text-primary/70 font-mono text-sm">0{idx + 1}</span>
                                    {header}
                                </h2>

                                {objective && (
                                    <div className="mb-4 inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                                        Target: {objective}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {remainingContent.split("\n").map((line, lIdx) => {
                                        const isTask = line.trim().startsWith("- [");
                                        const isChecked = line.includes("- [x]");

                                        if (isTask) {
                                            return (
                                                <div key={lIdx} className="flex items-start gap-3 text-sm">
                                                    <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isChecked ? "bg-success border-success text-white" : "border-border bg-muted/30"
                                                        }`}>
                                                        {isChecked && (
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <span className={isChecked ? "text-muted-foreground line-through decoration-muted-foreground/50" : "text-foreground"}>
                                                        {line.replace(/- \[[x ]\] /, "").trim()}
                                                    </span>
                                                </div>
                                            );
                                        }

                                        if (line.trim() !== "") {
                                            return <p key={lIdx} className="text-sm text-muted-foreground">{line.trim()}</p>;
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-16 text-center text-xs text-muted-foreground border-t border-border pt-8">
                Last updated on February 20, 2026. This roadmap is subject to change based on ecosystem needs and $RANDI governance.
            </div>
        </div>
    );
}
