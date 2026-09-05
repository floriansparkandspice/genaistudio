import { SiteConfig } from './types';

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
      mainTitle: 'Die Kreativ-\nmaschine.\nOhne den ganzen Bullshit.',
      block1: 'Weltklasse Design.\nÜber alle Grenzen hinweg.',
      block2: 'Wir bringen Strategie und Design mit AI zum rocken!',
      block3: 'Human\nCreativity\n&\nArtificial\nIntelligence',
    },
    angebot: {
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
