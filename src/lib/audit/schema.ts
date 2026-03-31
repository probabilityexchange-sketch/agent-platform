import { z } from "zod";

export const auditLeadSchema = z.object({
  businessName: z.string().min(1),
  businessType: z.string().optional().default(""),
  city: z.string().optional().default(""),
  website: z.string().url(),
  contactName: z.string().optional().default(""),
  email: z.string().email(),
  biggestChallenge: z.string().optional().default(""),
  docId: z.string().optional().default(""),
  source: z.string().default("free-audit-page"),
});

export type AuditLeadPayload = z.infer<typeof auditLeadSchema>;
