import test from "node:test";
import assert from "node:assert/strict";
import { loadSkillBySlug, loadSkillCatalog } from "./catalog";

test("loadSkillCatalog merges all repo skill roots and dedupes repeated slugs", async () => {
    const catalog = await loadSkillCatalog();
    const slugs = catalog.map(skill => skill.slug);

    assert.ok(slugs.includes("privy-auth"));
    assert.ok(slugs.includes("agentic-gateway"));
    assert.ok(slugs.includes("mcp-builder"));
    assert.equal(slugs.filter(slug => slug === "hummingbot").length, 1);
});

test("loadSkillBySlug resolves non-primary sources and parses frontmatter safely", async () => {
    const agentSkill = await loadSkillBySlug("agentic-gateway");
    const importedSkill = await loadSkillBySlug("mcp-builder");

    assert.ok(agentSkill);
    assert.equal(agentSkill?.source, "Agent");
    assert.match(agentSkill?.description ?? "", /Alchemy APIs/i);

    assert.ok(importedSkill);
    assert.equal(importedSkill?.source, "Imported");
    assert.match(importedSkill?.description ?? "", /MCP/i);
});