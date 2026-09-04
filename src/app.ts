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

  // 1. Fotos der Teammitglieder (links sticky 50%):
  // Fadet am unteren Bildrand ein (0% -> 100% im Bereich 40%-60%), bleibt während der 3 Segmente auf 100%
  // und fadet beim Weitergehen nach oben wieder sanft auf 0% zurück.
  const teamMembers = gsap.utils.toArray('.team-member');
  teamMembers.forEach((member: any) => {
    const photo = member.querySelector('.member-photo-full');
    if (!photo) return;

    const photoTl = gsap.timeline({
      scrollTrigger: {
        trigger: member,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });

    photoTl
      .fromTo(photo, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power1.out' })
      .to(photo, { opacity: 1, duration: 6, ease: 'none' })
      .to(photo, { opacity: 0, duration: 1, ease: 'power1.in' });
  });

  // 2. Content rechts: Jedes Segment (100vh) fadet einzeln ein und aus:
  // - Am unteren Bildrand Opacity = 0%
  // - Wenn die Mitte des Segments im Bereich 40%-60% ist: Opacity = 100% (Plateau)
  // - Am oberen Bildrand wieder zurück auf Opacity = 0%
  const memberSegments = gsap.utils.toArray('.member-segment');
  memberSegments.forEach((segment: any) => {
    const inner = segment.querySelector('.member-segment-inner') || segment;

    const segmentTl = gsap.timeline({
      scrollTrigger: {
        trigger: segment,
        start: 'center bottom',
        end: 'center top',
        scrub: true,
      },
    });

    segmentTl
      .fromTo(
        inner,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 4, ease: 'power1.out' }
      )
      .to(inner, { opacity: 1, y: 0, duration: 2, ease: 'none' }) // Plateau 40%-60%
      .to(inner, { opacity: 0, y: -30, duration: 4, ease: 'power1.in' });
  });
}

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

  // C. Value Statement (#angebot)
  const valueStatement = document.querySelector('.value-statement');
  if (valueStatement) {
    const valueTl = gsap.timeline({
      scrollTrigger: {
        trigger: valueStatement,
        start: 'center bottom',
        end: 'center top',
        scrub: true,
      },
    });

    valueTl
      .fromTo(
        valueStatement,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 4, ease: 'power1.out' }
      )
      .to(valueStatement, { opacity: 1, y: 0, duration: 2, ease: 'none' })
      .to(valueStatement, { opacity: 0, y: -30, duration: 4, ease: 'power1.in' });
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
