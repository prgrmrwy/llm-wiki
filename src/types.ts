export type TemplateKey = "research" | "engineering" | "investment" | "learning";

export interface PageTypeTemplate {
  name: string;
  summary: string;
  requiredSections: string[];
  linkingRules: string[];
}

export interface SchemaTemplate {
  key: TemplateKey;
  title: string;
  description: string;
  keywords: string[];
  pageTypes: PageTypeTemplate[];
  namingRules: string[];
  linkingGuidance: string[];
}

export interface RegistryEntry {
  name: string;
  path: string;
  description: string;
  created: string;
}

export interface RegistryData {
  wikis: RegistryEntry[];
}
