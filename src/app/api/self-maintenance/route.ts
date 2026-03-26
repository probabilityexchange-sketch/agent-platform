import { NextRequest, NextResponse } from "next/server";
import { SelfMaintenanceService } from "@/lib/self-maintenance";
import type { AnalysisResult } from "@/lib/self-maintenance/analyzer";
import { requireAuth } from "@/lib/auth/middleware";
import { resolve, join } from "path";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { targetPath, autoFix } = await request.json();

    // Prevent path traversal: ensure resolved path stays within cwd
    const rootDir = resolve(process.cwd());
    const resolvedTarget = resolve(join(rootDir, targetPath || "src"));
    if (!resolvedTarget.startsWith(rootDir + "/") && resolvedTarget !== rootDir) {
      return NextResponse.json({ error: "Invalid targetPath" }, { status: 400 });
    }

    const service = new SelfMaintenanceService();
    const result = await service.runCycle({
      targetPath: targetPath || 'src',
      autoFix: autoFix || false,
      interactive: false
    });
    
    return NextResponse.json({
      success: true,
      analysis: {
        filesAnalyzed: result.analysis.length,
        totalIssues: result.analysis.reduce((sum: number, file: AnalysisResult) => sum + file.issues.length, 0),
        filesWithIssues: result.analysis.filter((f: AnalysisResult) => f.issues.length > 0).length
      },
      plan: {
        totalImprovements: result.plan.improvements.length,
        highPriority: result.plan.summary.highPriority,
        automatable: result.plan.summary.automatable,
        estimatedEffort: result.plan.summary.estimatedTotalEffort,
        recommendations: result.plan.recommendations
      },
      executionResults: result.executionResults
    });
  } catch (error) {
    console.error("Self-maintenance error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const service = new SelfMaintenanceService();
    void service; // Satisfy linter — service info is static
    // Return service info
    return NextResponse.json({
      service: "self-maintenance",
      version: "1.0.0",
      description: "Self-maintenance and code quality improvement system",
      endpoints: {
        POST: "/api/self-maintenance - Run self-maintenance analysis and optional auto-fix"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
