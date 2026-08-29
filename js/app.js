function goto(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  const el = document.getElementById('nav-' + page);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}

function showToast(msg) {
  const t = document.getElementById('globalToast');
  t.textContent = msg || 'Copié !';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1600);
}

const thief = new ColorThief();
let colorCount = 5;
let currentImg = null;

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const resultArea = document.getElementById('resultArea');
const resultImg = document.getElementById('resultImg');
const paletteList = document.getElementById('paletteList');
const cssPanel = document.getElementById('cssPanel');
const cssCode = document.getElementById('cssCode');
const cssCopyBtn = document.getElementById('cssCopyBtn');
const resetBtn = document.getElementById('resetBtn');

// === Gestion de l'état (localStorage) ===
const STORAGE_KEY = 'palettepick_state';

function saveState() {
  const state = {
    colorCount: colorCount,
    cssLines: cssCode.innerHTML,
    analysisCount: analysisCount,
    donationShown: donationShown
  };
  // Sauvegarde de l'image en base64
  if (currentImg) {
    const canvas = document.createElement('canvas');
    canvas.width = currentImg.naturalWidth || currentImg.width;
    canvas.height = currentImg.naturalHeight || currentImg.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(currentImg, 0, 0);
    state.imageBase64 = canvas.toDataURL('image/png');
  }
  // Sauvegarde des couleurs
  const items = paletteList.querySelectorAll('.pal-row');
  const colors = [];
  items.forEach(row => {
    const hex = row.querySelector('.pal-hex')?.textContent;
    const rgb = row.querySelector('.pal-rgb')?.textContent;
    if (hex && rgb) colors.push({ hex, rgb });
  });
  state.colors = colors;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const state = JSON.parse(raw);
    // Restaurer l'image
    if (state.imageBase64) {
      resultImg.src = state.imageBase64;
      resultImg.onload = () => {
        currentImg = resultImg;
        colorCount = state.colorCount || 5;
        // Restaurer la palette si elle existe
        if (state.colors && state.colors.length) {
          displayPalette(state.colors);
          cssCode.innerHTML = state.cssLines || '';
          cssPanel.classList.add('visible');
          // Synchroniser les boutons actifs
          document.querySelectorAll('.count-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.n) === colorCount);
          });
        }
        dropZone.style.display = 'none';
        resultArea.classList.add('visible');
      };
    }
    analysisCount = state.analysisCount || 0;
    donationShown = state.donationShown || false;
    return true;
  } catch (e) {
    return false;
  }
}

// === Gestion de la modale de don ===
let analysisCount = 0;
let donationShown = false;

const donationModal = document.getElementById('donationModal');
const closeDonation = document.getElementById('closeDonationModal');
const dismissDonation = document.getElementById('dismissDonation');

function showDonationModal() {
  if (donationShown || !donationModal) return;
  donationModal.classList.add('active');
  donationShown = true;
}

function hideDonationModal() {
  if (donationModal) donationModal.classList.remove('active');
}

// === Fonction d'affichage de la palette (utilisée pour restauration) ===
function displayPalette(colors) {
  paletteList.innerHTML = '';
  colors.forEach((item, i) => {
    const hex = item.hex;
    const rgb = item.rgb;
    const row = document.createElement('div');
    row.className = 'pal-row';
    row.style.animationDelay = (i * 0.07) + 's';
    row.innerHTML = `
      <div class="pal-swatch" style="background:${hex}" onclick="copyVal('${hex}')"></div>
      <div class="pal-info">
        <div class="pal-hex">${hex}</div>
        <div class="pal-rgb">${rgb}</div>
      </div>
      <button class="copy-btn" onclick="copyVal('${hex}',this)">HEX</button>
      <button class="copy-btn" onclick="copyVal('${rgb}',this)">RGB</button>
    `;
    paletteList.appendChild(row);
  });
}

// === Événements ===
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) handleFile(f);
});
fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

