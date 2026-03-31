import { getComposioClient, resolveComposioUserId } from "@/lib/composio/client";

export type AuditLeadInput = {
  businessName: string;
  businessType?: string;
  city?: string;
  website: string;
  contactName?: string;
  email: string;
  biggestChallenge?: string;
  docId?: string;
  source?: string;
};

const SHEET_TAB = "Audit Leads";

export async function queueAuditLead(lead: AuditLeadInput): Promise<void> {
  const composio = await getComposioClient();
  if (!composio) {
    throw new Error("Composio client not available");
  }

  const spreadsheetId = process.env.AUDITOR_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("AUDITOR_SPREADSHEET_ID is not configured");
  }

  const entityId = resolveComposioUserId("agency-bridge");
  const ts = new Date().toISOString();

  const row = [
    ts,
    lead.businessName,
    lead.businessType || "",
    lead.city || "",
    lead.website,
    lead.contactName || "",
    lead.email,
    lead.biggestChallenge || "",
    "", // Lead Score
    "", // GBP Verified
    "", // GBP Rating
    "", // GBP Reviews
    "", // AI Overview
    "", // Competitor 1
    "", // Competitor 2
    "", // Competitor 3
    "", // Top Quick Win
    "", // Audit Report
    "PENDING",
    lead.docId || "",
  ];

  await (composio as any).tools.execute("GOOGLESHEETS_APPEND_VALUES", {
    userId: entityId,
    arguments: {
      spreadsheet_id: spreadsheetId,
      range: `${SHEET_TAB}!A:T`,
      values: [row],
    },
  });

  const adminChatId = process.env.AUDITOR_TELEGRAM_CHAT_ID;
  if (adminChatId) {
    await (composio as any).tools.execute("TELEGRAM_SEND_MESSAGE", {
      userId: entityId,
      arguments: {
        chat_id: adminChatId,
        text:
          `🔥 *New Audit Request*\n\n` +
          `*Business:* ${lead.businessName}\n` +
          `*Type:* ${lead.businessType || "N/A"}\n` +
          `*City:* ${lead.city || "N/A"}\n` +
          `*Website:* ${lead.website}\n` +
          `*Contact:* ${lead.contactName || "N/A"} (${lead.email})\n\n` +
          `_Queued from ${lead.source || "unknown source"}._`,
        parse_mode: "Markdown",
      },
    });
  }
}
