/**
 * script.js — Self-Care App
 * Corrigé et restructuré :
 *  - Plus de code au top-level hors DOMContentLoaded
 *  - displayEntries() définie une seule fois
 *  - Parsing de date fr-FR corrigé
 *  - Gestion défensive des éléments manquants selon la page
 */

'use strict';

/* =========================================================
   UTILITAIRES
   ========================================================= */

/** Retourne l'heure actuelle au format HH:mm */
function getCurrentTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Convertit une date au format fr-FR (dd/mm/yyyy) en objet Date.
 * CORRECTION : new Date("28/06/2026") → Invalid Date en JS.
 */
function parseFrDate(frDateStr) {
    const [day, month, year] = frDateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
}

/** Retourne la date du jour au format fr-FR */
function todayFr() {
    return new Date().toLocaleDateString('fr-FR');
}

/* =========================================================
   HUMEUR — SAUVEGARDE
   ========================================================= */

/**
 * Enregistre l'humeur dans localStorage.
 * Une seule entrée par jour : si une entrée du jour existe, on la remplace.
 */
function saveMood(mood) {
    const now = new Date();
    const entryDate = now.toLocaleDateString('fr-FR');
    const entryTime = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
    });

    const entries = JSON.parse(localStorage.getItem('entries')) || [];
    const existingEntryIndex = entries.findIndex((e) => e.date === entryDate);

    if (existingEntryIndex !== -1) {
        entries[existingEntryIndex].mood = mood;
        entries[existingEntryIndex].time = entryTime;
    } else {
        entries.push({ date: entryDate, time: entryTime, mood });
    }

    localStorage.setItem('entries', JSON.stringify(entries));
    localStorage.setItem('currentMood', mood);
    localStorage.setItem('currentMoodTime', entryTime);
}

/**
 * Sauvegarde l'humeur puis recharge la page.
 * Appelée depuis index.html via event delegation.
 */
function saveMoodAndUpdatePage(mood) {
    saveMood(mood);
    location.reload();
}

/* =========================================================
   HUMEUR — AFFICHAGE DES ENTRÉES
   ========================================================= */

/** Génère le HTML d'une entrée d'humeur */
function createEntryHTML(date, mood) {
    const isToday = date === todayFr();
    const dateLabel = isToday ? "Aujourd'hui" : date;
    const moodLabel = isToday
        ? "<span class='highlighted'>Votre état d'humeur actuel est :</span>"
        : "État d'humeur :";

    return `
    <div class="entry">
      <div class="date">${dateLabel}</div>
      <div class="mood">
        ${moodLabel}
        <span class="name">${mood}</span>
      </div>
    </div>
  `;
}

/**
 * Affiche toutes les entrées dans #entries.
 * CORRECTION : était définie 2 fois — une seule définition ici.
 */
function displayEntries() {
    const entriesContainer = document.getElementById('entries');
    if (!entriesContainer) return; // élément absent sur certaines pages → on ignore

    const entries = JSON.parse(localStorage.getItem('entries')) || [];

    if (entries.length > 0) {
        entriesContainer.innerHTML = entries
            .map((e) => createEntryHTML(e.date, e.mood))
            .join('');
    } else {
        entriesContainer.innerHTML =
            "<p class='no-entries'>Aucune entrée d'humeur enregistrée.</p>";
    }
}

/* =========================================================
   GRAPHIQUE DES ÉMOTIONS
   ========================================================= */

const EMOTIONS = ['Furieux', 'Déprimé', 'Indifférent', 'Heureux', 'Fatigué'];
const EMOTION_COLORS = ['#ff4d4d', '#1a1a1a', '#c8c8a0', '#ffd700', '#ef58ef'];

/** Calcule les données pour Chart.js à partir des entrées */
function calculateEmotionData(entries) {
    const counts = new Array(EMOTIONS.length).fill(0);
    for (const entry of entries) {
        const idx = EMOTIONS.indexOf(entry.mood);
        if (idx !== -1) counts[idx]++;
    }
    return {
        labels: EMOTIONS,
        datasets: [{ data: counts, backgroundColor: EMOTION_COLORS }],
    };
}