document.getElementById('countBar').querySelectorAll('.count-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const n = parseInt(btn.dataset.n);
    document.getElementById('countBar').querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    colorCount = n;
    saveState();
    if (currentImg) analyze();
  });
});

resetBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  analysisCount = 0;
  donationShown = false;
  resultArea.classList.remove('visible');
  cssPanel.classList.remove('visible');
  dropZone.style.display = 'block';
  fileInput.value = '';
  currentImg = null;
  paletteList.innerHTML = '';
});

function handleFile(file) {
  const url = URL.createObjectURL(file);
  resultImg.src = url;
  resultImg.onload = () => { currentImg = resultImg; analyze(); };
  dropZone.style.display = 'none';
  resultArea.classList.add('visible');
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

const varNames = ['primary', 'secondary', 'accent', 'neutral', 'highlight', 'warm', 'cool', 'subtle', 'vivid', 'base'];

function analyze() {
  try {
    const palette = thief.getPalette(currentImg, colorCount, 5);
    if (!palette) {
      throw new Error("L'extraction a échoué.");
    }

    const colors = [];
    paletteList.innerHTML = '';
    let cssLines = '<span class="kw">:root</span> {\n';

    palette.forEach(([r, g, b], i) => {
      const hex = rgbToHex(r, g, b);
      const rgbStr = `rgb(${r}, ${g}, ${b})`;
      const vn = '--color-' + (varNames[i] || 'color-' + (i + 1));
      cssLines += '  <span class="prop">' + vn + '</span>: <span class="val">' + hex + '</span>;\n';

      const row = document.createElement('div');
      row.className = 'pal-row';
      row.style.animationDelay = (i * 0.07) + 's';
      row.innerHTML = `
        <div class="pal-swatch" style="background:${hex}" onclick="copyVal('${hex}')"></div>
        <div class="pal-info">
          <div class="pal-hex">${hex}</div>
          <div class="pal-rgb">${rgbStr}</div>
        </div>
        <button class="copy-btn" onclick="copyVal('${hex}',this)">HEX</button>
        <button class="copy-btn" onclick="copyVal('${rgbStr}',this)">RGB</button>
      `;
      paletteList.appendChild(row);
      colors.push({ hex, rgb: rgbStr });
    });

    cssLines += '}';
    cssCode.innerHTML = cssLines;
    cssPanel.classList.add('visible');

    // === Sauvegarde dans l'historique ===
    // On convertit la palette brute en tableau de couleurs pour l'historique
    const colorsForHistory = palette.map(([r, g, b]) => [r, g, b]);
    saveToHistory(colorsForHistory, colorCount, cssLines);

    console.log('💾 Palette sauvegardée dans l\'historique :', colorsForHistory);

    // Sauvegarde de l'état (restauration de session)
    saveState();

    // Générer automatiquement le dégradé
    generateGradient();

    // Incrémenter le compteur et afficher la modale si nécessaire
    analysisCount++;
    if (analysisCount >= 3 && !donationShown) {
      setTimeout(showDonationModal, 300);
    }

  } catch (error) {
    console.error("Erreur d'analyse :", error);
    showToast("Erreur : Image non supportée ou illisible.");
    resetBtn.click();
  }
}

function copyVal(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copié : ' + text);
    if (btn) {
      btn.classList.add('ok');
      const o = btn.textContent;
      btn.textContent = '✓';
      setTimeout(() => { btn.classList.remove('ok'); btn.textContent = o; }, 1200);
    }
  });
}

cssCopyBtn.addEventListener('click', () => {
  const raw = cssCode.innerText;
  navigator.clipboard.writeText(raw).then(() => {
    showToast('CSS copié !');
    cssCopyBtn.textContent = '✓ Copié';
    setTimeout(() => cssCopyBtn.textContent = 'Copier le CSS', 1500);
  });
});

// === Écouteurs pour la modale de don ===
if (closeDonation) closeDonation.addEventListener('click', hideDonationModal);
if (dismissDonation) dismissDonation.addEventListener('click', hideDonationModal);

