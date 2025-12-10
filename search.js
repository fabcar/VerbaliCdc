/*******************************
 *  CONFIG
 *******************************/
const CLASSROOM_COURSE_ID = "ODc3MzUyNjIzMDNa";  // corso Collegio
// Metti qui il tuo OAuth Client ID creato in Google Cloud Console
const GOOGLE_CLIENT_ID = "303013464592-ufq9q4uk8m24u6avvhcp2kuupq9t0ldb.apps.googleusercontent.com";
const GOOGLE_API_KEY = ""; // opzionale se lavori solo con token auth

// Scopes per Classroom + Drive
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly",
  "https://www.googleapis.com/auth/drive.readonly"
].join(" ");

/*******************************
 *  AUTENTICAZIONE GOOGLE (Firebase)
 *******************************/

const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const btnLoginGoogle = document.getElementById("login-google");
const btnLogout = document.getElementById("logout");
const loginError = document.getElementById("login-error");

const auth = firebase.auth();

// Stato utente Firebase
auth.onAuthStateChanged(user => {
  if (user) {
    loginSection.style.display = "none";
    appSection.style.display = "block";
    // dopo login Firebase, inizializziamo gapi
    initGapiClient_();
  } else {
    appSection.style.display = "none";
    loginSection.style.display = "block";
  }
});

// LOGIN (solo Firebase, per ora)
btnLoginGoogle?.addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  // IMPORTANTISSIMO: chiediamo scopes extra di Classroom/Drive
  GOOGLE_SCOPES.split(" ").forEach(scope => provider.addScope(scope));

  auth.signInWithPopup(provider)
    .then(() => {
      loginError.textContent = "";
    })
    .catch(err => {
      console.error(err);
      loginError.textContent = "Errore: " + err.message;
    });
});

btnLogout?.addEventListener("click", () => auth.signOut());

/*******************************
 *  INTEGRAZIONE GAPI (Classroom / Drive)
 *******************************/

let gapiInited = false;
let gapiAuthed = false;
let classroomVerbali = []; // qui memorizziamo i verbali trovati in Classroom

function initGapiClient_() {
  if (gapiInited) return;

  gapi.load("client:auth2", async () => {
    try {
      await gapi.client.init({
        
        clientId: GOOGLE_CLIENT_ID,
        discoveryDocs: [
          "https://classroom.googleapis.com/$discovery/rest?version=v1",
          "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
        ],
        scope: GOOGLE_SCOPES
      });

      gapiInited = true;

      // Portiamo dentro a gapi l'utente Firebase già loggato:
      await ensureGapiSignedIn_();
      await caricaVerbaliDaClassroom_();
    } catch (e) {
      console.error("Errore init gapi:", e);
    }
  });
}

async function ensureGapiSignedIn_() {
  const auth2 = gapi.auth2.getAuthInstance();
  if (!auth2) return;

  if (!auth2.isSignedIn.get()) {
    await auth2.signIn();
  }
  gapiAuthed = auth2.isSignedIn.get();
}

async function caricaVerbaliDaClassroom_() {
  if (!gapiAuthed) return;

  try {
    // Leggiamo i materiali del corso (courseWorkMaterials)
    const res = await gapi.client.classroom.courses.courseWorkMaterials.list({
      courseId: CLASSROOM_COURSE_ID
    });

    const materials = res.result.courseWorkMaterial || [];
    classroomVerbali = [];

    for (const m of materials) {
      // cerchiamo allegati Drive
      const driveAttachments = (m.materials || [])
        .flatMap(mat => mat.driveFile ? [mat.driveFile] : []);

      for (const d of driveAttachments) {
        const file = d.driveFile;
        if (!file) continue;

        // possiamo filtrare per tipo PDF, se necessario, usando Drive API
        classroomVerbali.push({
          titolo: m.title || file.title || file.id,
          fileId: file.id,
          alternateLink: file.alternateLink,
          // se la data non è nei dati, puoi inferirla dal titolo
          data: m.updateTime || m.creationTime || "",
          organo: "collegio"
        });
      }
    }

    console.log("Verbali da Classroom:", classroomVerbali);
    // A questo punto puoi usarli per popolare l'indice o trasformarli nel "data.json" interno
  } catch (e) {
    console.error("Errore nel recuperare materiali Classroom:", e);
  }
}

/*******************************
 *  RICERCA DELIBERE (come prima)
 *******************************/

let documents = [];

const selectAnno = document.getElementById("anno");
const selectOrgano = document.getElementById("organo");
const inputOggetto = document.getElementById("oggetto");
const btnCerca = document.getElementById("cerca");
const resultsDiv = document.getElementById("results");

// Carica data.json locale (finché non usiamo SOLO Classroom)
fetch("https://script.google.com/a/macros/itisgrassi.edu.it/s/AKfycbzLElj5gdM7mSIGX24aOmWkuCRIQ2fnB2dPx-I7jOlMuMdSKGWm0lHc-WiqarsXgJTO7g/exec")
  .then(res => res.json())
  .then(data => {
    documents = data || [];
    popolaAnni();
  });

function popolaAnni() {
  const anni = new Set(documents.map(d => d.anno_scolastico).filter(Boolean));
  [...anni].sort().forEach(as => {
    const opt = document.createElement("option");
    opt.value = as;
    opt.textContent = as;
    selectAnno.appendChild(opt);
  });
}

function estraiNumero(linea) {
  const m = linea.match(/Delibera\s+n[°º]?\s*[_\s]*([0-9]+)/i);
  return (m && m[1]) ? m[1] : "—";
}

function eseguiRicerca() {
  const annoSel = selectAnno.value;
  const organoSel = selectOrgano ? selectOrgano.value : "";
  const testo = inputOggetto.value.toLowerCase().trim();

  let risultati = [];

  documents.forEach(doc => {
    if (annoSel && doc.anno_scolastico !== annoSel) return;

    const organoDoc = doc.organo || "collegio";
    if (organoSel) {
      if (organoSel === "collegio" && organoDoc !== "collegio") return;
      if (organoSel === "consiglio" && organoDoc !== "consiglio") return;
    }

    const righe = (doc.delibere || "").split("|").map(r => r.trim()).filter(r => r);

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
