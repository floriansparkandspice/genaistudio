import { auth, storage, ref, uploadBytes, getDownloadURL } from './firebase';

export interface ImageUploadOptions {
  idPrefix: string;
  currentUrl?: string;
  folder?: string;
  targetInputId?: string;
  label?: string;
  onSuccess?: (downloadUrl: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Erstellt die HTML-Struktur für die Firebase Storage Upload-Komponente.
 */
export function renderImageUploadComponent(options: ImageUploadOptions): string {
  const { idPrefix, currentUrl = '', label = 'Bilddatei hochladen' } = options;
  const hasImage = !!currentUrl;

  return `
    <div class="image-upload-wrapper" id="${idPrefix}-wrapper">
      <div class="image-upload-header">
        <label class="image-upload-label">${label}</label>
        <span class="image-upload-dest-badge">📁 Firebase Storage: /images/</span>
      </div>

      <div class="image-upload-container">
        <!-- Vorschau Thumbnail -->
        <div class="image-upload-preview-box">
          <img 
            id="${idPrefix}-preview-img" 
            src="${currentUrl || '/images/favicon.png'}" 
            alt="Bild-Vorschau" 
            class="image-upload-thumb ${hasImage ? 'has-img' : 'no-img'}"
            onerror="this.src='/images/favicon.png'"
          >
        </div>

        <!-- Drag & Drop / Klick-Zone -->
        <div class="image-upload-dropzone" id="${idPrefix}-dropzone" tabindex="0" role="button" aria-label="Datei zum Hochladen auswählen">
          <input 
            type="file" 
            id="${idPrefix}-file-input" 
            class="image-upload-input" 
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          >
          
          <div class="dropzone-content" id="${idPrefix}-dropzone-idle">
            <svg class="dropzone-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <div class="dropzone-texts">
              <span class="dropzone-primary-text"><strong>Hier klicken</strong> oder Bild hineinziehen</span>
              <span class="dropzone-sub-text">JPG, PNG, WebP (max. 15 MB)</span>
            </div>
            <button type="button" class="btn-browse-file" id="${idPrefix}-btn-browse">Datei auswählen</button>
          </div>

          <!-- Ladeanzeige während des Uploads -->
          <div class="dropzone-uploading" id="${idPrefix}-uploading" style="display: none;">
            <div class="upload-spinner-ring"></div>
            <span class="uploading-text" id="${idPrefix}-uploading-text">Wird in Firebase Storage hochgeladen...</span>
            <span class="uploading-subtext">ref() & uploadBytes() aktiv</span>
          </div>
        </div>
      </div>

      <!-- Feedback / Statusmeldungen -->
      <div class="image-upload-feedback" id="${idPrefix}-feedback" style="display: none;"></div>
    </div>
  `;
}

/**
 * Bindet alle Event-Listener an die gerenderte Upload-Komponente
 * und führt den Upload per ref() und uploadBytes() durch.
 */
export function bindImageUploadComponent(options: ImageUploadOptions): void {
  const {
    idPrefix,
    folder = 'images',
    targetInputId,
    onSuccess,
    onError,
  } = options;

  const dropzone = document.getElementById(`${idPrefix}-dropzone`);
  const fileInput = document.getElementById(`${idPrefix}-file-input`) as HTMLInputElement | null;
  const btnBrowse = document.getElementById(`${idPrefix}-btn-browse`);
  const idleContent = document.getElementById(`${idPrefix}-dropzone-idle`);
  const uploadingContent = document.getElementById(`${idPrefix}-uploading`);
  const uploadingText = document.getElementById(`${idPrefix}-uploading-text`);
  const previewImg = document.getElementById(`${idPrefix}-preview-img`) as HTMLImageElement | null;
  const feedbackEl = document.getElementById(`${idPrefix}-feedback`);

  if (!dropzone || !fileInput) return;

  // Feedback zurücksetzen oder anzeigen
  const showFeedback = (type: 'success' | 'error' | 'info', message: string) => {
    if (!feedbackEl) return;
    feedbackEl.style.display = 'block';
    feedbackEl.className = `image-upload-feedback feedback-${type}`;
    feedbackEl.innerHTML = message;
  };

  const clearFeedback = () => {
    if (!feedbackEl) return;
    feedbackEl.style.display = 'none';
    feedbackEl.innerHTML = '';
  };

  const setUploadingState = (isUploading: boolean, statusMsg?: string) => {
    if (idleContent) idleContent.style.display = isUploading ? 'none' : 'flex';
    if (uploadingContent) uploadingContent.style.display = isUploading ? 'flex' : 'none';
    if (uploadingText && statusMsg) uploadingText.textContent = statusMsg;
    if (dropzone) {
      if (isUploading) {
        dropzone.classList.add('is-uploading');
      } else {
        dropzone.classList.remove('is-uploading');
      }
    }
  };

  // Klick auf Button oder Dropzone öffnet den Dateidialog
  const openFileDialog = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
  };

  btnBrowse?.addEventListener('click', openFileDialog);
  dropzone.addEventListener('click', (e) => {
    // Verhindere Klick-Loop wenn Event vom File-Input selbst kommt
    if (e.target !== fileInput) {
      openFileDialog(e);
    }
  });

  // Tastaturnavigation für Barrierefreiheit
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFileDialog(e);
    }
  });

  // Drag & Drop Feedback
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  // Upload-Hauptfunktion
  const handleFile = async (file: File) => {
    clearFeedback();

    // 1. Validierung: Ist der Nutzer eingeloggt?
    if (!auth.currentUser) {
      showFeedback(
        'error',
        '⚠️ <strong>Nicht autorisiert:</strong> Bitte logge dich zuerst als Admin ein, um Bilder in Firebase Storage hochzuladen.'
      );
      if (onError) onError(new Error('Admin nicht eingeloggt'));
      return;
    }

    // 2. Validierung: Ist es eine Bilddatei?
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!file.type.startsWith('image/') && !validTypes.includes(file.type)) {
      showFeedback('error', '⚠️ Ungültiges Dateiformat. Bitte wähle eine Bilddatei (JPG, PNG, WebP).');
      if (onError) onError(new Error('Ungültiges Dateiformat'));
      return;
    }

    // 3. Validierung: Nicht leer und max 15 MB
    if (file.size === 0) {
      showFeedback('error', '⚠️ Die ausgewählte Datei ist leer (0 Bytes).');
      if (onError) onError(new Error('Datei ist leer'));
      return;
    }
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      showFeedback('error', '⚠️ Die Datei ist zu gross. Maximale Dateigrösse ist 15 MB.');
      if (onError) onError(new Error('Datei zu gross'));
      return;
    }

    // Sofortige lokale Voranzeige für blitzschnelles visuelles Feedback
    const localPreviewUrl = URL.createObjectURL(file);
    if (previewImg) {
      previewImg.src = localPreviewUrl;
      previewImg.classList.add('has-img');
    }

    try {
      setUploadingState(true, `Lade ${file.name} nach ${folder}/ hoch...`);

      // Eindeutigen Dateinamen erzeugen
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${folder}/${timestamp}_${sanitizedName}`;

      // Firebase Storage SDK: ref() und uploadBytes()
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type || 'image/jpeg',
      });

      // Firebase Storage SDK: getDownloadURL()
      setUploadingState(true, 'Erzeuge sichere Download-URL...');
      const downloadUrl = await getDownloadURL(snapshot.ref);

      // UI auf fertig setzen
      setUploadingState(false);

      // Vorschau auf die echte Storage URL aktualisieren
      if (previewImg) {
        previewImg.src = downloadUrl;
      }

      // Ziel-Eingabefeld im Formular automatisch mit der neuen URL befüllen
      if (targetInputId) {
        const targetInput = document.getElementById(targetInputId) as HTMLInputElement | null;
        if (targetInput) {
          targetInput.value = downloadUrl;
          // Event auslösen damit eventuelle Change-Listener reagieren
          targetInput.dispatchEvent(new Event('input', { bubbles: true }));
          targetInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // Erfolgsrückmeldung im Admin-Panel
      const shortUrl = downloadUrl.length > 55 ? downloadUrl.substring(0, 52) + '...' : downloadUrl;
      showFeedback(
        'success',
        `✅ <strong>Erfolgreich hochgeladen!</strong> Bild in <code>${folder}/</code> gespeichert.<br>` +
        `<a href="${downloadUrl}" target="_blank" rel="noopener noreferrer" class="storage-url-link">${shortUrl}</a>`
      );

      // Callback ausführen
      if (onSuccess) {
        onSuccess(downloadUrl);
      }
    } catch (err: any) {
      console.error('Firebase Storage Upload Fehler:', err);
      setUploadingState(false);

      let errorMessage = err?.message || 'Unbekannter Fehler beim Upload aufgetreten.';
      if (err?.code === 'storage/unauthorized') {
        errorMessage = 'Fehlende Berechtigung für Firebase Storage. Bitte Admin-Rechte prüfen.';
      } else if (err?.code === 'storage/canceled') {
        errorMessage = 'Upload wurde abgebrochen.';
      }

      showFeedback('error', `❌ <strong>Upload fehlgeschlagen:</strong> ${errorMessage}`);
      if (onError) onError(err);
    }
  };

  // Datei aus Input-Feld
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      handleFile(fileInput.files[0]);
    }
  });

  // Datei per Drag & Drop
  dropzone.addEventListener('drop', (e) => {
    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFile(droppedFiles[0]);
    }
  });
}