if (donationModal) {
  donationModal.addEventListener('click', function(e) {
    if (e.target === donationModal) {
      hideDonationModal();
    }
  });
}

const donateBtn = document.getElementById('donateButton');
if (donateBtn) donateBtn.addEventListener('click', showDonationModal);

// === Restaurer l'état au chargement ===
window.addEventListener('DOMContentLoaded', function() {
  loadState();
  renderHistory(); // Affiche l'historique même s'il n'y a pas de palette active
});

// Si l'utilisateur arrive sur tool.html#donate, ouvrir la modale
if (window.location.hash === '#donate') {
  setTimeout(showDonationModal, 600);
  // On retire le hash de l'URL pour ne pas le réafficher au rechargement
  history.replaceState(null, '', window.location.pathname);
}

// ==========================================
// HISTORIQUE (localStorage)
// ==========================================
const HISTORY_KEY = 'palettepick_history';
const MAX_HISTORY = 10;

function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function saveToHistory(colors, count, css) {
  const history = getHistory();
  const entry = {
    id: Date.now(),
    colors: colors, // tableau de [r, g, b]
    count: count,
    css: css,
    date: new Date().toLocaleDateString('fr-FR')
  };
  // Ajouter en tête
  history.unshift(entry);
  // Limiter à 10
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  saveHistory(history);
  renderHistory();
}

function restoreFromHistory(index) {
  const history = getHistory();
  const entry = history[index];
  if (!entry) return;

  // Restaurer les couleurs
  const palette = entry.colors;
  const count = entry.count;

  // Mettre à jour le compteur de couleurs
  document.getElementById('countBar').querySelectorAll('.count-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.n) === count);
  });
  colorCount = count;

  // Recréer l'affichage de la palette
  paletteList.innerHTML = '';
  let cssLines = '<span class="kw">:root</span> {\n';
  palette.forEach(([r, g, b], i) => {
    const hex = rgbToHex(r, g, b);
    const vn = '--color-' + (varNames[i] || 'color-' + (i + 1));
    cssLines += '  <span class="prop">' + vn + '</span>: <span class="val">' + hex + '</span>;\n';
    const row = document.createElement('div');
    row.className = 'pal-row';
    row.style.animationDelay = (i * 0.07) + 's';
    row.innerHTML = `
      <div class="pal-swatch" style="background:${hex}" onclick="copyVal('${hex}')"></div>
      <div class="pal-info">
        <div class="pal-hex">${hex}</div>
        <div class="pal-rgb">rgb(${r}, ${g}, ${b})</div>
      </div>
      <button class="copy-btn" onclick="copyVal('${hex}',this)">HEX</button>
      <button class="copy-btn" onclick="copyVal('rgb(${r},${g},${b})',this)">RGB</button>
    `;
    paletteList.appendChild(row);
  });
  cssLines += '}';
  cssCode.innerHTML = cssLines;
  cssPanel.classList.add('visible');

  // Réafficher la zone de résultat
  resultArea.classList.add('visible');
  dropZone.style.display = 'none';

  // Sauvegarder l'état pour la session
  saveState();

  // Générer automatiquement le dégradé
  generateGradient();
}

