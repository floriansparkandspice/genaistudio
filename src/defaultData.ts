import { SiteConfig, IntroBlock, AngebotBlock } from './types';

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  theme: {
    primaryColor: '#ccff00',
    secondaryColor: '#031425',
    neutralWhite: '#ffffff',
    steelSilver: '#c0c0c0',
    baseFontSize: 16,
    h1Size: 56,
    h2Size: 40,
    h3Size: 44,
    subheadingSize: 24,
    bodySize: 17,
    headingFont: "'FSLucas', sans-serif",
    fontFamily: "'Open Sans', sans-serif",
  },
  segments: {
    hero: {
      logoText: 'GENAI STUDIO',
    },
    intro: {
      mainTitle: 'Die Venture-Schmiede.',
      subtitle: '',
      blocks: [
        {
          id: 'intro-1',
          text: 'Schlüsselfertige Ventures.\nVon der ersten Idee bis zu echter Traktion.',
          hasAnimation: false,
        },
        {
          id: 'intro-2',
          text: 'Wir verwandeln ungenutztes Potenzial in euer nächstes Wachstumsfeld.',
          hasAnimation: false,
        },
        {
          id: 'intro-3',
          text: 'Human\nCreativity\n&\nArtificial\nIntelligence',
          hasAnimation: true,
        },
      ],
      block1: 'Schlüsselfertige Ventures.\nVon der ersten Idee bis zu echter Traktion.',
      block2: 'Wir verwandeln ungenutztes Potenzial in euer nächstes Wachstumsfeld.',
      block3: 'Human\nCreativity\n&\nArtificial\nIntelligence',
    },
    angebot: {
      items: [
        {
          id: 'angebot-1',
          text: 'Grenzenloses Design, solide Strategie, schnelle KI-Umsetzung.',
        },
        {
          id: 'angebot-2',
          text: 'Wir bringen dein Unternehmen voran.',
        },
        {
          id: 'angebot-3',
          text: 'Ohne Umwege, aber dafür mit weltklasse Resultaten.',
        },
      ],
      mainText: 'Grenzenloses Design, solide Strategie, schnelle KI-Umsetzung.',
      highlightText: 'Wir bringen dein Unternehmen voran.',
      endText: 'Ohne Umwege, aber dafür mit weltklasse Resultaten.',
    },
    kontakt: {
      leadText: 'Keine Warteschleife, kein Vorzimmer.\nRuf Björn direkt an.\nFalls er besetzt ist, meldet er sich zurück. Wir freuen uns auf dein Projekt.',
      phoneNumber: '079 283 06 59',
      phoneHref: '+41792830659',
    },
  },
  team: [
    {
      id: 'bjoern-ischi',
      name: 'Björn Ischi',
      role: 'Der Architekt der Kreislaufwirtschaft für zukunftsfähige Produkte.',
      imageUrl: '/images/Bjoern.webp',
      badges: [
        '26+ Jahre Berufserfahrung – von der Baustelle bis zum Designstudio',
        'First Mover in Circular Design (seit 2010) & Upcycling-Pionier',
        '45+ Marktreife Produkte erfolgreich entworfen und lanciert',
        '18+ Internationale Design Awards für exzellente Gestaltung',
        'Unternehmer aus Leidenschaft: Gründer von 2 GmbHs und 5 Nonprofit-Organisationen',
        'Fachexperte für Circular Design an der Berner Fachhochschule (BFH)',
      ],
      bio: 'Ich verbinde die Bodenhaftung eines Bauleiters mit der Vision eines Industrial Designers, um echte Werte in einer zirkulären Welt zu schaffen. Mein Fokus liegt nicht auf kurzlebigen Trends, sondern auf „Fit to Market“-Lösungen, die ökonomisch sinnvoll und ökologisch konsequent sind. Ich gestalte keine Produkte – ich gestalte Kreisläufe.',
      subtitle: 'Mein Background: Vom Bauleiter zum Industrial & Circular Designer.',
      details: [
        {
          id: 'b1',
          label: 'Fundament & Bau',
          text: 'Wurzeln im Baumanagement – dort gelernt, wie Projekte effizient und substanziell realisiert werden.',
        },
        {
          id: 'b2',
          label: 'Design & Strategie',
          text: 'Über 15 Jahre Erfahrung in der Gestaltung marktfähiger Produkte und strategischer Designprozesse.',
        },
        {
          id: 'b3',
          label: 'Circular Pioneer',
          text: 'Seit 2010 einer der ersten Akteure im Bereich Circular Design in der Schweiz; Experte für Upcycling und nachhaltige Wertschöpfung.',
        },
      ],
      linkedinUrl: 'https://www.linkedin.com/in/bj%C3%B6rn-ischi/',
    },
    {
      id: 'florian-baumgartner',
      name: 'Florian Baumgartner',
      role: 'Der digitale Innovationshandwerker für Schweizer KMU.',
      imageUrl: '/images/Florian.webp',
      badges: [
        'Vertiefte Expertise in Design Thinking, Lean Startup und Digitalisierung',
        'Hunderte von KMU in ihren Innovationsvorhaben begleitet',
        'Unternehmer seit 2010',
        '10+ digitale Plattformen aufgebaut',
        '2 erfolgreiche Exits',
        '2 AGs, 2 GmbHs und 2 Nonprofit-Organisationen gegründet',
      ],
      bio: 'Ich kombiniere Unternehmertum und langjähriges Innovations-Handwerk mit angewandten digitalen Skills, um dein KMU aufs nächste Level zu heben. Mein Ansatz ist radikal pragmatisch: Ich schreibe keine langen Konzepte, sondern baue funktionierende Prozesse.',
      subtitle: 'Mein Background: Vom Produkt Design zur digitalen Architektur.',
      details: [
        {
          id: 'f1',
          label: 'Corporate & Design',
          text: 'Wurzeln im Produkt Design in der Volkswagen Konzernforschung und im Volkswagen Design Center, sowie als Creative Director bei der Vetica Group AG.',
        },
        {
          id: 'f2',
          label: 'Entrepreneurship',
          text: 'Gründung diverser Startups.',
        },
        {
          id: 'f3',
          label: 'Innovation Consulting',
          text: 'Seit 2012 Begleitung hunderter von KMU in ihren Innovationsvorhaben.',
        },
      ],
      linkedinUrl: 'https://www.linkedin.com/in/florian-baumgartner/',
    },
  ],
};

