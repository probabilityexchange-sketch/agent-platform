"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type FormState = {
  businessName: string;
  businessType: string;
  city: string;
  website: string;
  contactName: string;
  email: string;
  biggestChallenge: string;
};

const INITIAL_STATE: FormState = {
  businessName: "",
  businessType: "Service/repair electrician",
  city: "Chattanooga, TN",
  website: "",
  contactName: "",
  email: "",
  biggestChallenge: "",
};

const SAMPLE_CHECKS = [
  "NAP consistency",
  "Local listing visibility",
  "Website conversion readiness",
  "Review recency",
  "Schema / local business markup",
  "Service area clarity",
];

export default function FreeAuditPage() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const summary = useMemo(() => {
    if (!form.businessName) return "A branded local presence audit for service/repair electricians.";
    return `${form.businessName} in ${form.city || "your market"}`;
  }, [form.businessName, form.city]);

  const setField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/audit/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          source: "free-audit-page",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Unable to queue audit request");
      }

      setStatus("done");
      setMessage(`Audit request queued for ${data.businessName || form.businessName}.`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Free local presence audit</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              See what is blocking calls before you pay for the fix.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Enter a few details about the shop, and we&apos;ll queue a branded audit for a service/repair electrician.
              The report highlights obvious issues, then points to the $299 refresh.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:border-primary/30 hover:text-primary"
              >
                Back home
              </Link>
              <a
                href="#request"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                Start the audit
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1fr_0.9fr] sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-2xl shadow-black/10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">What this audit checks</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {SAMPLE_CHECKS.map((check) => (
                <div key={check} className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm font-medium">
                  {check}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-2xl shadow-black/10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">What happens next</p>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              <li>1. We queue the business for review.</li>
              <li>2. The audit worker scans public signals and writes a report.</li>
              <li>3. The report becomes the sales tool for the $299 refresh.</li>
              <li>4. If the owner wants ongoing work, we roll into monthly maintenance.</li>
            </ol>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-2xl shadow-black/10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Preview of the offer</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <p className="text-sm font-semibold">{summary}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Branded local presence audit, then a follow-up call for the refresh.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <p className="text-sm font-semibold">$299 website refresh</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Clean up the homepage, category fit, schema, and the first conversion path.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <p className="text-sm font-semibold">$199/month maintenance</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ongoing GBP hygiene, small site updates, review monitoring, and a monthly check-in.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div id="request" className="rounded-[2rem] border border-border bg-card p-6 shadow-2xl shadow-black/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Request the audit</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Public data only. No login, no setup, just enough to see if the business is leaking leads.
              </p>
            </div>
            <div className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              10 min target
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-semibold">Business name</span>
                <input
                  required
                  value={form.businessName}
                  onChange={(event) => setField("businessName", event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-primary"
                  placeholder="Powerline Electric"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-semibold">City</span>
                <input
                  value={form.city}
                  onChange={(event) => setField("city", event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-primary"
                  placeholder="Austin, TX"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-semibold">Website</span>
                <input
                  required
                  type="url"
                  value={form.website}
                  onChange={(event) => setField("website", event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-primary"
                  placeholder="https://..."
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-semibold">Email</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setField("email", event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-primary"
                  placeholder="owner@business.com"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-semibold">Business type</span>
                <input
                  value={form.businessType}
                  onChange={(event) => setField("businessType", event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-primary"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-semibold">Best contact name</span>
                <input
                  value={form.contactName}
                  onChange={(event) => setField("contactName", event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-primary"
                  placeholder="Owner or office manager"
                />
              </label>
            </div>

            <label className="space-y-2 text-sm block">
              <span className="font-semibold">Biggest challenge</span>
              <textarea
                value={form.biggestChallenge}
                onChange={(event) => setField("biggestChallenge", event.target.value)}
                className="min-h-[110px] w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-primary"
                placeholder="We need more booked calls from Google."
              />
            </label>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "Queueing audit..." : "Queue the audit"}
            </button>
          </form>

          {message && (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                status === "done"
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-red-500/20 bg-red-500/10 text-red-300"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
