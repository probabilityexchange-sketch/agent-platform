import fs from "fs/promises";
import path from "path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";
import Link from "next/link";

interface SkillPageProps {
    params: Promise<{ slug: string }>;
}

export default async function SkillPage({ params }: SkillPageProps) {
    const { slug } = await params;
    const projectRoot = process.env.PROJECT_ROOT || process.cwd();
    const skillPath = path.join(projectRoot, "skills", slug, "SKILL.md");

    let content = "";
    try {
        content = await fs.readFile(skillPath, "utf-8");
    } catch (error) {
        console.error(`Error reading skill doc for ${slug}:`, error);
        notFound();
    }

    // Prettify the title from the slug
    const title = slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    return (
        <div className="max-w-4xl mx-auto py-10 px-6">
            <div className="mb-8 flex items-center justify-between">
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
                    <span>/</span>
                    <span className="text-foreground font-medium">Skills</span>
                    <span>/</span>
                    <span className="text-foreground font-bold">{title}</span>
                </nav>

                <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-bold text-primary uppercase tracking-widest">
                    INVOKABLE SKILL
                </div>
            </div>

            <div className="glass-card rounded-3xl p-10 border border-border/50 shadow-2xl">
                <div className="prose max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                    </ReactMarkdown>
                </div>
            </div>

            <div className="mt-12 flex justify-center">
                <Link
                    href="/chat"
                    className="px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold transition-all shadow-xl shadow-primary/20 flex items-center gap-2 group"
                >
                    <span>Invoke {title} in Chat</span>
                    <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </Link>
            </div>
        </div>
    );
}
