import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const SKILLS_DIR = path.join(process.cwd(), 'src/skills/anthropic-repo/skills');

export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  path: string;
}

export class SkillManager {
  static async listSkills(): Promise<SkillMetadata[]> {
    if (!fs.existsSync(SKILLS_DIR)) {
      return [];
    }

    const folders = fs.readdirSync(SKILLS_DIR);
    const skills: SkillMetadata[] = [];

    for (const folder of folders) {
      const skillPath = path.join(SKILLS_DIR, folder);
      if (fs.statSync(skillPath).isDirectory()) {
        const skillMdPath = path.join(skillPath, 'SKILL.md');
        if (fs.existsSync(skillMdPath)) {
          try {
            const content = fs.readFileSync(skillMdPath, 'utf8');
            const { data } = matter(content);
            skills.push({
              id: folder,
              name: data.name || folder,
              description: data.description || '',
              path: skillPath,
            });
          } catch (err) {
            console.warn(`Failed to parse skill in ${folder}`, err);
          }
        }
      }
    }

    return skills;
  }

  static async getSkillContent(skillId: string): Promise<string | null> {
    const skillMdPath = path.join(SKILLS_DIR, skillId, 'SKILL.md');
    if (fs.existsSync(skillMdPath)) {
      const content = fs.readFileSync(skillMdPath, 'utf8');
      // Remove frontmatter for the agent's context
      const { content: body } = matter(content);

      // Also list available scripts and examples if they exist
      const skillDir = path.join(SKILLS_DIR, skillId);
      let extras = '\n\nAvailable resources in this skill folder:\n';

      const exploreDir = (dir: string, indent = '') => {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const relPath = path.relative(SKILLS_DIR, fullPath);
          if (fs.statSync(fullPath).isDirectory()) {
            extras += `${indent}- ${item}/\n`;
            // Only go one level deep for inventory
          } else {
            extras += `${indent}- ${item} (Path: ${relPath})\n`;
          }
        }
      };

      exploreDir(skillDir);

      return body + extras;
    }
    return null;
  }
}
