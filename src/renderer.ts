import { SiteConfig, TeamMember } from './types';

// Apply CSS Variables directly to documentElement
export function applyTheme(config: SiteConfig): void {
  const root = document.documentElement;
  const theme = config.theme;

  root.style.setProperty('--radioactive-lime', theme.primaryColor);
  root.style.setProperty('--deep-obsidian', theme.secondaryColor);
  root.style.setProperty('--white', theme.neutralWhite);
  root.style.setProperty('--steel-silver', theme.steelSilver);

  // Text-Font ist fest Open Sans
  root.style.setProperty('--font-body', "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");
  root.style.setProperty('--font-family', "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");

  // Überschriften-Font ist fest FSLucas (wird nicht mehr dynamisch überschrieben)
  root.style.setProperty('--font-heading', "'FSLucas', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");

  // Dynamische Schriftgrössen als CSS-Variablen
  const baseSize = theme.baseFontSize || 16;
  const h1Size = theme.h1Size || 56;
  const h2Size = theme.h2Size || 40;
  const h3Size = theme.h3Size || 44;
  const subheadingSize = theme.subheadingSize || 24;
  const bodySize = theme.bodySize || 17;

  root.style.setProperty('--font-size-base', `${baseSize}px`);
  root.style.fontSize = `${baseSize}px`;
  root.style.setProperty('--font-size-h1', `${h1Size}px`);
  root.style.setProperty('--font-size-h2', `${h2Size}px`);
  root.style.setProperty('--font-size-h3', `${h3Size}px`);
  root.style.setProperty('--font-size-subheading', `${subheadingSize}px`);
  root.style.setProperty('--font-size-body', `${bodySize}px`);

  // Compute 50% opacity primary color for glassy nav
  const hexToRgba = (hex: string, alpha: number) => {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    const num = parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  try {
    root.style.setProperty('--radioactive-lime-50', hexToRgba(theme.primaryColor, 0.45));
  } catch (e) {
    // fallback
  }
}

// Update text in segments
export function renderSegments(config: SiteConfig): void {
  const seg = config.segments;

  // Hero Logo text
  const heroLogo = document.querySelector('.hero-logo');
  if (heroLogo && heroLogo.tagName.toLowerCase() === 'img') {
    // if it's an image, keep alt updated or if text replacement
    heroLogo.setAttribute('alt', seg.hero.logoText);
  }

  // Intro
  const mainTitleEl = document.querySelector('.main-title');
  if (mainTitleEl) {
    mainTitleEl.innerHTML = escapeHtml(seg.intro.mainTitle).replace(/\n/g, '<br>');
  }

  const block1Heading = document.querySelector('#story-block-1 h2, .intro-section .content-col .message-block:nth-of-type(1) h2');
  if (block1Heading) {
    block1Heading.innerHTML = escapeHtml(seg.intro.block1).replace(/\n/g, '<br>');
  }

  const block2Heading = document.querySelector('#story-block-2 h2, .intro-section .content-col .message-block:nth-of-type(2) h2');
  if (block2Heading) {
    block2Heading.innerHTML = escapeHtml(seg.intro.block2).replace(/\n/g, '<br>');
  }

  const block3Heading = document.querySelector('#story-block-3 h2, .intro-section .content-col .message-block:nth-of-type(3) h2');
  if (block3Heading) {
    block3Heading.innerHTML = escapeHtml(seg.intro.block3).replace(/\n/g, '<br>');
  }

  if (typeof (window as any).ScrollTrigger !== 'undefined') {
    (window as any).ScrollTrigger.refresh();
  }

  // Angebot
  const valueStatementEl = document.querySelector('.value-statement');
  if (valueStatementEl) {
    valueStatementEl.innerHTML = `
      ${escapeHtml(seg.angebot.mainText)}
      <span class="highlight-text">${escapeHtml(seg.angebot.highlightText)}</span>
      ${escapeHtml(seg.angebot.endText)}
    `;
  }

  // Kontakt
  const contactLeadEl = document.querySelector('.contact-lead');
  if (contactLeadEl) {
    contactLeadEl.innerHTML = escapeHtml(seg.kontakt.leadText).replace(/\n/g, '<br>');
  }

  const phoneLinkEl = document.querySelector('.phone-link') as HTMLAnchorElement | null;
  if (phoneLinkEl) {
    phoneLinkEl.textContent = seg.kontakt.phoneNumber;
    phoneLinkEl.href = `tel:${seg.kontakt.phoneHref}`;
  }
}

// Render dynamic team members
export function renderTeam(team: TeamMember[]): void {
  const teamSection = document.getElementById('team');
  if (!teamSection) return;

  teamSection.innerHTML = team.map((member) => `
    <article class="team-member" id="member-${member.id}">
      <!-- Linke Seite (50%): Hinterlegtes Foto vollflächig eingepasst, 100vh sticky, kein Radius, kein Schatten -->
      <div class="member-image-column">
        <div class="member-image-sticky">
          <img src="${member.imageUrl || '/images/Björn-2026.jpeg'}"
               alt="${escapeHtml(member.name)}"
               class="member-photo-full"
               loading="lazy">
        </div>
      </div>

      <!-- Rechte Seite (50%): Content scrollt nacheinander in 100vh Segmenten hoch -->
      <div class="member-content-column">
        
        <!-- Segment 1 (100vh): Name und Rolle -->
        <div class="member-segment member-segment-intro">
          <div class="member-segment-inner">
            <h2 class="member-name">${escapeHtml(member.name)}</h2>
            <h3 class="member-role">${escapeHtml(member.role)}</h3>
          </div>
        </div>

        <!-- Segment 2 (100vh): Highlights / Badge-Liste -->
        <div class="member-segment member-segment-highlights">
          <div class="member-segment-inner">
            ${member.badges && member.badges.length > 0 ? `
              <ul class="badge-list">
                ${member.badges.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        </div>

        <!-- Segment 3 (100vh): Biografie / Pitch & Background Untertitel & Background Detail-Punkte & LinkedIn Badge -->
        <div class="member-segment member-segment-details">
          <div class="member-segment-inner">
            ${member.bio ? `
              <p class="member-bio">${escapeHtml(member.bio)}</p>
            ` : ''}

            ${member.subtitle ? `
              <h4 class="member-subtitle">${escapeHtml(member.subtitle)}</h4>
            ` : ''}

            ${member.details && member.details.length > 0 ? `
              <ul class="detail-list">
                ${member.details.map(d => `
                  <li><strong>${escapeHtml(d.label)}:</strong> ${escapeHtml(d.text)}</li>
                `).join('')}
              </ul>
            ` : ''}

            ${member.linkedinUrl ? `
              <a href="${escapeHtml(member.linkedinUrl)}" target="_blank" rel="noopener noreferrer" class="linkedin-link" aria-label="LinkedIn-Profil von ${escapeHtml(member.name)}">
                <img src="/images/LinkedIn_Logo.svg" alt="LinkedIn Profile" class="linkedin-logo" width="128" height="32">
              </a>
            ` : ''}
          </div>
        </div>

      </div>
    </article>
  `).join('');

  // Re-trigger GSAP ScrollTrigger refresh if available
  if (typeof (window as any).ScrollTrigger !== 'undefined') {
    (window as any).ScrollTrigger.refresh();
  }
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
