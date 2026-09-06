export interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  neutralWhite: string;
  steelSilver: string;
  baseFontSize: number;
  h1Size: number;
  h2Size: number;
  h3Size: number;
  subheadingSize: number;
  bodySize: number;
  headingFont?: string;
  fontFamily?: string;
}

export interface DetailItem {
  id: string;
  label: string;
  text: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
  badges: string[];
  bio: string;
  subtitle: string;
  details: DetailItem[];
  linkedinUrl: string;
}

export interface SegmentContent {
  hero: {
    logoText: string;
  };
  intro: {
    mainTitle: string;
    subtitle?: string;
    block1: string;
    block2: string;
    block3: string;
  };
  angebot: {
    mainText: string;
    highlightText: string;
    endText: string;
  };
  kontakt: {
    leadText: string;
    phoneNumber: string;
    phoneHref: string;
  };
}

export interface SiteConfig {
  theme: ThemeSettings;
  segments: SegmentContent;
  team: TeamMember[];
  updatedAt?: string;
  updatedBy?: string;
}
