/*******************************
 *  AUTENTICAZIONE GOOGLE
 *******************************/

const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const btnLoginGoogle = document.getElementById("login-google");
const btnLogout = document.getElementById("logout");
const loginError = document.getElementById("login-error");

// firebaseConfig è in index.html
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
 *  RICERCA DELIBERE
 *******************************/

let documents = [];

const selectAnno = document.getElementById("anno");
const selectOrgano = document.getElementById("organo");  // 👈 tendina organo
const inputOggetto = document.getElementById("oggetto");
const btnCerca = document.getElementById("cerca");
const resultsDiv = document.getElementById("results");

// Carica le delibere
fetch("data.json")
  .then(res => res.json())
  .then(data => {
    documents = data || [];
    popolaAnni();
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

// Estrae n° della delibera dal testo
function estraiNumero(linea) {
  const m = linea.match(/Delibera\s+n[°º]?\s*[_\s]*([0-9]+)/i);
  return (m && m[1]) ? m[1] : "—";
}

// Ricerca
function eseguiRicerca() {
  const annoSel = selectAnno.value;
  const organoSel = selectOrgano ? selectOrgano.value : "";
  const testo = inputOggetto.value.toLowerCase().trim();

  let risultati = [];

  documents.forEach(doc => {
    // 1. filtro per ANNO
    if (annoSel && doc.anno_scolastico !== annoSel) return;

    // 2. filtro per ORGANO
    // Se nel JSON non esiste doc.organo:
    // - lo consideriamo "collegio" di default
    const organoDoc = doc.organo || "collegio";

    if (organoSel) {
      // se l'utente ha scelto "collegio", mostriamo:
      // - quelli con organo = "collegio"
      // - quelli senza campo organo (default collegio)
      if (organoSel === "collegio" && !(organoDoc === "collegio")) return;
      // se ha scelto "consiglio", mostriamo solo organo = "consiglio"
      if (organoSel === "consiglio" && organoDoc !== "consiglio") return;
    }

    const righe = (doc.delibere || "")
      .split("|")
      .map(r => r.trim())
      .filter(r => r);

    righe.forEach(riga => {
      if (!testo || riga.toLowerCase().includes(testo)) {
        risultati.push({
          numero: estraiNumero(riga),
          data: doc.data || "—",
          anno: doc.anno_scolastico || "",
          testo: riga,
          organo: organoDoc,
          file: doc.file || ""
        });
      }
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
      <div><strong>Testo:</strong> ${r.testo}</div>
      ${r.file ? `<div><a href="verbali/${r.file}" target="_blank">Apri PDF</a></div>` : ""}
    </div>
  `).join("");
}

btnCerca?.addEventListener("click", eseguiRicerca);
inputOggetto?.addEventListener("keydown", e => {
  if (e.key === "Enter") eseguiRicerca();
});
