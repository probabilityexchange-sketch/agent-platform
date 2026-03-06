import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

export type SkillMode = "Action" | "Knowledge";
export type SkillSource = "Workspace" | "Agent" | "Imported";

export interface SkillSummary {
    slug: string;
    name: string;
    description: string;
    category: string;
    mode: SkillMode;
    source: SkillSource;
}

export interface SkillDocument extends SkillSummary {
    body: string;
    author?: string;
    version?: string;
}

const DEFAULT_DESCRIPTION = "Reusable capability that extends how the agent reasons and executes tasks.";

const SKILL_ROOTS: Array<{ source: SkillSource; relativePath: string }> = [
    { source: "Workspace", relativePath: "skills" },
    { source: "Agent", relativePath: ".agents/skills" },
    { source: "Imported", relativePath: "src/skills/anthropic-repo/skills" },
];

function getProjectRoot() {
    return process.env.PROJECT_ROOT || process.cwd();
}

function formatSkillName(value: string): string {
    return value
        .replace(/[-_]/g, " ")
        .split(" ")
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function clampDescription(description: string, maxLength = 150): string {
    const normalized = description.trim().replace(/\s+/g, " ");
    if (normalized.length <= maxLength) {
        return normalized;
    }
    return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function extractDescription(markdown: string): string {
    const lines = markdown.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

    for (const line of lines) {
        if (
            line.startsWith("#") ||
            line.startsWith("```") ||
            line.startsWith("|") ||
            line.startsWith("- ") ||
            line.startsWith("* ")
        ) {
            continue;
        }
        return line;
    }

    return DEFAULT_DESCRIPTION;
}

function categorizeSkill(slug: string, description: string): string {
    const searchable = `${slug} ${description}`.toLowerCase();

    if (/(arbitrage|xemm|trading|exchange|liquidity|market)/.test(searchable)) {
        return "Trading";
    }
    if (/(auth|wallet|payment|gateway|api|integration|mcp)/.test(searchable)) {
        return "Integrations";
    }
    if (/(deploy|developer|docker|infrastructure|server|dev stack|testing)/.test(searchable)) {
        return "Infrastructure";
    }
    if (/(react|ux|design|frontend|presentation|slides|spreadsheet|pdf|pptx|xlsx|doc)/.test(searchable)) {
        return "Product";
    }
    return "General";
}

function inferMode(markdown: string): SkillMode {
    const searchable = markdown.toLowerCase();
    if (/(commands:|## workflow|## step|script|run-|setup-|install-|api|process)/.test(searchable)) {
        return "Action";
    }
    return "Knowledge";
}

function readString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readFrontmatterString(data: Record<string, unknown>, key: string): string | undefined {
    const direct = readString(data[key]);
    if (direct) {
        return direct;
    }

    const metadata = data.metadata;
    if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
        return readString((metadata as Record<string, unknown>)[key]);
    }

    return undefined;
}

async function readSkillFromRoot(
    source: SkillSource,
    absoluteRoot: string,
    slug: string,
): Promise<SkillDocument | null> {
    const skillPath = path.join(absoluteRoot, slug, "SKILL.md");

    try {
        const rawContent = await fs.readFile(skillPath, "utf-8");
        const { data, content } = matter(rawContent);
        const frontmatter = data as Record<string, unknown>;
        const description = readFrontmatterString(frontmatter, "description") || extractDescription(content);

        return {
            slug,
            name: formatSkillName(readFrontmatterString(frontmatter, "name") || slug),
            description: clampDescription(description),
            category: categorizeSkill(slug, description),
            mode: inferMode(content),
            source,
            body: content.trim(),
            author: readFrontmatterString(frontmatter, "author"),
            version: readFrontmatterString(frontmatter, "version"),
        };
    } catch {
        return null;
    }
}

async function readSkillSlugs(absoluteRoot: string): Promise<string[]> {
    try {
        const entries = await fs.readdir(absoluteRoot, { withFileTypes: true });
        return entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
    } catch {
        return [];
    }
}

function getAbsoluteRoots() {
    const projectRoot = getProjectRoot();
    return SKILL_ROOTS.map(root => ({
        source: root.source,
        absoluteRoot: path.join(projectRoot, root.relativePath),
    }));
}

export async function loadSkillCatalog(): Promise<SkillSummary[]> {
    const catalog = new Map<string, SkillDocument>();

    for (const root of getAbsoluteRoots()) {
        const slugs = await readSkillSlugs(root.absoluteRoot);
        const docs = await Promise.all(slugs.map(slug => readSkillFromRoot(root.source, root.absoluteRoot, slug)));

        for (const doc of docs) {
            if (!doc || catalog.has(doc.slug)) {
                continue;
            }
            catalog.set(doc.slug, doc);
        }
    }

    return Array.from(catalog.values())
        .map(({ body: _body, author: _author, version: _version, ...summary }) => summary)
        .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadSkillBySlug(slug: string): Promise<SkillDocument | null> {
    for (const root of getAbsoluteRoots()) {
        const doc = await readSkillFromRoot(root.source, root.absoluteRoot, slug);
        if (doc) {
            return doc;
        }
    }

    return null;
}