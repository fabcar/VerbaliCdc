/*******************************
 *  CONFIGURAZIONE FIREBASE
 *******************************/
const firebaseConfig = {
  apiKey: "AIzaSyAzPfEgySZiCaofh1PQX2j77ybIg9z3-k",
  authDomain: "autentica-579fa.firebaseapp.com",
  projectId: "autentica-579fa",
  storageBucket: "autentica-579fa.firebasestorage.app",
  messagingSenderId: "303013464592",
  appId: "1:303013464592:web:7936da781836b5d0b85895",
  measurementId: "G-8HR0ZCBKQ0"
};

// Inizializza Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

/*******************************
 *  ELEMENTI UI
 *******************************/
const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const btnLoginGoogle = document.getElementById("login-google");
const btnLogout = document.getElementById("logout");
const loginError = document.getElementById("login-error");

/*******************************
 *  AUTENTICAZIONE GOOGLE
 *******************************/
auth.onAuthStateChanged(user => {
  if (user) {
    // Utente LOGGATO → mostra app
    loginSection.style.display = "none";
    appSection.style.display = "block";
  } else {
    // Non loggato → mostra login
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
      loginError.textContent = "Errore di accesso: " + err.message;
    });
});

// LOGOUT
btnLogout?.addEventListener("click", () => {
  auth.signOut();
});

/*******************************
 *  LOGICA RICERCA DELIBERE
 *******************************/
let documents = [];

const selectAnno = document.getElementById("anno");
const inputOggetto = document.getElementById("oggetto");
const btnCerca = document.getElementById("cerca");
const resultsDiv = document.getElementById("results");

// Carico data.json
fetch("data.json")
  .then(res => res.json())
  .then(data => {
    documents = data || [];
    popolaAnniScolastici();
  })
  .catch(err => {
    console.error("Errore caricamento data.json:", err);
  });

// Popola menu anni scolastici
function popolaAnniScolastici() {
  const anni = new Set();
  documents.forEach(d => {
    if (d.anno_scolastico) anni.add(d.anno_scolastico);
  });

  Array.from(anni)
    .sort()
    .forEach(as => {
      const opt = document.createElement("option");
      opt.value = as;
      opt.textContent = as;
      selectAnno.appendChild(opt);
    });
}

// Estrae numero della delibera
function estraiNumeroDelibera(riga) {
  const re = /Delibera\s+n[°º]?\s*[_\s]*([0-9]+)/i;
  const m = riga.match(re);
  return (m && m[1]) ? m[1].trim() : "";
}

// Ricerca vera
function eseguiRicerca() {
  const annoSel = selectAnno.value;
  const testo = inputOggetto.value.trim().toLowerCase();

  if (!annoSel && !testo) {
    resultsDiv.innerHTML = "<p>Seleziona un anno scolastico e/o inserisci parte dell'oggetto.</p>";
    return;
  }

  let filtrati = documents;
  if (annoSel) {
    filtrati = filtrati.filter(d => d.anno_scolastico === annoSel);
  }

  let risultati = [];

  filtrati.forEach(doc => {
    const righe = (doc.delibere || "")
      .split("|")
      .map(r => r.trim())
      .filter(r => r);

    righe.forEach(riga => {
      if (!testo || riga.toLowerCase().includes(testo)) {
        risultati.push({
          numero: estraiNumeroDelibera(riga) || "—",
          data: doc.data || "(data assente)",
          anno_scolastico: doc.anno_scolastico || "",
          testo: riga,
          file: doc.file || ""
        });
      }
    });
  });

  if (!risultati.length) {
    resultsDiv.innerHTML = "<p>Nessuna delibera trovata.</p>";
    return;
  }

  let html = "";
  risultati.forEach(r => {
    html += `
      <div class="result-card">
        <div class="result-header">
          <div class="result-file">Delibera n° <strong>${r.numero}</strong></div>
          <div class="result-meta">
            Data: ${r.data} ${r.anno_scolastico ? "– A.S. " + r.anno_scolastico : ""}
          </div>
        </div>
        <div class="result-delibere">
          <strong>Testo:</strong> ${r.testo}
        </div>
        ${
          r.file
            ? `<div class="result-actions">
                 <a href="verbali/${r.file}" target="_blank">Apri verbale (PDF)</a>
               </div>`
            : ""
        }
      </div>
    `;
  });

  resultsDiv.innerHTML = html;
}

// Eventi
btnCerca?.addEventListener("click", eseguiRicerca);
inputOggetto?.addEventListener("keydown", e => {
  if (e.key === "Enter") eseguiRicerca();
});
