import Link from 'next/link';

const gettingStartedSteps = [
  {
    title: 'Connect tools',
    description:
      'Start with the apps you already trust — like Gmail, GitHub, Google Sheets, Telegram, or Notion.',
    href: '/integrations',
    cta: 'Connect tools',
  },
  {
    title: 'Start with one real task',
    description:
      'Open chat and ask Randi to research, summarize, draft, plan, or help you take action.',
    href: '/chat',
    cta: 'Open chat',
  },
  {
    title: 'Review approvals when they matter',
    description:
      'If a task touches your tools or money, Randi can ask before anything important happens.',
    href: '/chat',
    cta: 'Open chat',
  },
  {
    title: 'Save an automation',
    description:
      'Once a task works the way you want, turn it into something you can review and run again later.',
    href: '/workflows',
    cta: 'Open automations',
  },
];

const expectations = [
  {
    title: 'You stay in control',
    description:
      'Randi can draft, prepare, and queue work — but sensitive actions should be easy to review before they happen.',
  },
  {
    title: 'Connected tools unlock real actions',
    description:
      'Without integrations, Randi can still think and write. Once you connect tools, she can also act inside your apps.',
  },
  {
    title: 'Credits stay in the background',
    description:
      'Credits cover model usage and paid work. You only need to think about them when you need more room to work.',
  },
];

const starterPrompts = [
  'Summarize this link and tell me what matters.',
  'Draft a reply using these notes.',
  'Turn this task into a checklist.',
  'Once this works, help me save it as an automation.',
];

export default function HowItWorksPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Getting Started</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight text-gradient">
            Getting Started with Randi
          </h1>
          <p className="mt-4 max-w-2xl text-xl text-muted-foreground font-medium leading-relaxed">
            The clearest path to first value is simple: connect the tools you trust, ask Randi to
            help with a real task, review approvals when needed, and save repeat work as an
            automation.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Open chat
          </Link>
          <Link
            href="/integrations"
            className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold transition-colors hover:bg-muted"
          >
            Connect tools
          </Link>
        </div>
      </div>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {gettingStartedSteps.map((step, index) => (
          <div key={step.title} className="rounded-3xl border border-border bg-card/50 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {index + 1}
            </div>
            <h2 className="mt-4 text-xl font-bold tracking-tight">{step.title}</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            <Link
              href={step.href}
              className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline"
            >
              {step.cta}
            </Link>
          </div>
        ))}
      </section>

      <section className="mt-14">
        <div className="mb-6">
          <h2 className="text-3xl font-black tracking-tight">What to expect</h2>
          <p className="mt-2 text-muted-foreground max-w-2xl leading-relaxed">
            Randi should feel helpful first. The platform details matter, but they should come after
            the basic workflow feels clear.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {expectations.map(item => (
            <div key={item.title} className="rounded-3xl border border-border bg-card/40 p-6">
              <h3 className="text-xl font-bold tracking-tight">{item.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-border bg-card/40 p-6">
          <h2 className="text-3xl font-black tracking-tight">Starter prompts</h2>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            If you’re not sure what to ask first, start with a small real task, keep it concrete,
            and add details as you go.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {starterPrompts.map(prompt => (
              <div
                key={prompt}
                className="rounded-2xl border border-border/60 bg-background/40 p-4 text-sm text-foreground/90"
              >
                {prompt}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card/40 p-6">
          <h2 className="text-2xl font-black tracking-tight">Useful next pages</h2>
          <div className="mt-5 space-y-4">
            <Link
              href="/dashboard"
              className="block rounded-2xl border border-border/60 bg-background/40 p-4 transition-colors hover:bg-muted/50"
            >
              <p className="font-semibold">Home</p>
              <p className="mt-1 text-sm text-muted-foreground">
                See your setup progress, recent work, and current readiness.
              </p>
            </Link>
            <Link
              href="/integrations"
              className="block rounded-2xl border border-border/60 bg-background/40 p-4 transition-colors hover:bg-muted/50"
            >
              <p className="font-semibold">Integrations</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose which tools Randi can access and manage your connections.
              </p>
            </Link>
            <Link
              href="/workflows"
              className="block rounded-2xl border border-border/60 bg-background/40 p-4 transition-colors hover:bg-muted/50"
            >
              <p className="font-semibold">Automations</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Review the tasks you have already turned into repeatable work.
              </p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
