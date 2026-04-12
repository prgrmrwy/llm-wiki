import type { SchemaTemplate, TemplateKey } from "../types.js";

export const schemaTemplates: Record<TemplateKey, SchemaTemplate> = {
  research: {
    key: "research",
    title: "Research Wiki",
    description: "For paper-heavy domains, conceptual synthesis, and literature tracking.",
    keywords: ["research", "paper", "literature", "study", "benchmark", "evaluation"],
    pageTypes: [
      {
        name: "papers",
        summary: "Primary sources, papers, and reports.",
        requiredSections: ["Summary", "Claims", "Method", "Evidence", "Open Questions", "References"],
        linkingRules: ["Link to relevant [[concepts]] and [[analyses]].", "Reference benchmark or dataset pages when relevant."],
      },
      {
        name: "concepts",
        summary: "Key concepts, terms, and recurring methods.",
        requiredSections: ["Definition", "Why It Matters", "Variants", "Connected Work", "References"],
        linkingRules: ["Link to supporting [[papers]].", "Link to downstream [[analyses]]."],
      },
      {
        name: "analyses",
        summary: "Cross-source synthesis, comparisons, and takeaways.",
        requiredSections: ["Question", "Synthesis", "Trade-offs", "Implications", "References"],
        linkingRules: ["Link to all supporting [[papers]] and [[concepts]]."],
      },
    ],
    namingRules: ["Use concise noun phrases.", "Prefer canonical paper titles or concept names.", "Keep filenames stable once referenced."],
    linkingGuidance: ["Every page should link to at least one other page.", "Analyses pages should connect multiple source pages."],
  },
  engineering: {
    key: "engineering",
    title: "Engineering Wiki",
    description: "For systems, tooling, frameworks, experiments, and design trade-offs.",
    keywords: ["engineering", "framework", "system", "architecture", "experiment", "runtime"],
    pageTypes: [
      {
        name: "frameworks",
        summary: "Libraries, tools, platforms, and systems.",
        requiredSections: ["Overview", "Use Cases", "Strengths", "Limitations", "References"],
        linkingRules: ["Link to related [[concepts]] and [[experiments]].", "Reference adoption or migration [[analyses]] when available."],
      },
      {
        name: "concepts",
        summary: "Architectural patterns and technical concepts.",
        requiredSections: ["Definition", "Mechanics", "Trade-offs", "Examples", "References"],
        linkingRules: ["Link to implementations in [[frameworks]].", "Link to validation in [[experiments]]."],
      },
      {
        name: "experiments",
        summary: "Hands-on tests, prototypes, and measurements.",
        requiredSections: ["Goal", "Setup", "Result", "Interpretation", "Next Steps"],
        linkingRules: ["Link to the motivating [[concepts]].", "Link to affected [[frameworks]] or [[analyses]]."],
      },
      {
        name: "analyses",
        summary: "Design reviews, comparisons, and decisions.",
        requiredSections: ["Question", "Context", "Options", "Decision", "References"],
        linkingRules: ["Link to all option pages and follow-up [[experiments]]."],
      },
    ],
    namingRules: ["Name pages after the system, pattern, or question.", "Use kebab-case filenames if names contain spaces."],
    linkingGuidance: ["Experiments must connect back to the question they tested.", "Analyses should end with explicit decisions or unresolved risks."],
  },
  investment: {
    key: "investment",
    title: "Investment Wiki",
    description: "For companies, theses, events, and concept tracking.",
    keywords: ["investment", "company", "thesis", "market", "event", "valuation"],
    pageTypes: [
      {
        name: "companies",
        summary: "Company snapshots and ongoing monitoring.",
        requiredSections: ["Business", "Metrics", "Bull Case", "Bear Case", "References"],
        linkingRules: ["Link to relevant [[theses]], [[events]], and [[concepts]]."],
      },
      {
        name: "theses",
        summary: "Investment theses and scenario framing.",
        requiredSections: ["Claim", "Drivers", "Evidence", "Risks", "Triggers"],
        linkingRules: ["Link to supporting [[companies]] and [[events]]."],
      },
      {
        name: "events",
        summary: "Catalysts, earnings, launches, and macro events.",
        requiredSections: ["What Happened", "Impact", "Affected Names", "Follow-up", "References"],
        linkingRules: ["Link to impacted [[companies]] and revised [[theses]]."],
      },
      {
        name: "concepts",
        summary: "Market concepts, metrics, and frameworks.",
        requiredSections: ["Definition", "Interpretation", "Signals", "References"],
        linkingRules: ["Link to applied [[companies]] and [[analyses]]."],
      },
      {
        name: "analyses",
        summary: "Cross-company or cross-theme synthesis.",
        requiredSections: ["Question", "View", "Evidence", "Counterpoints", "References"],
        linkingRules: ["Link to all supporting [[companies]], [[events]], and [[concepts]]."],
      },
    ],
    namingRules: ["Use canonical company names or thesis statements.", "Date-stamp event pages when timing matters."],
    linkingGuidance: ["Keep the causal chain explicit: event -> company -> thesis.", "Analyses should identify what would invalidate the view."],
  },
  learning: {
    key: "learning",
    title: "Learning Wiki",
    description: "General-purpose learning workspace for concepts, resources, and synthesis.",
    keywords: ["learning", "study", "resource", "topic", "curriculum", "notes"],
    pageTypes: [
      {
        name: "concepts",
        summary: "Concept notes and distilled understanding.",
        requiredSections: ["Definition", "Intuition", "Examples", "Questions", "References"],
        linkingRules: ["Link to relevant [[resources]] and [[analyses]]."],
      },
      {
        name: "resources",
        summary: "Books, articles, videos, courses, and source material.",
        requiredSections: ["Summary", "Why It Matters", "Key Points", "Follow-up", "References"],
        linkingRules: ["Link to covered [[concepts]].", "Link to resulting [[analyses]]."],
      },
      {
        name: "analyses",
        summary: "Summaries, retrospectives, and study synthesis.",
        requiredSections: ["Question", "Takeaways", "Connections", "Next Actions", "References"],
        linkingRules: ["Link to all source [[resources]] and related [[concepts]]."],
      },
    ],
    namingRules: ["Use learner-friendly names that match how you will search later.", "Prefer one stable page per concept or resource."],
    linkingGuidance: ["Capture unresolved questions directly in the page.", "Use analyses pages to connect multiple concepts over time."],
  },
};