export function normalizeSiteConfig(raw: any): SiteConfig {
  if (!raw || typeof raw !== 'object') return JSON.parse(JSON.stringify(DEFAULT_SITE_CONFIG));

  const config: SiteConfig = {
    ...DEFAULT_SITE_CONFIG,
    ...raw,
    theme: { ...DEFAULT_SITE_CONFIG.theme, ...(raw.theme || {}) },
    segments: {
      ...DEFAULT_SITE_CONFIG.segments,
      ...(raw.segments || {}),
      hero: { ...DEFAULT_SITE_CONFIG.segments.hero, ...(raw.segments?.hero || {}) },
      kontakt: { ...DEFAULT_SITE_CONFIG.segments.kontakt, ...(raw.segments?.kontakt || {}) },
    },
    team: Array.isArray(raw.team) && raw.team.length > 0 ? raw.team : DEFAULT_SITE_CONFIG.team,
  };

  // Normalisiere Intro-Blöcke
  const rawIntro = raw.segments?.intro || {};
  let introBlocks: IntroBlock[] = [];
  if (Array.isArray(rawIntro.blocks) && rawIntro.blocks.length > 0) {
    introBlocks = rawIntro.blocks.map((b: any, idx: number) => {
      if (typeof b === 'string') {
        return { id: `intro-${idx + 1}`, text: b, hasAnimation: idx === rawIntro.blocks.length - 1 };
      }
      return {
        id: b.id || `intro-${idx + 1}`,
        text: b.text || '',
        hasAnimation: !!b.hasAnimation,
      };
    });
  } else {
    const legacyBlocks = [rawIntro.block1, rawIntro.block2, rawIntro.block3].filter(Boolean);
    if (legacyBlocks.length > 0) {
      introBlocks = legacyBlocks.map((txt: string, idx: number) => ({
        id: `intro-${idx + 1}`,
        text: txt,
        hasAnimation: idx === legacyBlocks.length - 1,
      }));
    } else {
      introBlocks = JSON.parse(JSON.stringify(DEFAULT_SITE_CONFIG.segments.intro.blocks));
    }
  }

  config.segments.intro = {
    mainTitle: rawIntro.mainTitle || DEFAULT_SITE_CONFIG.segments.intro.mainTitle,
    subtitle: rawIntro.subtitle || '',
    blocks: introBlocks,
    block1: introBlocks[0]?.text || '',
    block2: introBlocks[1]?.text || '',
    block3: introBlocks[2]?.text || '',
  };

  // Normalisiere Angebot-Statements
  const rawAngebot = raw.segments?.angebot || {};
  let angebotItems: AngebotBlock[] = [];
  if (Array.isArray(rawAngebot.items) && rawAngebot.items.length > 0) {
    angebotItems = rawAngebot.items.map((it: any, idx: number) => {
      if (typeof it === 'string') {
        return { id: `angebot-${idx + 1}`, text: it };
      }
      return {
        id: it.id || `angebot-${idx + 1}`,
        text: it.text || '',
      };
    });
  } else {
    const legacyAngebot = [rawAngebot.mainText, rawAngebot.highlightText, rawAngebot.endText].filter(Boolean);
    if (legacyAngebot.length > 0) {
      angebotItems = legacyAngebot.map((txt: string, idx: number) => ({
        id: `angebot-${idx + 1}`,
        text: txt,
      }));
    } else {
      angebotItems = JSON.parse(JSON.stringify(DEFAULT_SITE_CONFIG.segments.angebot.items));
    }
  }

  config.segments.angebot = {
    items: angebotItems,
    mainText: angebotItems[0]?.text || '',
    highlightText: angebotItems[1]?.text || '',
    endText: angebotItems[2]?.text || '',
  };

  return config;
}
