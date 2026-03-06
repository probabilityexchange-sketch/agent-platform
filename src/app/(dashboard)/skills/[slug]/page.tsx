import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { loadSkillBySlug } from "@/lib/skills/catalog";

interface SkillPageProps {
    params: Promise<{ slug: string }>;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SkillPage({ params }: SkillPageProps) {
    const slug = (await params).slug;
    const skill = await loadSkillBySlug(slug);

    if (!skill) {
        notFound();
    }

    return (
        <div className="mx-auto max-w-5xl px-6 py-10">
            <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/dashboard" className="transition-colors hover:text-foreground">
                    Dashboard
                </Link>
                <span>/</span>
                <Link href="/skills" className="transition-colors hover:text-foreground">
                    Skills
                </Link>
                <span>/</span>
                <span className="font-semibold text-foreground">{skill.name}</span>
            </nav>

            <header className="glass-card rounded-3xl border border-border/60 p-8 md:p-10">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="mb-4 flex flex-wrap gap-2">
                            <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                                Skill Guide
                            </span>
                            <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {skill.source}
                            </span>
                            {skill.version && (
                                <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    v{skill.version}
                                </span>
                            )}
                            {skill.author && (
                                <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {skill.author}
                                </span>
                            )}
                        </div>

                        <h1 className="text-3xl font-black tracking-tight md:text-4xl">{skill.name}</h1>
                        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                            {skill.description}
                        </p>
                        <p className="mt-4 font-mono text-xs text-muted-foreground">
                            /{slug}
                        </p>
                    </div>

                    <div className="grid w-full gap-3 sm:max-w-xs">
                        <Link
                            href="/skills"
                            className="inline-flex items-center justify-center rounded-xl border border-border bg-background/70 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:border-primary/40 hover:text-primary"
                        >
                            Back to Library
                        </Link>
                        <Link
                            href="/chat"
                            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-primary/90"
                        >
                            Invoke in Chat
                        </Link>
                    </div>
                </div>
            </header>

            <article className="mt-8 rounded-3xl border border-border/60 bg-background/40 p-6 md:p-8">
                <div className="prose prose-neutral max-w-none dark:prose-invert prose-headings:font-black prose-headings:tracking-tight prose-a:text-primary">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {skill.body}
                    </ReactMarkdown>
                </div>
            </article>

            <div className="mt-8 flex items-center justify-between border-t border-border/40 pt-6">
                <Link
                    href="/skills"
                    className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    All Skills
                </Link>
                <Link
                    href="/chat"
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-primary/90"
                >
                    Invoke in Chat
                </Link>
            </div>
        </div>
    );
}
