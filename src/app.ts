// Automatische Domain-Weiterleitung von ai.studio auf die offizielle Domain
if (typeof window !== 'undefined' && window.location.hostname.includes('ai.studio')) {
  window.location.replace('https://genaistudio.one' + window.location.pathname + window.location.search);
}

import { subscribeToSiteConfig } from './firebase';
import { applyTheme, renderSegments, renderTeam } from './renderer';
import { AdminController } from './admin';
import { SiteConfig } from './types';
import { DEFAULT_SITE_CONFIG } from './defaultData';
import animationData from './assets/images/Animation.json';

declare const gsap: any;
declare const ScrollTrigger: any;
declare const lottie: any;

let adminController: AdminController | null = null;
let gsapInitialized = false;

export function initTeamScrollTriggers() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  // Clean up any stale team triggers before re-binding
  ScrollTrigger.getAll().forEach((st: any) => {
    const triggerEl = st.trigger;
    if (
      triggerEl &&
      (triggerEl.classList?.contains('member-segment') ||
       triggerEl.classList?.contains('member-segment-inner') ||
       triggerEl.classList?.contains('team-member') ||
       triggerEl.classList?.contains('member-photo-full') ||
       triggerEl.closest?.('.team-member'))
    ) {
      st.kill();
    }
  });

  // Team Sektion: Jedes Teammitglied ist wie die Angebot-Sektion 100vh gepinnt.
  // Die 3 Segmente (1. Name + Rolle, 2. Highlights / Badges, 3. Biografie / Background / LinkedIn)
  // sind exakt zentriert und blenden nacheinander ein und aus (0% -> 100% -> 0%), ohne Scroll-Bewegung.
  const teamMembers = gsap.utils.toArray('.team-member');
  teamMembers.forEach((member: any) => {
    const segIntro = member.querySelector('.member-segment-intro');
    const segHighlights = member.querySelector('.member-segment-highlights');
    const segDetails = member.querySelector('.member-segment-details');

    if (!segIntro || !segHighlights || !segDetails) return;

    gsap.set([segIntro, segHighlights, segDetails], { opacity: 0, pointerEvents: 'none' });

    const memberTl = gsap.timeline({
      scrollTrigger: {
        trigger: member,
        start: 'top top',
        end: '+=240%',
        pin: true,
        scrub: 0.5,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    memberTl
      // 1. Name plus Rolle / Titel
      .to(segIntro, { opacity: 1, duration: 1, ease: 'power1.inOut' })
      .to(segIntro, { opacity: 1, duration: 1.5 })
      .to(segIntro, { opacity: 0, duration: 1, ease: 'power1.inOut' })
      // 2. Highlights / Badgeliste (weisse Schrift, ohne grünen Hintergrund)
      .to(segHighlights, { opacity: 1, duration: 1, ease: 'power1.inOut' })
      .to(segHighlights, { opacity: 1, duration: 1.5 })
      .to(segHighlights, { opacity: 0, duration: 1, ease: 'power1.inOut' })
      // 3. Biografie / Background / Linkedin
      .to(segDetails, { opacity: 1, duration: 1, ease: 'power1.inOut' })
      .set(segDetails, { pointerEvents: 'auto' }, '<')
      .to(segDetails, { opacity: 1, duration: 1.5 })
      .to(segDetails, { opacity: 0, duration: 1, ease: 'power1.inOut' })
      .set(segDetails, { pointerEvents: 'none' });
  });
}

(window as any).initTeamScrollTriggers = initTeamScrollTriggers;

function initIntroScrollTriggers() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  // A. Texte oben im Intro ("Die Kreativmaschine. Ohne den ganzen Bullshit.")
  const headline = document.querySelector('.intro-section .headline-col');
  const introSection = document.querySelector('.intro-section');
  if (headline && introSection) {
    const introHeadlineTl = gsap.timeline({
      scrollTrigger: {
        trigger: introSection,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });

    introHeadlineTl
      .fromTo(headline, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, ease: 'power1.out' })
      .to(headline, { opacity: 1, y: 0, duration: 6, ease: 'none' })
      .to(headline, { opacity: 0, y: -30, duration: 1, ease: 'power1.in' });
  }

  // B. Message-Blöcke rechts im Intro (100vh Segmente nacheinander):
  // - Am unteren Bildrand Opacity = 0%
  // - Wenn die Mitte im Bereich 40%-60% ist: Opacity = 100%
  // - Am oberen Bildrand wieder auf Opacity = 0%
  const messageBlocks = gsap.utils.toArray('.intro-section .message-block');
  messageBlocks.forEach((block: any) => {
    const blockTl = gsap.timeline({
      scrollTrigger: {
        trigger: block,
        start: 'center bottom',
        end: 'center top',
        scrub: true,
      },
    });

    blockTl
      .fromTo(
        block,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 4, ease: 'power1.out' }
      )
      .to(block, { opacity: 1, y: 0, duration: 2, ease: 'none' }) // Plateau 40%-60%
      .to(block, { opacity: 0, y: -30, duration: 4, ease: 'power1.in' });
  });

  // C. Angebot Sektion (#angebot) – 100vh Pinned Scrolltelling
  // Die 3 Texte sind absolut in der Bildschirmmitte zentriert.
  // Beim Scrollen faden sie nacheinander ein (0% -> 100%), halten kurz und faden wieder aus (100% -> 0%) – ohne jede Bewegung.
  const angebotSection = document.getElementById('angebot');
  const item1 = document.querySelector('.value-item-1');
  const item2 = document.querySelector('.value-item-2');
  const item3 = document.querySelector('.value-item-3');

  if (angebotSection && item1 && item2 && item3) {
    gsap.set([item1, item2, item3], { opacity: 0 });

    const valueTl = gsap.timeline({
      scrollTrigger: {
        trigger: angebotSection,
        start: 'top top',
        end: '+=240%',
        pin: true,
        scrub: 0.5,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    valueTl
      // 1. Text
      .to(item1, { opacity: 1, duration: 1, ease: 'power1.inOut' })
      .to(item1, { opacity: 1, duration: 1.5 })
      .to(item1, { opacity: 0, duration: 1, ease: 'power1.inOut' })
      // 2. Text (Highlight)
      .to(item2, { opacity: 1, duration: 1, ease: 'power1.inOut' })
      .to(item2, { opacity: 1, duration: 1.5 })
      .to(item2, { opacity: 0, duration: 1, ease: 'power1.inOut' })
      // 3. Text (Abschluss)
      .to(item3, { opacity: 1, duration: 1, ease: 'power1.inOut' })
      .to(item3, { opacity: 1, duration: 1.5 })
      .to(item3, { opacity: 0, duration: 1, ease: 'power1.inOut' });
  }
}

function initGsap() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  if (!gsapInitialized) {
    initIntroScrollTriggers();
    gsapInitialized = true;
  }

  // Team 100vh Segmente und Team-Fotos Scrolltelling
  initTeamScrollTriggers();
}

function initLottie() {
  const lottieTarget = document.getElementById('lottie-container');
  if (!lottieTarget) return;

  const tryLoad = () => {
    const lottieLib = typeof lottie !== 'undefined' ? lottie : (window as any).lottie;
    if (lottieLib && typeof lottieLib.loadAnimation === 'function') {
      try {
        lottieTarget.innerHTML = '';
        lottieLib.loadAnimation({
          container: lottieTarget,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: animationData,
        });
        return true;
      } catch (err) {
        console.warn('Lottie animation failed to load:', err);
      }
    }
    return false;
  };

  if (!tryLoad()) {
    const interval = setInterval(() => {
      if (tryLoad()) {
        clearInterval(interval);
      }
    }, 50);
    setTimeout(() => clearInterval(interval), 4000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize with default/local data first
  adminController = new AdminController(DEFAULT_SITE_CONFIG);

  // 2. Subscribe to Firebase configuration in real time
  subscribeToSiteConfig(
    (config: SiteConfig) => {
      applyTheme(config);
      renderSegments(config);
      renderTeam(config.team);
      if (adminController) {
        adminController.updateConfig(config);
      }

      // Initialize or refresh GSAP once team is populated
      setTimeout(() => {
        initGsap();
        if (typeof ScrollTrigger !== 'undefined') {
          ScrollTrigger.refresh();
        }
      }, 50);
    },
    (err) => {
      console.warn('Running with local configuration fallback:', err);
      initGsap();
    }
  );

  // 3. Initialize Lottie
  initLottie();
});