function renderHistory() {
  const history = getHistory();
  const panel = document.getElementById('historyPanel');
  const list = document.getElementById('historyList');

  console.log('🔍 renderHistory appelé');
  console.log('📦 panel =', panel);
  console.log('📦 list =', list);
  console.log('📦 historique =', history);

  if (!panel) {
    console.error('❌ #historyPanel introuvable dans le DOM');
    return;
  }

  if (history.length === 0) {
    console.log('📭 Aucune palette dans l\'historique');
    panel.style.display = 'none';
    return;
  }

  console.log('✅ Affichage de l\'historique avec', history.length, 'entrées');
  panel.style.display = 'block';
  list.innerHTML = '';

  history.forEach((entry, index) => {
    const item = document.createElement('div');
    item.className = 'history-item';

    const swatchesDiv = document.createElement('div');
    swatchesDiv.className = 'history-swatches';

    const displayColors = entry.colors.slice(0, 5);
    displayColors.forEach(([r, g, b]) => {
      const swatch = document.createElement('div');
      swatch.className = 'history-swatch';
      swatch.style.background = `rgb(${r}, ${g}, ${b})`;
      swatchesDiv.appendChild(swatch);
    });
    if (entry.colors.length > 5) {
      const more = document.createElement('div');
      more.className = 'history-swatch';
      more.style.background = 'var(--surface)';
      more.style.display = 'flex';
      more.style.alignItems = 'center';
      more.style.justifyContent = 'center';
      more.style.fontSize = '8px';
      more.style.color = 'var(--muted2)';
      more.textContent = `+${entry.colors.length - 5}`;
      swatchesDiv.appendChild(more);
    }

    const meta = document.createElement('div');
    meta.className = 'history-meta';
    meta.textContent = `${entry.count} couleurs · ${entry.date}`;

    const btn = document.createElement('button');
    btn.className = 'history-restore-btn';
    btn.textContent = 'RESTAURER';
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      restoreFromHistory(index);
    });

    item.addEventListener('click', function() {
      restoreFromHistory(index);
    });

    item.appendChild(swatchesDiv);
    item.appendChild(meta);
    item.appendChild(btn);
    list.appendChild(item);
  });
}

// --- Effacer l'historique ---
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', function() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
    showToast('Historique effacé');
  });
}

// ==========================================
// GÉNÉRATEUR DE DÉGRADÉ
// ==========================================

function getCurrentPaletteColors() {
  const items = paletteList.querySelectorAll('.pal-row');
  const colors = [];
  items.forEach(row => {
    const hexEl = row.querySelector('.pal-hex');
    if (hexEl) colors.push(hexEl.textContent);
  });
  return colors;
}

function generateGradient() {
  const colors = getCurrentPaletteColors();
  const panel = document.getElementById('gradientPanel');
  const preview = document.getElementById('gradientPreview');
  const code = document.getElementById('gradientCode');
  const copyBtn = document.getElementById('copyGradientBtn');
  const directionSelect = document.getElementById('gradientDirection');

  if (colors.length < 2) {
    showToast('Il faut au moins 2 couleurs pour un dégradé.');
    return;
  }

  // Utiliser toutes les couleurs de la palette
  const direction = directionSelect ? directionSelect.value : 'to right';
  const gradColors = colors.join(', ');
  
  let css;
  if (direction === 'radial') {
    css = `background: radial-gradient(circle, ${gradColors});`;
  } else {
    css = `background: linear-gradient(${direction}, ${gradColors});`;
  }

  preview.style.background = css.replace('background: ', '');
  code.textContent = css;
  code.style.display = 'block';
  copyBtn.style.display = 'inline-block';
  panel.style.display = 'block';
}

// Écouteur pour le bouton "Générer un dégradé"
const genGradBtn = document.getElementById('generateGradientBtn');
if (genGradBtn) {
  genGradBtn.addEventListener('click', generateGradient);
}

// Écouteur pour copier le CSS du dégradé
const copyGradBtn = document.getElementById('copyGradientBtn');
if (copyGradBtn) {
  copyGradBtn.addEventListener('click', function() {
    const code = document.getElementById('gradientCode');
    if (!code) return;
    const text = code.textContent;
    navigator.clipboard.writeText(text).then(() => {
      showToast('Dégradé CSS copié !');
      copyGradBtn.textContent = '✓ Copié';
      setTimeout(() => copyGradBtn.textContent = 'Copier le CSS', 1500);
    });
  });
}

// Mettre à jour le dégradé quand la direction change
const dirSelect = document.getElementById('gradientDirection');
if (dirSelect) {
  dirSelect.addEventListener('change', generateGradient);
}