'use client';

import Link from 'next/link';
import { type SavedWorkflow } from '@/lib/workflows/schema';

interface WorkflowListProps {
  workflows: SavedWorkflow[];
}

function formatLabel(value?: string | null) {
  if (!value) return 'Not set';

  return value.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function WorkflowList({ workflows }: WorkflowListProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {workflows.map(workflow => {
        const isReady = workflow.status === 'ready';
        const hasSchedule = !!workflow.schedule;
        const needsInfo = workflow.status === 'draft' && workflow.plan.openQuestions.length > 0;
        const statusLabel = isReady ? 'Ready' : needsInfo ? 'Needs input' : 'Draft';
        const lastRunLabel = workflow.latestRunStatus
          ? formatLabel(workflow.latestRunStatus)
          : 'Never';
        const nextStep = needsInfo
          ? workflow.plan.openQuestions[0]
          : isReady
            ? 'This automation is saved and ready for its next review or run.'
            : workflow.safety.approvalState === 'required'
              ? 'Review the approval and policy requirements before relying on this automation.'
              : 'Review the saved steps and confirm everything looks right.';

        const getScheduleStateCopy = () => {
          if (!workflow.schedule) {
            return {
              title: 'No schedule yet',
              appBadge: null,
              deploymentBadge: null,
              appDetail: 'This automation only runs when you start it manually from chat.',
              deploymentDetail: null,
            };
          }

          const { status, deploymentState, deploymentReason } = workflow.schedule;

          const titleMap: Record<string, string> = {
            active: 'Schedule active',
            paused: 'Schedule paused',
            blocked: 'Schedule blocked',
            draft: 'Schedule draft',
          };

          const appBadgeMap: Record<string, { label: string; className: string }> = {
            active: {
              label: 'App active',
              className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            },
            paused: {
              label: 'App paused',
              className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            },
            blocked: {
              label: 'App blocked',
              className: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
            },
            draft: {
              label: 'App draft',
              className: 'bg-white/5 text-muted-foreground border-white/10',
            },
          };

          const deploymentBadgeMap: Record<string, { label: string; className: string }> = {
            synced: {
              label: 'GitHub synced',
              className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            },
            pending_manual_sync: {
              label: 'Needs GitHub sync',
              className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            },
            needs_resync: {
              label: 'Needs re-sync',
              className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
            },
            blocked: {
              label: 'Sync blocked',
              className: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
            },
          };

          const appDetailMap: Record<string, string> = {
            active: 'Recurring runs are enabled in the app.',
            paused: 'The schedule is paused and won’t run again until you resume it.',
            blocked: deploymentReason || 'The schedule is blocked until the issue is resolved.',
            draft: 'The schedule exists, but it is not active yet.',
          };

          const deploymentDetailMap: Record<string, string> = {
            synced: 'The saved schedule matches the current GitHub workflow configuration.',
            pending_manual_sync:
              'The app schedule exists, but GitHub still needs the workflow file or secrets.',
            needs_resync:
              deploymentReason || 'The workflow changed, so GitHub needs to be updated again.',
            blocked:
              deploymentReason || 'The deployment is blocked until the policy issue is resolved.',
          };

          return {
            title: titleMap[status] || 'Configured schedule',
            appBadge: appBadgeMap[status] || null,
            deploymentBadge: deploymentBadgeMap[deploymentState] || null,
            appDetail: appDetailMap[status] || null,
            deploymentDetail: deploymentDetailMap[deploymentState] || deploymentReason,
          };
        };

        const scheduleState = getScheduleStateCopy();

        return (
          <div key={workflow.id} className="flex flex-col gap-4">
            <div
              className={`flex-1 rounded-[2rem] border p-8 transition-all ${
                isReady
                  ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                  : 'border-border/60 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${
                      isReady
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-amber-500/10 text-amber-500'
                    }`}
                  >
                    {isReady ? '⚡' : needsInfo ? '💬' : '📝'}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight leading-tight">
                      {workflow.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>Saved {formatDate(workflow.updatedAt)}</span>
                      <span>•</span>
                      <span>{hasSchedule ? 'Has schedule' : 'Run from chat'}</span>
                    </div>
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    isReady
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : needsInfo
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {statusLabel}
                </span>
              </div>

              <p className="text-sm font-medium text-muted-foreground">What it does</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {workflow.plan.summary}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {workflow.safety.containsFinancialSteps && (
                  <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400">
                    Financial steps
                  </span>
                )}
                {workflow.safety.requiresTransactionCaps && (
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
                    Spending limits
                  </span>
                )}
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                    workflow.safety.riskLevel === 'high'
                      ? 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                      : workflow.safety.riskLevel === 'medium'
                        ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  }`}
                >
                  {formatLabel(workflow.safety.riskLevel)} risk
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <p className="text-sm font-medium text-muted-foreground">Trigger</p>
                  <p className="mt-2 text-sm font-semibold">
                    {formatLabel(workflow.plan.trigger.type)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <p className="text-sm font-medium text-muted-foreground">Last run</p>
                  <p className="mt-2 text-sm font-semibold">{lastRunLabel}</p>
                </div>
              </div>

              <div
                className={`mt-6 rounded-2xl border p-5 ${
                  hasSchedule ? 'border-primary/20 bg-primary/5' : 'border-white/10 bg-white/5'
                }`}
              >
                <p className="text-sm font-medium text-muted-foreground">Schedule</p>
                <p
                  className={`mt-2 text-sm font-semibold ${
                    hasSchedule ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {scheduleState.title}
                </p>

                <div className="mt-3 space-y-2">
                  {workflow.schedule && (
                    <div className="flex flex-wrap gap-2">
                      {scheduleState.appBadge && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${scheduleState.appBadge.className}`}
                        >
                          {scheduleState.appBadge.label}
                        </span>
                      )}
                      {scheduleState.deploymentBadge && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${scheduleState.deploymentBadge.className}`}
                        >
                          {scheduleState.deploymentBadge.label}
                        </span>
                      )}
                    </div>
                  )}

                  {workflow.schedule?.cronExpression && (
                    <p className="text-sm font-mono font-semibold text-foreground/90">
                      {workflow.schedule.cronExpression}
                    </p>
                  )}

                  {scheduleState.appDetail && (
                    <p className="text-sm text-foreground/85 leading-relaxed">
                      {scheduleState.appDetail}
                    </p>
                  )}

                  {scheduleState.deploymentDetail && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {scheduleState.deploymentDetail}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                  <p className="text-sm font-medium text-muted-foreground">Run readiness</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed">
                    {isReady
                      ? 'Saved and ready for its next run or review.'
                      : needsInfo
                        ? 'Waiting on a little more information before it can run.'
                        : 'Review the saved steps before you rely on this automation.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                  <p className="text-sm font-medium text-muted-foreground">Approval state</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed">
                    {formatLabel(workflow.safety.approvalState)}
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`rounded-[1.5rem] border p-5 ${
                needsInfo ? 'border-amber-500/20 bg-amber-500/10' : 'border-white/10 bg-white/5'
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  needsInfo ? 'text-amber-400' : 'text-muted-foreground'
                }`}
              >
                What to do next
              </p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-foreground/90">
                {nextStep}
              </p>
              <Link
                href="/chat"
                className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                Open chat
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
