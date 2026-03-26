import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { resolveComposioUserId } from "@/lib/composio/client";

describe("resolveComposioUserId - entity ID isolation", () => {
    const originalEnvValue = process.env.COMPOSIO_ENTITY_ID;

    beforeEach(() => {
        delete process.env.COMPOSIO_ENTITY_ID;
    });

    afterAll(() => {
        if (originalEnvValue !== undefined) {
            process.env.COMPOSIO_ENTITY_ID = originalEnvValue;
        } else {
            delete process.env.COMPOSIO_ENTITY_ID;
        }
    });

    it("returns userId alone when no agentSlug is given", () => {
        expect(resolveComposioUserId("user123")).toBe("user123");
    });

    it("appends sanitized agentSlug for seo-scout", () => {
        expect(resolveComposioUserId("user123", "seo-scout")).toBe("user123_seo_scout");
    });

    it("appends sanitized agentSlug for researcher", () => {
        expect(resolveComposioUserId("user123", "researcher")).toBe("user123_researcher");
    });

    it("produces distinct entity IDs for the same user across different specialists", () => {
        const seoId = resolveComposioUserId("user123", "seo-scout");
        const researcherId = resolveComposioUserId("user123", "researcher");
        expect(seoId).toBe("user123_seo_scout");
        expect(researcherId).toBe("user123_researcher");
        expect(seoId).not.toBe(researcherId);
    });

    it("produces distinct entity IDs for different users with the same specialist", () => {
        const userAId = resolveComposioUserId("userA", "seo-scout");
        const userBId = resolveComposioUserId("userB", "seo-scout");
        expect(userAId).not.toBe(userBId);
    });

    it("uses COMPOSIO_ENTITY_ID override when set, ignoring userId and agentSlug", () => {
        process.env.COMPOSIO_ENTITY_ID = "global-override";
        expect(resolveComposioUserId("user123", "seo-scout")).toBe("global-override");
        expect(resolveComposioUserId("user456", "researcher")).toBe("global-override");
    });

    it("throws when userId is empty and no override is set", () => {
        expect(() => resolveComposioUserId("")).toThrow(/Missing authenticated user id/);
    });

    it("sanitizes hyphens and special characters in agentSlug", () => {
        expect(resolveComposioUserId("user123", "my-agent-v2")).toBe("user123_my_agent_v2");
    });

    it("sanitizes uppercase in agentSlug", () => {
        expect(resolveComposioUserId("user123", "SEO-Scout")).toBe("user123_seo_scout");
    });
});
