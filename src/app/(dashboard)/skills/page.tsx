import Link from 'next/link';
import { loadSkillCatalog } from '@/lib/skills/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function SkillCard({ skill }: { skill: Awaited<ReturnType<typeof loadSkillCatalog>>[number] }) {
  return (
    <Link
      key={skill.slug}
      href={`/skills/${skill.slug}`}
      className="group flex h-full flex-col justify-between rounded-3xl border border-border/60 bg-background/50 p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
    >
      <div>
        <span className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {skill.mode}
        </span>
        <span className="ml-2 rounded-full border border-border bg-background/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {skill.source}
        </span>

        <h3 className="mt-4 text-lg font-extrabold tracking-tight transition-colors group-hover:text-primary">
          {skill.name}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{skill.description}</p>
      </div>

      <div className="mt-8 flex items-center justify-between text-xs">
        <span className="font-mono text-muted-foreground">/{skill.slug}</span>
        <span className="flex items-center gap-1 font-bold uppercase tracking-wide text-primary transition-transform group-hover:translate-x-0.5">
          Open Guide
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

export default async function SkillsIndexPage() {
  const documentedSkills = await loadSkillCatalog();
  const invokableSkills = documentedSkills.filter(skill => skill.source === 'Workspace');
  const supportingSkills = documentedSkills.filter(skill => skill.source !== 'Workspace');
  const spotlightSkills = invokableSkills.length > 0 ? invokableSkills : documentedSkills;

  const actionCount = spotlightSkills.filter(skill => skill.mode === 'Action').length;
  const categoryCount = new Set(spotlightSkills.map(skill => skill.category)).size;

  const categoryOrder = ['Trading', 'Infrastructure', 'Integrations', 'Product', 'General'];
  const groupedSupporting = categoryOrder
    .map(cat => ({
      category: cat,
      skills: supportingSkills.filter(s => s.category === cat),
    }))
    .filter(g => g.skills.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="glass-card rounded-[2rem] border border-border/60 p-8 md:p-10">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
          Skills Library
        </p>
        <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
          Curated capabilities for planning, execution, and domain expertise
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Browse documented skills, understand what each one is best at, and open any guide before
          invoking it in chat.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {invokableSkills.length > 0 ? 'Invokable Skills' : 'Documented Skills'}
            </p>
            <p className="mt-2 text-2xl font-black">{spotlightSkills.length}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Action Skills
            </p>
            <p className="mt-2 text-2xl font-black">{actionCount}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Categories
            </p>
            <p className="mt-2 text-2xl font-black">{categoryCount}</p>
          </div>
        </div>
      </header>

      {documentedSkills.length > 0 ? (
        <div className="mt-10 space-y-12">
          {invokableSkills.length > 0 && (
            <section>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Invokable Skills</h2>
                  <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                    Everything that used to live in the sidebar dropdown now lives here in the
                    library.
                  </p>
                </div>
                <Link
                  href="/chat"
                  className="inline-flex items-center justify-center rounded-xl border border-primary/40 px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary/10"
                >
                  Open Chat
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {invokableSkills.map(skill => (
                  <SkillCard key={skill.slug} skill={skill} />
                ))}
              </div>
            </section>
          )}

          {groupedSupporting.length > 0 && (
            <section>
              <div className="mb-5">
                <h2 className="text-2xl font-black tracking-tight">Extended Catalog</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Imported and agent-specific guides that complement the invokable workspace skills.
                </p>
              </div>

              <div className="space-y-10">
                {groupedSupporting.map(group => (
                  <div key={group.category}>
                    <div className="mb-5">
                      <h3 className="text-xl font-black tracking-tight">{group.category}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {group.skills.length} {group.skills.length === 1 ? 'skill' : 'skills'}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                      {group.skills.map(skill => (
                        <SkillCard key={skill.slug} skill={skill} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <section className="mt-10">
          <div className="rounded-3xl border border-dashed border-border/60 bg-background/40 p-12 text-center">
            <p className="text-lg font-bold text-foreground">No skills documented yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add a{' '}
              <code className="rounded bg-background/70 px-1.5 py-0.5 font-mono text-xs">
                SKILL.md
              </code>{' '}
              file to any skill directory to surface it here.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
