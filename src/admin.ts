import { User } from 'firebase/auth';
import { SiteConfig, TeamMember, DetailItem, ThemeSettings } from './types';
import {
  loginWithGoogle,
  logoutUser,
  subscribeAuthState,
  checkIsAdmin,
  loadSiteConfigFromFirestore,
  saveSiteConfigToFirebase,
} from './firebase';
import { applyTheme, renderSegments, renderTeam } from './renderer';
import { DEFAULT_SITE_CONFIG } from './defaultData';
import { renderImageUploadComponent, bindImageUploadComponent } from './imageUpload';

export class AdminController {
  private config: SiteConfig;
  private currentUser: User | null = null;
  private isAdmin = false;
  private isCheckingAuth = false;
  private isDrawerOpen = false;
  private activeTab: 'theme' | 'typography' | 'segments' | 'team' = 'theme';
  private editingMemberIndex: number | null = null; // null = list, number = editing/new member
  private isSaving = false;

  constructor(initialConfig: SiteConfig) {
    this.config = JSON.parse(JSON.stringify(initialConfig));
    this.init();
  }

  public updateConfig(newConfig: SiteConfig) {
    this.config = JSON.parse(JSON.stringify(newConfig));
    if (this.isDrawerOpen) {
      this.renderDrawerContent();
    }
  }

  private init() {
    this.createDomElements();
    this.bindGlobalEvents();

    // Zentraler Auth-Listener: Prüft bei jedem Auth-State-Wechsel den Admin-Status
    subscribeAuthState(async (user) => {
      if (user) {
        if (this.isCheckingAuth) return;
        this.isCheckingAuth = true;

        try {
          if (!user.email) {
            await this.handleUnauthorized(undefined, 'Keine E-Mail-Adresse im Google-Konto hinterlegt.');
            return;
          }

          // 1. Zentraler Admin-Check in Collection 'admins'
          // Prüfe, ob in der Collection 'admins' ein Dokument existiert, dessen Document-ID genau user.email entspricht
          const adminCheck = await checkIsAdmin(user.email);

          if (adminCheck.exists) {
            // doc.exists ist true: Schalte Admin-Panel frei & lade Daten aus Firestore
            this.currentUser = user;
            this.isAdmin = true;
            this.updateAuthUi();

            // 2. Lade Brand-Colors, Schriften und Content-Daten aus Firestore
            await this.loadConfigFromCloud();
          } else {
            // doc.exists ist false: Dokument existiert NICHT -> sofort sperren, ausblenden & ausloggen
            await this.handleUnauthorized(user.email, adminCheck.error);
          }
        } catch (err: any) {
          console.error('Fehler bei der Authentifizierungsprüfung:', err);
          await this.handleUnauthorized(user?.email || undefined, err?.message);
        } finally {
          this.isCheckingAuth = false;
        }
      } else {
        this.currentUser = null;
        this.isAdmin = false;
        this.closeDrawer();
        this.updateAuthUi();
      }
    });
  }

  private async handleUnauthorized(email?: string, reason?: string) {
    // 1. Blende das Admin-Panel sofort aus
    this.closeDrawer();
    const overlay = document.getElementById('admin-drawer-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('open');
    }
    this.currentUser = null;
    this.isAdmin = false;
    this.updateAuthUi();

    // 2. Zeige aussagekräftige Fehlermeldung:
    let message = 'Zugriff verweigert: Dein Konto ist nicht als Administrator freigeschaltet.';
    if (reason) {
      message = reason;
    } else if (email) {
      message = `Zugriff verweigert: Konto '${email}' ist in Firestore ('admins/${email}') nicht als Administrator freigeschaltet.`;
    }
    this.showToast(message, 'error');

    // 3. Logge den Nutzer sofort wieder über firebase.auth().signOut() aus
    try {
      await logoutUser();
    } catch (err) {
      console.error('Fehler beim Ausloggen über signOut():', err);
    }
  }

  private async loadConfigFromCloud() {
    try {
      const cloudConfig = await loadSiteConfigFromFirestore();
      if (cloudConfig) {
        this.config = JSON.parse(JSON.stringify(cloudConfig));
        applyTheme(this.config);
        renderSegments(this.config);
        renderTeam(this.config.team);
        if (this.isDrawerOpen) {
          this.renderDrawerContent();
        }
      }
    } catch (err) {
      console.warn('Konnte Konfiguration aus Firestore nicht laden:', err);
    }
  }

