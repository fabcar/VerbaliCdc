let documents = [];

// Carico i dati dal data.json
fetch("data.json")
  .then(res => res.json())
  .then(data => {
    documents = data || [];
    popolaAnniScolastici();
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

  // Filtra per anno scolastico
  let filtrati = documents;
  if (annoSelezionato) {
    filtrati = filtrati.filter(d => d.anno_scolastico === annoSelezionato);
  }

  let risultati = [];

  filtrati.forEach(doc => {
    const delibereText = doc.delibere || "";
    if (!delibereText) return;

    // Le righe delle delibere sono separate da " | "
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