export function suggestTemplateKey(description: string): TemplateKey {
  const normalized = description.toLowerCase();
  let bestMatch: TemplateKey = "learning";
  let bestScore = -1;

  for (const template of Object.values(schemaTemplates)) {
    const score = template.keywords.reduce((sum, keyword) => sum + (normalized.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = template.key;
    }
  }

  return bestMatch;
}

function prefersChinese(languagePreference: string): boolean {
  return /中文|汉语|汉文|chinese|zh/i.test(languagePreference);
}

export function renderSchemaMarkdown(
  domainDescription: string,
  template: SchemaTemplate,
  selectedPageTypes?: string[],
  languagePreference: string = "中文",
): string {
  const pageTypes = selectedPageTypes
    ? template.pageTypes.filter((pageType) => selectedPageTypes.includes(pageType.name))
    : template.pageTypes;
  const zh = prefersChinese(languagePreference);

  const lines: string[] = [
    "# Schema",
    "",
    zh ? "## 语言偏好" : "## Language Preference",
    zh ? `- 默认输出语言：${languagePreference}` : `- Default output language: ${languagePreference}`,
    zh
      ? "- 除非用户明确要求其他语言，否则 schema 驱动下生成的新页面、摘要和分析都必须使用该语言。"
      : "- Unless the user explicitly requests another language, schema-driven pages, summaries, and analyses must use this language.",
    "",
    zh ? "## 领域描述" : "## Domain Description",
    domainDescription,
    "",
    zh ? "## 基础模板" : "## Base Template",
    zh ? `${template.title}（${template.key}）` : `${template.title} (${template.key})`,
    "",
    zh ? "## 页面类型" : "## Page Types",
  ];

  for (const pageType of pageTypes) {
    lines.push("");
    lines.push(`### ${pageType.name}`);
    lines.push(pageType.summary);
    lines.push("");
    lines.push(zh ? "必填章节：" : "Required sections:");
    for (const section of pageType.requiredSections) {
      lines.push(`- ${section}`);
    }
    lines.push("");
    lines.push(zh ? "交叉链接规则：" : "Cross-link guidance:");
    for (const rule of pageType.linkingRules) {
      lines.push(`- ${rule}`);
    }
  }

  lines.push("");
  lines.push(zh ? "## 命名规则" : "## Naming Rules");
  for (const rule of template.namingRules) {
    lines.push(`- ${rule}`);
  }

  lines.push("");
  lines.push(zh ? "## 全局交叉链接规则" : "## Global Cross-Link Guidance");
  for (const rule of template.linkingGuidance) {
    lines.push(`- ${rule}`);
  }

  return `${lines.join("\n")}\n`;
}