  private createDomElements() {
    // 1. Admin-Login-Symbol / Bar dezent im Footer platziert
    const bar = document.createElement('div');
    bar.id = 'admin-floating-bar';
    bar.className = 'admin-floating-bar admin-footer-bar';
    bar.innerHTML = `
      <div id="admin-auth-container" class="admin-auth-container">
        <button id="btn-admin-login" class="admin-action-btn admin-login-btn" title="Admin Login" aria-label="Admin Login">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span class="admin-login-label">Admin</span>
        </button>

        <div id="admin-user-profile" class="admin-user-profile" style="display: none;">
          <img id="admin-user-avatar" class="admin-avatar" src="" alt="Avatar">
          <span id="admin-user-name" class="admin-user-name"></span>
          <button id="btn-open-admin" class="admin-action-btn admin-open-btn" title="Admin Panel öffnen">
            ⚙️ Panel
          </button>
          <button id="btn-admin-logout" class="admin-action-btn admin-logout-btn" title="Abmelden">
            Abmelden
          </button>
        </div>
      </div>
    `;

    const footerSlot = document.getElementById('footer-admin-slot');
    if (footerSlot) {
      footerSlot.appendChild(bar);
    } else {
      document.body.appendChild(bar);
    }

    // 2. Admin Drawer Modal (standardmässig display: none)
    const drawerOverlay = document.createElement('div');
    drawerOverlay.id = 'admin-drawer-overlay';
    drawerOverlay.className = 'admin-drawer-overlay';
    drawerOverlay.style.display = 'none';
    drawerOverlay.innerHTML = `
      <div class="admin-drawer" id="admin-drawer">
        <div class="admin-drawer-header">
          <div class="admin-header-title">
            <span class="admin-logo-badge">GENAI</span>
            <h3>Studio Admin</h3>
          </div>
          <div class="admin-header-actions">
            <button id="btn-save-firebase" class="admin-btn-primary">
              <span id="save-spinner" class="spinner" style="display: none;"></span>
              💾 Speichern
            </button>
            <button id="btn-close-drawer" class="admin-btn-icon" aria-label="Schliessen">✕</button>
          </div>
        </div>

        <nav class="admin-tabs" aria-label="Admin Tabs">
          <button class="admin-tab-btn active" data-tab="theme">🎨 Farben</button>
          <button class="admin-tab-btn" data-tab="typography">🔤 Typografie & Grössen</button>
          <button class="admin-tab-btn" data-tab="segments">📝 Segmente Content</button>
          <button class="admin-tab-btn" data-tab="team">👥 Team verwalten</button>
        </nav>

        <div class="admin-drawer-body" id="admin-drawer-body">
          <!-- Dynamic tab content -->
        </div>

        <div class="admin-drawer-footer">
          <button id="btn-reset-defaults" class="admin-btn-secondary">Auf Standard zurücksetzen</button>
          <span id="admin-status-message" class="admin-status-message"></span>
        </div>
      </div>
    `;
    document.body.appendChild(drawerOverlay);
  }

