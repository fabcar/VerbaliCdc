/*********** CONFIGURAZIONE FIREBASE ***********/

// SOSTITUISCI QUESTO OGGETTO con il tuo firebaseConfig
// preso dalla console Firebase (Project settings -> Web app)
const firebaseConfig = {
  apiKey: "INSERISCI_API_KEY",
  authDomain: "INSERISCI_AUTH_DOMAIN",
  projectId: "INSERISCI_PROJECT_ID",
  storageBucket: "INSERISCI_STORAGE_BUCKET",
  messagingSenderId: "INSERISCI_MESSAGING_SENDER_ID",
  appId: "INSERISCI_APP_ID"
};

// Inizializza Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

/*********** GESTIONE UI LOGIN ***********/

const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const btnLoginGoogle = document.getElementById("login-google");
const btnLogout = document.getElementById("logout");
const loginError = document.getElementById("login-error");

// Quando cambia lo stato di autenticazione
auth.onAuthStateChanged(user => {
  if (user) {
    // Utente loggato
    loginSection.style.display = "none";
    appSection.style.display = "block";
  } else {
    // Non loggato
    appSection.style.display = "none";
    loginSection.style.display = "block";
  }
});

// Login con Google
btnLoginGoogle.addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(result => {
      loginError.textContent = "";
    })
    .catch(err => {
      console.error(err);
      loginError.textContent = "Errore di accesso: " + err.message;
    });
});

// Logout
btnLogout.addEventListener("click", () => {
  auth.signOut();
});

/*********** LOGICA DI RICERCA DELIBERE ***********/

let documents = [];

// Carico i dati dal data.json
fetch("data.json")
  .then(res => res.json())
  .then(data => {
    documents = data || [];
    popolaAnniScolastici();
  })
  .catch(err => {
    console.error("Errore caricamento data.json:", err);
  });

const selectAnno = document.getElementById("anno");
const inputOggetto = document.getElementById("oggetto");
const btnCerca = document.getElementById("cerca");
const resultsDiv = document.getElementById("results");

// Popola il menu a tendina degli anni scolastici
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

// Estrae "Delibera n° X" dalla riga di testo
function estraiNumeroDelibera(riga) {
  const re = /Delibera\s+n[°º]?\s*[_\s]*([0-9]+)/i;
  const m = riga.match(re);
  if (m && m[1]) return m[1].trim();
  return "";
}

// Azione di ricerca
function eseguiRicerca() {
  const annoSelezionato = selectAnno.value;
  const testo = inputOggetto.value.trim().toLowerCase();

  if (!annoSelezionato && !testo) {
    resultsDiv.innerHTML = "<p>Seleziona un anno scolastico e/o inserisci parte dell'oggetto.</p>";
    return;
  }

  let filtrati = documents;
  if (annoSelezionato) {
    filtrati = filtrati.filter(d => d.anno_scolastico === annoSelezionato);
  }

  let risultati = [];

  filtrati.forEach(doc => {
    const delibereText = doc.delibere || "";
    if (!delibereText) return;

    const righe = delibereText.split("|").map(r => r.trim()).filter(r => r.length > 0);

    righe.forEach(riga => {
      if (!testo || riga.toLowerCase().includes(testo)) {
        const num = estraiNumeroDelibera(riga);
        risultati.push({
          numero: num || "(numero non rilevato)",
          data: doc.data || "(data non indicata)",
          anno_scolastico: doc.anno_scolastico || "",
          testo: riga,
          file: doc.file || ""
        });
      }
    });
  });

  if (!risultati.length) {
    resultsDiv.innerHTML = "<p>Nessuna delibera trovata con i criteri indicati.</p>";
    return;
  }

  let html = "";

  risultati.forEach(r => {
    html += `
      <div class="result-card">
        <div class="result-header">
          <div class="result-file">
            Delibera n° <strong>${r.numero}</strong>
          </div>
          <div class="result-meta">
            Data: ${r.data}
            ${r.anno_scolastico ? " – A.S. " + r.anno_scolastico : ""}
          </div>
        </div>
        <div class="result-delibere">
          <strong>Testo:</strong> ${r.testo}
        </div>
        ${r.file ? `
        <div class="result-actions">
          <a href="verbali/${r.file}" target="_blank">Apri verbale (PDF)</a>
        </div>` : ""}
      </div>
    `;
  });

  resultsDiv.innerHTML = html;
}

// Eventi
btnCerca.addEventListener("click", eseguiRicerca);
inputOggetto.addEventListener("keydown", function (e) {
  if (e.key === "Enter") eseguiRicerca();
});
