import { getComposioClient } from "../src/lib/composio/client";
import { CodeAnalyzer } from "../src/lib/self-maintenance/analyzer";
import { execSync } from "child_process";
import { existsSync, rmSync, mkdirSync } from "fs";
import path from "path";

/**
 * Randi Employee: The Auditor
 * 
 * This script monitors a Google Sheet for new audit requests,
 * clones the requested repository, runs the Randi Code Analyzer,
 * and updates the sheet with the results.
 */

const SPREADSHEET_ID = process.env.AUDITOR_SPREADSHEET_ID;
const SHEETS_ENTITY_ID = process.env.AUDITOR_ENTITY_ID || "auditor-employee";
const POLL_INTERVAL_MS = 60_000; // 1 minute

async function runAuditor() {
  console.log("🚀 Randi Auditor Employee started...");
  
  if (!SPREADSHEET_ID) {
    console.error("❌ AUDITOR_SPREADSHEET_ID is not set.");
    process.exit(1);
  }

  const composio = await getComposioClient();
  if (!composio) {
    console.error("❌ Composio client failed to initialize. Check COMPOSIO_API_KEY.");
    process.exit(1);
  }

  // Ensure temp directory for cloning
  const tempDir = path.join(process.cwd(), "temp-audits");
  if (!existsSync(tempDir)) mkdirSync(tempDir);

  while (true) {
    try {
      console.log(`[${new Date().toISOString()}] Checking Google Sheet for pending audits...`);
      
      // 1. Fetch values from the sheet
      // Assumes Sheet1, and columns: Timestamp, Email, Repo URL, Status, Report
      const response = await (composio as any).tools.execute("GOOGLESHEETS_GET_VALUES", {
        userId: SHEETS_ENTITY_ID,
        arguments: {
          spreadsheet_id: SPREADSHEET_ID,
          range: "Sheet1!A2:E100", // Check up to 100 rows
        },
      });

      const rows = response?.data?.values || [];
      
      for (let i = 0; i < rows.length; i++) {
        const [timestamp, email, repoUrl, status, report] = rows[i];
        const rowIndex = i + 2; // +2 because we started at A2 (1-based index)

        if (status === "PENDING" && repoUrl) {
          console.log(`🎯 Found pending audit for ${repoUrl} (${email})`);
          
          try {
            // Update status to PROCESSING
            await updateRowStatus(composio, rowIndex, "PROCESSING");

            // 2. Clone the repository
            const repoName = repoUrl.split("/").pop()?.replace(".git", "") || `audit-${Date.now()}`;
            const targetDir = path.join(tempDir, repoName);
            
            console.log(`📁 Cloning ${repoUrl} into ${targetDir}...`);
            if (existsSync(targetDir)) rmSync(targetDir, { recursive: true, force: true });
            execSync(`git clone --depth 1 ${repoUrl} ${targetDir}`);

            // 3. Run Analysis
            console.log(`🔍 Analyzing code...`);
            const analyzer = new CodeAnalyzer(targetDir);
            const results = await analyzer.analyze("."); // Analyze root of cloned repo
            
            // 4. Summarize findings
            const totalIssues = results.reduce((sum, res) => sum + res.issues.length, 0);
            const summary = `Audit Complete. Found ${totalIssues} issues across ${results.length} files. 
              Top findings: ${results.slice(0, 3).map(r => r.filepath).join(", ")}`;

            // 5. Update Sheet with Result
            await (composio as any).tools.execute("GOOGLESHEETS_UPDATE_VALUES", {
              userId: SHEETS_ENTITY_ID,
              arguments: {
                spreadsheet_id: SPREADSHEET_ID,
                range: `Sheet1!D${rowIndex}:E${rowIndex}`,
                values: [["COMPLETED", summary]],
              },
            });

            // 6. Send Email Result (New!)
            if (email) {
              console.log(`✉️ Sending email to ${email}...`);
              try {
                await (composio as any).tools.execute("GMAIL_SEND_EMAIL", {
                  userId: SHEETS_ENTITY_ID,
                  arguments: {
                    recipient: email,
                    subject: `Randi Agency: Code Audit Complete for ${repoName}`,
                    body: `Hello,\n\nYour automated code audit for ${repoUrl} is complete.\n\nSUMMARY:\n${summary}\n\nThank you for using Randi Agency.\n\nBest,\nRandi`,
                  },
                });
                console.log(`✅ Email sent to ${email}`);
              } catch (emailError: any) {
                console.error(`⚠️ Failed to send email to ${email}:`, emailError.message);
              }
            }

            // 7. Send Telegram Admin Notification (New!)
            const adminChatId = process.env.AUDITOR_TELEGRAM_CHAT_ID;
            if (adminChatId) {
              console.log(`📱 Sending Telegram notification to admin...`);
              try {
                await (composio as any).tools.execute("TELEGRAM_SEND_MESSAGE", {
                  userId: SHEETS_ENTITY_ID,
                  arguments: {
                    chat_id: adminChatId,
                    text: `✅ *Audit Complete*\n\n*Repo:* ${repoUrl}\n*Customer:* ${email || "Anonymous"}\n\n*Summary:* ${summary}`,
                    parse_mode: "Markdown",
                  },
                });
                console.log(`✅ Telegram notification sent`);
              } catch (tgError: any) {
                console.error(`⚠️ Failed to send Telegram notification:`, tgError.message);
              }
            }

            console.log(`✅ Audit complete for ${repoUrl}`);

            // Cleanup
            rmSync(targetDir, { recursive: true, force: true });

          } catch (auditError: any) {
            console.error(`❌ Failed to audit ${repoUrl}:`, auditError.message);
            await updateRowStatus(composio, rowIndex, `ERROR: ${auditError.message.slice(0, 50)}`);
          }
        }
      }

    } catch (error: any) {
      console.error("❌ Loop error:", error.message);
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

async function updateRowStatus(composio: any, rowIndex: number, status: string) {
  await (composio as any).tools.execute("GOOGLESHEETS_UPDATE_VALUES", {
    userId: SHEETS_ENTITY_ID,
    arguments: {
      spreadsheet_id: SPREADSHEET_ID,
      range: `Sheet1!D${rowIndex}`,
      values: [[status]],
    },
  });
}

runAuditor().catch(err => {
  console.error("CRITICAL ERROR:", err);
  process.exit(1);
});
