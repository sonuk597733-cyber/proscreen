export type PageRoute =
  | 'home'
  | 'features'
  | 'download'
  | 'chrome-extension'
  | 'gallery'
  | 'changelog'
  | 'faq'
  | 'support'
  | 'privacy'
  | 'terms'
  | 'playground';

export interface ReleaseAsset {
  fileName: string;
  version: string;
  sizeBytes: number;
  sizeFormatted: string;
  sha256: string;
  downloadUrl: string;
  releaseDate: string;
  targetOS: string;
  architecture: string;
  type: 'installer' | 'portable';
  description: string;
  highlights: string[];
}

export interface FeatureItem {
  id: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  category: 'core' | 'tools' | 'workspace' | 'capture' | 'system';
  badge?: string;
  shortcut?: string;
  specs: string[];
  icon: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'windows' | 'extension' | 'shortcuts' | 'troubleshooting' | 'security';
}

export interface ChangelogRelease {
  version: string;
  date: string;
  tagline: string;
  status: 'stable' | 'preview' | 'legacy';
  highlights: string[];
  sections: {
    category: string;
    items: string[];
  }[];
}

export interface DiagnosticResult {
  browser: string;
  os: string;
  screenResolution: string;
  devicePixelRatio: number;
  touchSupport: boolean;
  webGlSupported: boolean;
  mediaRecorderSupported: boolean;
}