/** Instancie ou met à jour le graphique Chart.js */
let emotionChartInstance = null;

function updateEmotionChart() {
    const canvas = document.getElementById('emotionChart');
    if (!canvas) return; // absent sur index.html → on ignore

    const entries = JSON.parse(localStorage.getItem('entries')) || [];
    const emotionsData = calculateEmotionData(entries);
    const ctx = canvas.getContext('2d');

    // CORRECTION : évite de créer un nouveau Chart à chaque appel (fuite mémoire)
    if (emotionChartInstance) {
        emotionChartInstance.data = emotionsData;
        emotionChartInstance.update();
    } else {
        emotionChartInstance = new Chart(ctx, {
            type: 'pie',
            data: emotionsData,
            options: { responsive: true, maintainAspectRatio: false },
        });
    }
}

/* =========================================================
   ENREGISTREMENT DE L'HUMEUR À MINUIT
   ========================================================= */

/** Enregistre l'humeur courante comme humeur finale de la journée */
function saveDailyMood() {
    const currentMood = localStorage.getItem('currentMood');
    if (!currentMood) return;

    const entryDate = todayFr();
    const entries = JSON.parse(localStorage.getItem('entries')) || [];
    const existingEntryIndex = entries.findIndex((e) => e.date === entryDate);

    if (existingEntryIndex !== -1) {
        entries[existingEntryIndex].mood = currentMood;
    } else {
        entries.push({ date: entryDate, mood: currentMood });
    }

    localStorage.setItem('entries', JSON.stringify(entries));
    updateEmotionChart();
}

/** Planifie saveDailyMood() à minuit */
function planifierSauvegardeMidnight() {
    const now = new Date();
    const midnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0
    );
    setTimeout(saveDailyMood, midnight.getTime() - now.getTime());
}

/* =========================================================
   NETTOYAGE DES DONNÉES VIEILLES D'UN MOIS
   ========================================================= */

/**
 * Supprime les entrées de plus d'un mois.
 * CORRECTION : parseFrDate() utilisé pour éviter Invalid Date.
 */
function resetDataAfterMonth() {
    const entries = JSON.parse(localStorage.getItem('entries')) || [];
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const filtered = entries.filter((entry) => {
        const entryDate = parseFrDate(entry.date);
        return !isNaN(entryDate) && entryDate >= oneMonthAgo;
    });

    localStorage.setItem('entries', JSON.stringify(filtered));
}

/* =========================================================
   TÉLÉCHARGEMENT DE L'HISTORIQUE
   ========================================================= */

function generateHistoryContent(entries) {
    const patientName = localStorage.getItem('patientFullName') || 'Inconnu';
    let html = `
    <table style="border-collapse: collapse; max-width: 768px; width: 100%; margin: auto;">
      <thead>
        <tr>
          <th style="border: 1px solid black; padding: 8px;">Date</th>
          <th style="border: 1px solid black; padding: 8px;">Humeur</th>
          <th style="border: 1px solid black; padding: 8px;">Nom du patient</th>
        </tr>
      </thead>
      <tbody>
  `;
    entries.forEach((entry) => {
        html += `
        <tr>
          <td style="border: 1px solid black; padding: 8px;">${entry.date}</td>
          <td style="border: 1px solid black; padding: 8px;">${entry.mood}</td>
          <td style="border: 1px solid black; padding: 8px;">${patientName}</td>
        </tr>
    `;
    });
    html += `</tbody></table>`;
    return html;
}