  private bindGlobalEvents() {
    // Login with Google
    document.getElementById('btn-admin-login')?.addEventListener('click', async () => {
      this.isCheckingAuth = true;
      try {
        const user = await loginWithGoogle();
        if (!user || !user.email) {
          await this.handleUnauthorized(undefined, 'Keine E-Mail-Adresse im Google-Konto hinterlegt.');
          return;
        }

        // 1. Zentraler Admin-Check nach dem Google-Login:
        const adminCheck = await checkIsAdmin(user.email);

        if (adminCheck.exists) {
          this.currentUser = user;
          this.isAdmin = true;
          this.updateAuthUi();

          this.openDrawer();
          await this.loadConfigFromCloud();

          this.showToast(`Erfolgreich autorisiert als ${user.email}!`, 'success');
        } else {
          await this.handleUnauthorized(user.email, adminCheck.error);
        }
      } catch (err: any) {
        if (err?.code === 'auth/popup-closed-by-user') {
          return;
        }
        console.error('Google Sign-In Error:', err);
        if (err?.code === 'auth/unauthorized-domain') {
          this.showToast(
            `Domain nicht freigeschaltet: Bitte füge "${window.location.hostname}" in der Firebase Console unter "Authentication > Settings > Authorized Domains" hinzu.`,
            'error'
          );
        } else if (err?.code === 'auth/popup-blocked') {
          this.showToast('Das Anmeldefenster wurde vom Browser blockiert. Bitte Popups erlauben.', 'error');
        } else {
          this.showToast(`Fehler beim Google-Login: ${err?.message || err?.code || 'Unbekannter Fehler'}`, 'error');
        }
      } finally {
        this.isCheckingAuth = false;
      }
    });

    // Logout
    document.getElementById('btn-admin-logout')?.addEventListener('click', async () => {
      try {
        await logoutUser();
        this.currentUser = null;
        this.isAdmin = false;
        this.closeDrawer();
        this.updateAuthUi();
        this.showToast('Abgemeldet', 'info');
      } catch (err: any) {
        console.error('Logout error:', err);
      }
    });

    // Open/Close Drawer
    document.getElementById('btn-open-admin')?.addEventListener('click', () => {
      this.openDrawer();
    });

    document.getElementById('btn-close-drawer')?.addEventListener('click', () => {
      this.closeDrawer();
    });

    // Overlay backdrop click to close
    document.getElementById('admin-drawer-overlay')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('admin-drawer-overlay')) {
        this.closeDrawer();
      }
    });

    // Tab buttons
    const tabs = document.querySelectorAll('.admin-tab-btn');
    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const tabKey = target.getAttribute('data-tab') as 'theme' | 'typography' | 'segments' | 'team';
        tabs.forEach((t) => t.classList.remove('active'));
        target.classList.add('active');
        this.activeTab = tabKey;
        this.editingMemberIndex = null;
        this.renderDrawerContent();
      });
    });

    // Save in Firebase
    document.getElementById('btn-save-firebase')?.addEventListener('click', () => {
      this.saveToFirebase();
    });

    // Reset Defaults
    document.getElementById('btn-reset-defaults')?.addEventListener('click', () => {
      if (confirm('Möchtest du wirklich alle Einstellungen auf die Standardwerte zurücksetzen?')) {
        this.config = JSON.parse(JSON.stringify(DEFAULT_SITE_CONFIG));
        applyTheme(this.config);
        renderSegments(this.config);
        renderTeam(this.config.team);
        this.renderDrawerContent();
        this.showToast('Auf Standardwerte zurückgesetzt', 'info');
      }
    });
  }

  private updateAuthUi() {
    const loginBtn = document.getElementById('btn-admin-login');
    const userProfile = document.getElementById('admin-user-profile');
    const avatar = document.getElementById('admin-user-avatar') as HTMLImageElement;
    const name = document.getElementById('admin-user-name');
    const drawerOverlay = document.getElementById('admin-drawer-overlay');

    if (this.currentUser && this.isAdmin) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (userProfile) userProfile.style.display = 'inline-flex';
      if (avatar) avatar.src = this.currentUser.photoURL || '/images/favicon.png';
      if (name) name.textContent = this.currentUser.displayName || this.currentUser.email || 'Admin';
      if (drawerOverlay && this.isDrawerOpen) {
        drawerOverlay.style.display = 'flex';
        drawerOverlay.classList.add('open');
      }
    } else {
      if (loginBtn) loginBtn.style.display = 'inline-flex';
      if (userProfile) userProfile.style.display = 'none';
      if (drawerOverlay) {
        drawerOverlay.classList.remove('open');
        drawerOverlay.style.display = 'none';
      }
    }
  }

  public openDrawer() {
    if (!this.isAdmin || !this.currentUser) {
      this.showToast('Zugriff verweigert: Dein Konto ist nicht als Administrator freigeschaltet.', 'error');
      this.closeDrawer();
      return;
    }

    this.isDrawerOpen = true;
    const overlay = document.getElementById('admin-drawer-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.classList.add('open');
    }
    this.renderDrawerContent();
  }

  public closeDrawer() {
    this.isDrawerOpen = false;
    const overlay = document.getElementById('admin-drawer-overlay');
    if (overlay) {
      overlay.classList.remove('open');
      if (!this.isAdmin) {
        overlay.style.display = 'none';
      }
    }
  }

  private renderDrawerContent() {
    const container = document.getElementById('admin-drawer-body');
    if (!container) return;

    if (this.activeTab === 'theme') {
      container.innerHTML = this.renderThemeTab();
      this.bindThemeEvents();
    } else if (this.activeTab === 'typography') {
      container.innerHTML = this.renderTypographyTab();
      this.bindTypographyEvents();
    } else if (this.activeTab === 'segments') {
      container.innerHTML = this.renderSegmentsTab();
      this.bindSegmentsEvents();
    } else if (this.activeTab === 'team') {
      if (this.editingMemberIndex !== null) {
        container.innerHTML = this.renderTeamMemberEditor(this.editingMemberIndex);
        this.bindTeamMemberEditorEvents(this.editingMemberIndex);
      } else {
        container.innerHTML = this.renderTeamListTab();
        this.bindTeamListEvents();
      }
    }
  }

  // ================= TABS =================

  // 1. BRAND-FARBEN
  private renderThemeTab(): string {
    const { primaryColor, secondaryColor, neutralWhite, steelSilver } = this.config.theme;

    return `
      <div class="admin-section">
        <h4 class="admin-section-title">Brand-Farben</h4>
        <p class="admin-help-text">Passe die Leitfarben des Webauftritts an. Die Vorschau aktualisiert sich live im Hintergrund.</p>

        <div class="admin-form-grid">
          <div class="form-group">
            <label>Primary Color (Radioactive Lime)</label>
            <div class="color-picker-row">
              <input type="color" id="theme-primary-color" value="${primaryColor}" class="color-swatch-input">
              <input type="text" id="theme-primary-text" value="${primaryColor}" class="form-input">
            </div>
          </div>

          <div class="form-group">
            <label>Secondary / Dark Color (Deep Obsidian)</label>
            <div class="color-picker-row">
              <input type="color" id="theme-secondary-color" value="${secondaryColor}" class="color-swatch-input">
              <input type="text" id="theme-secondary-text" value="${secondaryColor}" class="form-input">
            </div>
          </div>

          <div class="form-group">
            <label>Neutral White</label>
            <div class="color-picker-row">
              <input type="color" id="theme-white-color" value="${neutralWhite}" class="color-swatch-input">
              <input type="text" id="theme-white-text" value="${neutralWhite}" class="form-input">
            </div>
          </div>

          <div class="form-group">
            <label>Steel Silver</label>
            <div class="color-picker-row">
              <input type="color" id="theme-silver-color" value="${steelSilver}" class="color-swatch-input">
              <input type="text" id="theme-silver-text" value="${steelSilver}" class="form-input">
            </div>
          </div>
        </div>
      </div>

      <div class="admin-section" style="background: rgba(204, 255, 0, 0.05); border-color: rgba(204, 255, 0, 0.2);">
        <h4 class="admin-section-title">Typografie & Schriftgrössen</h4>
        <p class="admin-help-text">
          Die Überschriften nutzen fest die Schriftart <strong>FSLucas</strong> (lokale Datei 'public/fonts/FSLucas-Bold.woff2') und Texte nutzen <strong>Open Sans</strong>.
          Schriftgrössen für alle Überschriften- und Text-Klassen findest du im Reiter <strong>"🔤 Typografie & Grössen"</strong>.
        </p>
      </div>
    `;
  }

  private bindThemeEvents() {
    const bindColor = (pickerId: string, textId: string, key: keyof typeof this.config.theme) => {
      const picker = document.getElementById(pickerId) as HTMLInputElement;
      const text = document.getElementById(textId) as HTMLInputElement;

      const update = (val: string) => {
        (this.config.theme[key] as any) = val;
        picker.value = val;
        text.value = val;
        applyTheme(this.config);
      };

      picker?.addEventListener('input', (e) => update((e.target as HTMLInputElement).value));
      text?.addEventListener('change', (e) => update((e.target as HTMLInputElement).value));
    };

    bindColor('theme-primary-color', 'theme-primary-text', 'primaryColor');
    bindColor('theme-secondary-color', 'theme-secondary-text', 'secondaryColor');
    bindColor('theme-white-color', 'theme-white-text', 'neutralWhite');
    bindColor('theme-silver-color', 'theme-silver-text', 'steelSilver');
  }

  // 2. TYPOGRAFIE & SCHRIFTGRÖSSEN
  private renderTypographyTab(): string {
    const { baseFontSize, h1Size, h2Size, h3Size, subheadingSize, bodySize } = this.config.theme;

    const baseVal = baseFontSize || 16;
    const h1Val = h1Size || 56;
    const h2Val = h2Size || 40;
    const h3Val = h3Size || 44;
    const subVal = subheadingSize || 24;
    const bodyVal = bodySize || 17;

    return `
      <div class="typo-info-banner">
        <h4 class="admin-section-title" style="margin-bottom: 4px;">Schriftarten-Zuordnung</h4>
        <p class="admin-help-text" style="margin-bottom: 12px;">
          Alle Überschriften nutzen fest die lokale Schriftart <strong>FSLucas</strong> (@font-face Bold 700). Normale Texte nutzen fest <strong>Open Sans</strong>. Die Schriften sind fix gebunden und werden nicht mehr dynamisch überschrieben.
        </p>
        <div class="typo-font-badge-row">
          <div class="typo-font-badge">
            <span class="typo-font-label">Überschriften (h1–h6, .main-title, .member-name etc.)</span>
            <span class="typo-font-name">FSLucas (Lokal: Bold 700)</span>
          </div>
          <div class="typo-font-badge">
            <span class="typo-font-label">Fliesstext & Details (body, p, li, Badges)</span>
            <span class="typo-font-name body-font">Open Sans (SemiBold & Regular)</span>
          </div>
        </div>
      </div>

      <div class="admin-section">
        <h4 class="admin-section-title">Typografie & Schriftgrössen</h4>
        <p class="admin-help-text">
          Passe die Schriftgrössen für alle Heading- und Text-Klassen stufenlos an. Die Werte werden in Pixeln angegeben, wirken sofort per Live-Preview und werden in Firestore gespeichert.
        </p>

        <!-- H1 Size -->
        <div class="typo-control-card">
          <div class="typo-card-header">
            <span class="typo-card-title">H1 Size – Haupttitel & Intro</span>
            <span class="typo-card-tags">.main-title, h1</span>
          </div>
          <div class="typo-card-desc">Grosse Sticky-Überschrift im Intro ("Die Kreativmaschine. Ohne den ganzen Bullshit.")</div>
          <div class="typo-input-group">
            <input type="range" id="size-h1-range" min="32" max="84" step="1" value="${h1Val}" class="form-range">
            <div class="typo-number-box">
              <input type="number" id="size-h1-num" min="32" max="84" value="${h1Val}">
              <span>px</span>
            </div>
          </div>
          <div class="range-labels">
            <span>32px</span>
            <span>Standard: 56px</span>
            <span>84px</span>
          </div>
        </div>

        <!-- H2 Size -->
        <div class="typo-control-card">
          <div class="typo-card-header">
            <span class="typo-card-title">H2 Size – Sektionstitel & Story-Blöcke</span>
            <span class="typo-card-tags">.message-block h2, .value-statement, h2</span>
          </div>
          <div class="typo-card-desc">Scrolltelling Story-Blöcke ("Weltklasse Design...") sowie das Angebot-Statement ("Grenzenloses Design...")</div>
          <div class="typo-input-group">
            <input type="range" id="size-h2-range" min="24" max="64" step="1" value="${h2Val}" class="form-range">
            <div class="typo-number-box">
              <input type="number" id="size-h2-num" min="24" max="64" value="${h2Val}">
              <span>px</span>
            </div>
          </div>
          <div class="range-labels">
            <span>24px</span>
            <span>Standard: 40px</span>
            <span>64px</span>
          </div>
        </div>

        <!-- H3 Size -->
        <div class="typo-control-card">
          <div class="typo-card-header">
            <span class="typo-card-title">H3 Size – Team-Namen</span>
            <span class="typo-card-tags">.member-name, h3</span>
          </div>
          <div class="typo-card-desc">Grosser Namensschriftzug der Teammitglieder ("Björn Ischi", "Florian Baumgartner")</div>
          <div class="typo-input-group">
            <input type="range" id="size-h3-range" min="24" max="60" step="1" value="${h3Val}" class="form-range">
            <div class="typo-number-box">
              <input type="number" id="size-h3-num" min="24" max="60" value="${h3Val}">
              <span>px</span>
            </div>
          </div>
          <div class="range-labels">
            <span>24px</span>
            <span>Standard: 44px</span>
            <span>60px</span>
          </div>
        </div>

        <!-- Subheading Size -->
        <div class="typo-control-card">
          <div class="typo-card-header">
            <span class="typo-card-title">Subheading & Rollen Size</span>
            <span class="typo-card-tags">.member-role, .member-subtitle, .contact-lead, h4</span>
          </div>
          <div class="typo-card-desc">Rollenbeschreibung, "Mein Background"-Untertitel und Einleitungstext im Kontaktbereich</div>
          <div class="typo-input-group">
            <input type="range" id="size-subheading-range" min="16" max="36" step="1" value="${subVal}" class="form-range">
            <div class="typo-number-box">
              <input type="number" id="size-subheading-num" min="16" max="36" value="${subVal}">
              <span>px</span>
            </div>
          </div>
          <div class="range-labels">
            <span>16px</span>
            <span>Standard: 24px</span>
            <span>36px</span>
          </div>
        </div>

        <!-- Body Text Size -->
        <div class="typo-control-card">
          <div class="typo-card-header">
            <span class="typo-card-title">Body Text Size – Fliesstexte & Listen</span>
            <span class="typo-card-tags">p, .member-bio, .badge-list, .detail-list</span>
          </div>
          <div class="typo-card-desc">Biografietexte, gelbe Highlight-Badgeliste sowie Hintergrund-Detailaufzählungen</div>
          <div class="typo-input-group">
            <input type="range" id="size-body-range" min="14" max="24" step="1" value="${bodyVal}" class="form-range">
            <div class="typo-number-box">
              <input type="number" id="size-body-num" min="14" max="24" value="${bodyVal}">
              <span>px</span>
            </div>
          </div>
          <div class="range-labels">
            <span>14px</span>
            <span>Standard: 17px</span>
            <span>24px</span>
          </div>
        </div>

        <!-- Base Font Size -->
        <div class="typo-control-card">
          <div class="typo-card-header">
            <span class="typo-card-title">Basis-Schriftgrösse (HTML Root)</span>
            <span class="typo-card-tags">html { font-size }</span>
          </div>
          <div class="typo-card-desc">Globale Basis-Skalierung für relative REM-Berechnungen</div>
          <div class="typo-input-group">
            <input type="range" id="size-base-range" min="13" max="22" step="1" value="${baseVal}" class="form-range">
            <div class="typo-number-box">
              <input type="number" id="size-base-num" min="13" max="22" value="${baseVal}">
              <span>px</span>
            </div>
          </div>
          <div class="range-labels">
            <span>13px</span>
            <span>Standard: 16px</span>
            <span>22px</span>
          </div>
        </div>
      </div>
    `;
  }

  private bindTypographyEvents() {
    const bindSize = (rangeId: string, numId: string, key: keyof ThemeSettings, min: number, max: number) => {
      const range = document.getElementById(rangeId) as HTMLInputElement;
      const num = document.getElementById(numId) as HTMLInputElement;

      const update = (raw: string | number) => {
        let val = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
        if (isNaN(val)) return;
        val = Math.max(min, Math.min(max, val));

        (this.config.theme[key] as any) = val;
        if (range && range.value !== String(val)) range.value = String(val);
        if (num && num.value !== String(val)) num.value = String(val);

        applyTheme(this.config);
      };

      range?.addEventListener('input', (e) => update((e.target as HTMLInputElement).value));
      num?.addEventListener('input', (e) => update((e.target as HTMLInputElement).value));
      num?.addEventListener('change', (e) => update((e.target as HTMLInputElement).value));
    };

    bindSize('size-h1-range', 'size-h1-num', 'h1Size', 32, 84);
    bindSize('size-h2-range', 'size-h2-num', 'h2Size', 24, 64);
    bindSize('size-h3-range', 'size-h3-num', 'h3Size', 24, 60);
    bindSize('size-subheading-range', 'size-subheading-num', 'subheadingSize', 16, 36);
    bindSize('size-body-range', 'size-body-num', 'bodySize', 14, 24);
    bindSize('size-base-range', 'size-base-num', 'baseFontSize', 13, 22);
  }

  // 2. SEGMENTE CONTENT
  private renderSegmentsTab(): string {
    const seg = this.config.segments;

    return `
      <div class="admin-section">
        <h4 class="admin-section-title">Hero-Sektion</h4>
        <div class="form-group">
          <label for="seg-hero-logo">Logo Text / Brand Name</label>
          <input type="text" id="seg-hero-logo" class="form-input" value="${this.escape(seg.hero.logoText)}">
        </div>
      </div>

      <div class="admin-section">
        <h4 class="admin-section-title">Intro / Kreativmaschine (100vh Sticky Scrolltelling)</h4>
        
        <div class="form-group">
          <label for="seg-intro-title">Linke Sticky Headline</label>
          <textarea id="seg-intro-title" rows="3" class="form-textarea">${this.escape(seg.intro.mainTitle)}</textarea>
        </div>

        <div class="form-group">
          <label for="seg-intro-block1">Rechter Block 1</label>
          <textarea id="seg-intro-block1" rows="2" class="form-textarea">${this.escape(seg.intro.block1)}</textarea>
        </div>

        <div class="form-group">
          <label for="seg-intro-block2">Rechter Block 2</label>
          <textarea id="seg-intro-block2" rows="2" class="form-textarea">${this.escape(seg.intro.block2)}</textarea>
        </div>

        <div class="form-group">
          <label for="seg-intro-block3">Rechter Block 3 (über Lottie-Animation)</label>
          <textarea id="seg-intro-block3" rows="3" class="form-textarea">${this.escape(seg.intro.block3)}</textarea>
        </div>
      </div>

      <div class="admin-section">
        <h4 class="admin-section-title">Angebot Sektion</h4>
        <div class="form-group">
          <label for="seg-angebot-main">Hauptaussage Anfang</label>
          <input type="text" id="seg-angebot-main" class="form-input" value="${this.escape(seg.angebot.mainText)}">
        </div>
        <div class="form-group">
          <label for="seg-angebot-highlight">Hervorgehobener Text (Highlight)</label>
          <input type="text" id="seg-angebot-highlight" class="form-input" value="${this.escape(seg.angebot.highlightText)}">
        </div>
        <div class="form-group">
          <label for="seg-angebot-end">Hauptaussage Abschluss</label>
          <input type="text" id="seg-angebot-end" class="form-input" value="${this.escape(seg.angebot.endText)}">
        </div>
      </div>

      <div class="admin-section">
        <h4 class="admin-section-title">Kontakt Sektion</h4>
        <div class="form-group">
          <label for="seg-kontakt-lead">Einleitungstext</label>
          <textarea id="seg-kontakt-lead" rows="3" class="form-textarea">${this.escape(seg.kontakt.leadText)}</textarea>
        </div>
        <div class="form-group">
          <label for="seg-kontakt-phone">Telefonnummer Anzeige</label>
          <input type="text" id="seg-kontakt-phone" class="form-input" value="${this.escape(seg.kontakt.phoneNumber)}">
        </div>
        <div class="form-group">
          <label for="seg-kontakt-href">Telefon Link (z. B. +41792830659)</label>
          <input type="text" id="seg-kontakt-href" class="form-input" value="${this.escape(seg.kontakt.phoneHref)}">
        </div>
      </div>
    `;
  }

  private bindSegmentsEvents() {
    const bindInput = (id: string, updateFn: (val: string) => void) => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
      el?.addEventListener('input', (e) => {
        updateFn((e.target as HTMLInputElement).value);
        renderSegments(this.config);
      });
    };

    bindInput('seg-hero-logo', (v) => (this.config.segments.hero.logoText = v));
    bindInput('seg-intro-title', (v) => (this.config.segments.intro.mainTitle = v));
    bindInput('seg-intro-block1', (v) => (this.config.segments.intro.block1 = v));
    bindInput('seg-intro-block2', (v) => (this.config.segments.intro.block2 = v));
    bindInput('seg-intro-block3', (v) => (this.config.segments.intro.block3 = v));

    bindInput('seg-angebot-main', (v) => (this.config.segments.angebot.mainText = v));
    bindInput('seg-angebot-highlight', (v) => (this.config.segments.angebot.highlightText = v));
    bindInput('seg-angebot-end', (v) => (this.config.segments.angebot.endText = v));

    bindInput('seg-kontakt-lead', (v) => (this.config.segments.kontakt.leadText = v));
    bindInput('seg-kontakt-phone', (v) => (this.config.segments.kontakt.phoneNumber = v));
    bindInput('seg-kontakt-href', (v) => (this.config.segments.kontakt.phoneHref = v));
  }

  // 3. TEAM VERWALTUNG
  private renderTeamListTab(): string {
    return `
      <div class="admin-section">
        <div class="team-header-row">
          <div>
            <h4 class="admin-section-title" style="margin: 0;">Team-Mitglieder</h4>
            <p class="admin-help-text" style="margin: 4px 0 0 0;">Mitglieder erfassen, anordnen, bearbeiten oder löschen.</p>
          </div>
          <button id="btn-team-add" class="admin-btn-primary" style="white-space: nowrap;">
            + Neu
          </button>
        </div>

        <div class="team-cards-list">
          ${this.config.team
            .map(
              (m, index) => `
            <div class="team-card-item" data-index="${index}">
              <img src="${m.imageUrl || '/images/Björn-2026.jpeg'}" class="team-card-thumb" alt="${this.escape(m.name)}">
              <div class="team-card-info">
                <strong>${this.escape(m.name)}</strong>
                <span>${this.escape(m.role)}</span>
                <small>${m.badges.length} Highlights • ${m.details.length} Background-Punkte</small>
              </div>
              <div class="team-card-actions">
                <button class="btn-edit-member admin-btn-sm" data-index="${index}">Bearbeiten</button>
                <button class="btn-delete-member admin-btn-sm btn-danger" data-index="${index}">Löschen</button>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  private bindTeamListEvents() {
    // Add New
    document.getElementById('btn-team-add')?.addEventListener('click', () => {
      const newMember: TeamMember = {
        id: `member-${Date.now()}`,
        name: 'Neues Mitglied',
        role: 'Rolle / Position',
        imageUrl: '/images/Björn-2026.jpeg',
        badges: ['Erfahrung & Expertise', 'Erfolgreiche Projekte'],
        bio: 'Kurze Biografie und persönliche Arbeitsphilosophie...',
        subtitle: 'Mein Background: Vom Spezialisten zum Leader.',
        details: [
          { id: `d-${Date.now()}-1`, label: 'Schwerpunkt', text: 'Konzeption & digitale Führung' }
        ],
        linkedinUrl: 'https://www.linkedin.com/',
      };
      this.config.team.push(newMember);
      this.editingMemberIndex = this.config.team.length - 1;
      renderTeam(this.config.team);
      this.renderDrawerContent();
    });

    // Edit
    document.querySelectorAll('.btn-edit-member').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-index') || '0', 10);
        this.editingMemberIndex = idx;
        this.renderDrawerContent();
      });
    });

    // Delete
    document.querySelectorAll('.btn-delete-member').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-index') || '0', 10);
        const member = this.config.team[idx];
        if (confirm(`Team-Mitglied "${member.name}" wirklich löschen?`)) {
          this.config.team.splice(idx, 1);
          renderTeam(this.config.team);
          this.renderDrawerContent();
          this.showToast('Mitglied gelöscht', 'info');
        }
      });
    });
  }

  // 4. TEAM MEMBER SUB-EDITOR
  private renderTeamMemberEditor(index: number): string {
    const member = this.config.team[index];
    if (!member) return '<div>Mitglied nicht gefunden</div>';

    return `
      <div class="admin-section">
        <div class="team-editor-header">
          <button id="btn-back-to-team" class="admin-btn-secondary">← Zurück zur Übersicht</button>
          <span class="badge-editing">Bearbeite: ${this.escape(member.name)}</span>
        </div>

        <div class="form-group">
          <label for="member-name">Name</label>
          <input type="text" id="member-name" class="form-input" value="${this.escape(member.name)}">
        </div>

        <div class="form-group">
          <label for="member-role">Rolle / Titel</label>
          <input type="text" id="member-role" class="form-input" value="${this.escape(member.role)}">
        </div>

        <div class="form-group">
          ${renderImageUploadComponent({
            idPrefix: `member-upload-${index}`,
            currentUrl: member.imageUrl,
            folder: 'images',
            targetInputId: 'member-image',
            label: 'Team-Porträt (Firebase Storage Upload)',
          })}

          <label for="member-image" style="margin-top: 10px; font-size: 0.8rem; color: var(--steel-silver);">Bild-URL (wird nach Upload automatisch ausgefüllt)</label>
          <input type="text" id="member-image" class="form-input" value="${this.escape(member.imageUrl)}">
          <div class="image-preset-row">
            <span class="preset-label">Lokale Vorlagen:</span>
            <button type="button" class="btn-preset-img" data-url="/images/Bjoern.webp">Björn (WebP)</button>
            <button type="button" class="btn-preset-img" data-url="/images/Florian.webp">Florian (WebP)</button>
            <button type="button" class="btn-preset-img" data-url="/images/Bjoern.jpeg">Björn (JPEG)</button>
            <button type="button" class="btn-preset-img" data-url="/images/Florian.jpg">Florian (JPG)</button>
          </div>
        </div>

        <div class="form-group">
          <div class="group-header-with-btn">
            <label>Highlights / Badge-Liste</label>
            <button type="button" id="btn-add-badge" class="admin-btn-sm">+ Highlight hinzufügen</button>
          </div>
          <div id="badges-container" class="item-list-container">
            ${member.badges
              .map(
                (b, bIdx) => `
              <div class="item-row" data-badge-index="${bIdx}">
                <input type="text" class="form-input badge-input" value="${this.escape(b)}">
                <button type="button" class="btn-remove-item btn-remove-badge" data-badge-index="${bIdx}">✕</button>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <div class="form-group">
          <label for="member-bio">Biografie / Pitch</label>
          <textarea id="member-bio" rows="4" class="form-textarea">${this.escape(member.bio)}</textarea>
        </div>

        <div class="form-group">
          <label for="member-subtitle">Background Untertitel</label>
          <input type="text" id="member-subtitle" class="form-input" value="${this.escape(member.subtitle)}">
        </div>

        <div class="form-group">
          <div class="group-header-with-btn">
            <label>Background Detail-Punkte</label>
            <button type="button" id="btn-add-detail" class="admin-btn-sm">+ Detailpunkt hinzufügen</button>
          </div>
          <div id="details-container" class="item-list-container">
            ${member.details
              .map(
                (d, dIdx) => `
              <div class="detail-row" data-detail-index="${dIdx}">
                <input type="text" class="form-input detail-label-input" placeholder="Titel (z. B. Fundament & Bau)" value="${this.escape(d.label)}">
                <textarea class="form-textarea detail-text-input" rows="2" placeholder="Beschreibung...">${this.escape(d.text)}</textarea>
                <button type="button" class="btn-remove-item btn-remove-detail" data-detail-index="${dIdx}">✕ Entfernen</button>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <div class="form-group">
          <label for="member-linkedin">LinkedIn Profil URL</label>
          <input type="url" id="member-linkedin" class="form-input" value="${this.escape(member.linkedinUrl)}">
        </div>

        <div class="editor-bottom-actions">
          <button id="btn-done-member" class="admin-btn-primary">Fertig & Übernehmen</button>
        </div>
      </div>
    `;
  }

  private bindTeamMemberEditorEvents(index: number) {
    const member = this.config.team[index];
    if (!member) return;

    // Back to list
    document.getElementById('btn-back-to-team')?.addEventListener('click', () => {
      this.editingMemberIndex = null;
      this.renderDrawerContent();
    });

    document.getElementById('btn-done-member')?.addEventListener('click', () => {
      this.editingMemberIndex = null;
      this.renderDrawerContent();
    });

    // Inputs update member object and live render
    const bindSimple = (id: string, prop: keyof TeamMember) => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
      el?.addEventListener('input', (e) => {
        (member as any)[prop] = (e.target as HTMLInputElement).value;
        renderTeam(this.config.team);
      });
    };

    bindSimple('member-name', 'name');
    bindSimple('member-role', 'role');
    bindSimple('member-bio', 'bio');
    bindSimple('member-subtitle', 'subtitle');
    bindSimple('member-linkedin', 'linkedinUrl');

    // Manual input for image URL
    const memberImgInput = document.getElementById('member-image') as HTMLInputElement | null;
    memberImgInput?.addEventListener('input', (e) => {
      const url = (e.target as HTMLInputElement).value;
      member.imageUrl = url;
      renderTeam(this.config.team);
      const previewThumb = document.getElementById(`member-upload-${index}-preview-img`) as HTMLImageElement | null;
      if (previewThumb) {
        previewThumb.src = url || '/images/favicon.png';
      }
    });

    // Firebase Storage Upload Component binden
    bindImageUploadComponent({
      idPrefix: `member-upload-${index}`,
      folder: 'images',
      targetInputId: 'member-image',
      onSuccess: (downloadUrl: string) => {
        member.imageUrl = downloadUrl;
        renderTeam(this.config.team);
        this.showToast('✅ Bild in Firebase Storage hochgeladen & URL übernommen!', 'success');
      },
      onError: (err) => {
        this.showToast(`Upload-Fehler: ${err.message}`, 'error');
      },
    });

    // Preset Image buttons
    document.querySelectorAll('.btn-preset-img').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const url = (e.currentTarget as HTMLElement).getAttribute('data-url') || '';
        member.imageUrl = url;
        const input = document.getElementById('member-image') as HTMLInputElement;
        if (input) input.value = url;
        const previewThumb = document.getElementById(`member-upload-${index}-preview-img`) as HTMLImageElement | null;
        if (previewThumb) {
          previewThumb.src = url;
        }
        renderTeam(this.config.team);
      });
    });

    // Badges: add
    document.getElementById('btn-add-badge')?.addEventListener('click', () => {
      member.badges.push('Neues Highlight');
      renderTeam(this.config.team);
      this.renderDrawerContent();
    });

    // Badges: remove
    document.querySelectorAll('.btn-remove-badge').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const bIdx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-badge-index') || '0', 10);
        member.badges.splice(bIdx, 1);
        renderTeam(this.config.team);
        this.renderDrawerContent();
      });
    });

    // Badges: input change
    document.querySelectorAll('.badge-input').forEach((input, bIdx) => {
      input.addEventListener('input', (e) => {
        member.badges[bIdx] = (e.target as HTMLInputElement).value;
        renderTeam(this.config.team);
      });
    });

    // Details: add
    document.getElementById('btn-add-detail')?.addEventListener('click', () => {
      member.details.push({
        id: `d-${Date.now()}`,
        label: 'Neuer Bereich',
        text: 'Beschreibung der Erfahrung und Kompetenzen...',
      });
      renderTeam(this.config.team);
      this.renderDrawerContent();
    });

    // Details: remove
    document.querySelectorAll('.btn-remove-detail').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const dIdx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-detail-index') || '0', 10);
        member.details.splice(dIdx, 1);
        renderTeam(this.config.team);
        this.renderDrawerContent();
      });
    });

    // Details: inputs
    document.querySelectorAll('.detail-row').forEach((row, dIdx) => {
      const labelInput = row.querySelector('.detail-label-input') as HTMLInputElement;
      const textInput = row.querySelector('.detail-text-input') as HTMLTextAreaElement;

      labelInput?.addEventListener('input', (e) => {
        if (member.details[dIdx]) {
          member.details[dIdx].label = (e.target as HTMLInputElement).value;
          renderTeam(this.config.team);
        }
      });

      textInput?.addEventListener('input', (e) => {
        if (member.details[dIdx]) {
          member.details[dIdx].text = (e.target as HTMLTextAreaElement).value;
          renderTeam(this.config.team);
        }
      });
    });
  }

  // ================= 3. SPEICHERN-FUNKTION =================
  private async saveToFirebase() {
    if (this.isSaving) return;

    if (!this.isAdmin || !this.currentUser || !this.currentUser.email) {
      this.showToast('Zugriff verweigert: Dein Konto ist nicht als Administrator freigeschaltet.', 'error');
      this.closeDrawer();
      return;
    }

    this.isSaving = true;

    const spinner = document.getElementById('save-spinner');
    const saveBtn = document.getElementById('btn-save-firebase');
    const statusMsg = document.getElementById('admin-status-message');

    if (spinner) spinner.style.display = 'inline-block';
    if (saveBtn) saveBtn.setAttribute('disabled', 'true');
    if (statusMsg) {
      statusMsg.textContent = 'Speichere in Firestore...';
      statusMsg.style.color = 'var(--steel-silver)';
    }

    try {
      // Re-Check Admin-Whitelist in Firestore
      const adminCheck = await checkIsAdmin(this.currentUser.email);
      if (!adminCheck.exists) {
        await this.handleUnauthorized(this.currentUser.email, adminCheck.error);
        return;
      }

      // Schreibe geänderte Daten (Colors, Fonts, Content, Team) zurück in Firestore
      await saveSiteConfigToFirebase(this.config, this.currentUser);
      this.showToast('Änderungen erfolgreich in Firestore gespeichert!', 'success');
      if (statusMsg) {
        const timeStr = new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
        statusMsg.textContent = `Erfolgreich in Firestore gespeichert (${timeStr})`;
        statusMsg.style.color = 'var(--radioactive-lime)';
      }
    } catch (err: any) {
      console.error('Firebase save error:', err);
      let userMsg = 'Fehler beim Speichern in Firestore.';
      if (err?.code === 'permission-denied') {
        userMsg = 'Zugriff verweigert: Keine Schreibberechtigung in Firestore. Bitte Firebase-Sicherheitsregeln prüfen.';
      } else if (err?.message) {
        userMsg = `Fehler beim Speichern: ${err.message}`;
      }
      this.showToast(userMsg, 'error');
      if (statusMsg) {
        statusMsg.textContent = userMsg;
        statusMsg.style.color = '#ff7875';
      }
    } finally {
      this.isSaving = false;
      if (spinner) spinner.style.display = 'none';
      if (saveBtn) saveBtn.removeAttribute('disabled');
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const toast = document.createElement('div');
    toast.className = `admin-toast admin-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  private escape(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
