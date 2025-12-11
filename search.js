const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const btnLoginGoogle = document.getElementById("login-google");
const btnLogout = document.getElementById("logout");
const loginError = document.getElementById("login-error");

const auth = firebase.auth();

auth.onAuthStateChanged(user => {
  if (user) {
    loginSection.style.display = "none";
    appSection.style.display = "block";
  } else {
    appSection.style.display = "none";
    loginSection.style.display = "block";
  }
});

// LOGIN
btnLoginGoogle?.addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(() => {
      loginError.textContent = "";
    })
    .catch(err => {
      console.error(err);
      loginError.textContent = "Errore: " + err.message;
    });
});

// LOGOUT
btnLogout?.addEventListener("click", () => auth.signOut());

/*******************************
 *  RICERCA VERBALI (BACKEND APPS SCRIPT)
 *******************************/

// 👇 METTI QUI l'URL dello script Apps Script
const SCRIPT_URL = "https://script.google.com/a/macros/itisgrassi.edu.it/s/AKfycby4ajKXE1auZCj758BZbtHJQXy5W6u7jwZ9MpdaKK4ude9E0XulYQW_lP2yRdU4E6Nggg/exec";

let documents = [];

const selectAnno   = document.getElementById("anno");
const selectOrgano = document.getElementById("organo");  // opzionale, se c'è
const inputOggetto = document.getElementById("oggetto");
const btnCerca     = document.getElementById("cerca");
const resultsDiv   = document.getElementById("results");

// Carica i verbali dal backend Apps Script (Classroom)
fetch(SCRIPT_URL)
  .then(res => res.json())
  .then(data => {
    documents = (data && data.items) ? data.items : [];
   console.log("Documenti caricati:", documents.length, documents); 
    popolaAnni();
  })
  .catch(err => {
    console.error("Errore caricamento verbali da Apps Script:", err);
    resultsDiv.innerHTML = "<p>Errore nel caricare i verbali dal backend.</p>";
  });

// Popola anni scolastici
function popolaAnni() {
  const anni = new Set(documents.map(d => d.anno_scolastico).filter(Boolean));
  [...anni].sort().forEach(as => {
    const opt = document.createElement("option");
    opt.value = as;
    opt.textContent = as;
    selectAnno.appendChild(opt);
  });
}

// Estrae n° della delibera dal titolo del file
function estraiNumero(titolo) {
  if (!titolo) return "—";
  const m = titolo.match(/Delibera\s+n[°º]?\s*[_\s]*([0-9]+)/i);
  return (m && m[1]) ? m[1] : "—";
}

// Ricerca
function eseguiRicerca() {
  const annoSel   = selectAnno.value;
  const organoSel = selectOrgano ? selectOrgano.value : "";
  const testo     = inputOggetto.value.toLowerCase().trim();

  let risultati = [];

  documents.forEach(doc => {
    if (annoSel && doc.anno_scolastico !== annoSel) return;

    const organoDoc = doc.organo || "collegio";
    if (organoSel) {
      if (organoSel === "collegio" && organoDoc !== "collegio") return;
      if (organoSel === "consiglio" && organoDoc !== "consiglio") return;
    }

    const titolo = doc.titolo || "";
    const testoDoc = titolo.toLowerCase();
    if (testo && !testoDoc.includes(testo)) return;

    risultati.push({
      numero: estraiNumero(titolo),
      data: doc.data || "—",
      anno: doc.anno_scolastico || "",
      testo: titolo,
      organo: organoDoc,
      link: doc.link || ""
    });
  });

  if (!risultati.length) {
    resultsDiv.innerHTML = "<p>Nessuna delibera trovata.</p>";
    return;
  }

  resultsDiv.innerHTML = risultati.map(r => `
    <div class="result-card">
      <div class="result-header">
        <strong>Delibera n° ${r.numero}</strong>
        <span>Data: ${r.data} – A.S. ${r.anno}</span>
      </div>
      <div><strong>Organo:</strong> ${r.organo}</div>
      <div><strong>Titolo:</strong> ${r.testo}</div>
      ${r.link ? `<div><a href="${r.link}" target="_blank">Apri PDF su Drive</a></div>` : ""}
    </div>
  `).join("");
}

btnCerca?.addEventListener("click", eseguiRicerca);
inputOggetto?.addEventListener("keydown", e => {
  if (e.key === "Enter") eseguiRicerca();
});