function downloadHistory() {
    const entries = JSON.parse(localStorage.getItem('entries')) || [];
    const patientName = localStorage.getItem('patientFullName') || 'patient';
    const currentDate = new Date().toISOString().split('T')[0];
    const fileName = `historique_humeur_${patientName}_${currentDate}.html`;

    const fileContent = generateHistoryContent(entries);
    const fileBlob = new Blob([fileContent], {
        type: 'text/html;charset=utf-8',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(fileBlob);
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/* =========================================================
   PHOTO DE PROFIL
   ========================================================= */

function initProfilePicture() {
    // CORRECTION : profilePicture est un <i> FontAwesome, pas un <img>.
    // On remplace l'icône par une vraie image quand l'utilisateur en choisit une.
    const label = document.getElementById('uploadPictureBtn');
    const input = document.getElementById('profilePictureInput');
    const iconEl = document.getElementById('profilePicture');
    if (!input || !iconEl) return;

    // Charger la photo sauvegardée au démarrage
    const savedUrl = localStorage.getItem('profilePictureUrl');
    if (savedUrl) {
        remplacerIconeParImage(iconEl, label, savedUrl);
    }

    input.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const imageUrl = e.target.result;
            localStorage.setItem('profilePictureUrl', imageUrl);
            remplacerIconeParImage(iconEl, label, imageUrl);
        };
        reader.readAsDataURL(file);
    });
}

function remplacerIconeParImage(iconEl, label, imageUrl) {
    // Remplace l'icône <i> par une <img> ronde
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Photo de profil';
    img.style.cssText =
        'width:100%; height:100%; object-fit:cover; border-radius:50%;';
    iconEl.replaceWith(img);
    label.style.cursor = 'pointer';
}

/* =========================================================
   RECOMMANDATIONS
   ========================================================= */

const RECOMMENDATIONS = {
    Furieux:
        'Essayez une courte marche ou quelques respirations profondes pour calmer la colère.',
    Déprimé:
        'Accordez-vous un moment doux : une tisane, de la musique apaisante, ou un appel à un proche.',
    Indifférent:
        'Une petite activité créative ou un objectif simple peut raviver votre engagement.',
    Heureux:
        "Profitez de ce bon élan ! C'est le bon moment pour avancer sur un projet qui vous tient à cœur.",
    Fatigué:
        'Reposez-vous sans culpabilité. Un micro-sommeil de 20 min peut faire des merveilles.',
};

function getRecommendations(emotion) {
    return RECOMMENDATIONS[emotion] || "Prenez soin de vous aujourd'hui.";
}

/* =========================================================
   INITIALISATION — PAGE DE CONNEXION (login / portail)
   ========================================================= */

function initializeApp() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return; // pas sur cette page

    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const fullName = document.getElementById('fullName').value.trim();
        if (!fullName) return;

        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('patientFullName', fullName);
        window.location.href = 'pages/portail.html';
    });
}

/* =========================================================
   INITIALISATION — PORTAIL PATIENT (index.html)
   ========================================================= */

function displayUsername() {
    const fullName = localStorage.getItem('patientFullName');
    const nameEl = document.querySelector('.name');
    if (fullName && nameEl) {
        nameEl.textContent = fullName;
    }
}

function initializePatientApp() {
    displayUsername();
}

/* =========================================================
   BOUTON DE TÉLÉCHARGEMENT (graphique.html ou autre)
   ========================================================= */

function initDownloadButton() {
    // CORRECTION : était au top-level → crash si #downloadBtn absent
    const downloadBtn = document.getElementById('downloadBtn');
    if (!downloadBtn) return;

    downloadBtn.addEventListener('click', downloadHistory);
}

/* =========================================================
   POINT D'ENTRÉE UNIQUE
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {
    // Nettoyage des vieilles données
    resetDataAfterMonth();

    // Initialisation selon la page courante (défensive)
    initializeApp(); // page de connexion
    initializePatientApp(); // portail patient
    initProfilePicture(); // photo de profil
    initDownloadButton(); // bouton téléchargement

    // Affichage des données
    displayEntries(); // liste des humeurs (si #entries existe)
    updateEmotionChart(); // graphique (si #emotionChart existe)

    // Planifier la sauvegarde à minuit
    planifierSauvegardeMidnight();
});
