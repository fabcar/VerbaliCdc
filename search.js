let idx;
let documents = [];

fetch("data.json")
  .then(res => res.json())
  .then(data => {
    documents = data;

    idx = lunr(function () {
      this.ref("id");
      this.field("delibere");
      this.field("data");
      this.field("anno_scolastico");
      this.field("file");

      documents.forEach(doc => this.add(doc));
    });
  });

const searchInput = document.getElementById("search");
const resultsDiv = document.getElementById("results");

searchInput.addEventListener("input", function () {
  const query = this.value.trim();
  if (!query || !idx) {
    resultsDiv.innerHTML = "";
    return;
  }

  let results;
  try {
    results = idx.search(query);
  } catch (e) {
    const lower = query.toLowerCase();
    results = documents
      .filter(d =>
        (d.delibere || "").toLowerCase().includes(lower) ||
        (d.data || "").includes(query) ||
        (d.anno_scolastico || "").includes(query) ||
        (d.file || "").toLowerCase().includes(lower)
      )
      .map(d => ({ ref: d.id }));
  }

  if (!results.length) {
    resultsDiv.innerHTML = "<p>Nessun risultato trovato.</p>";
    return;
  }

  let html = "";

  results.forEach(r => {
    const doc = documents.find(d => d.id === r.ref);
    if (!doc) return;

    html += `
      <div class="result-card">
        <div class="result-header">
          <div class="result-file">${doc.file}</div>
          <div class="result-meta">
            ${doc.data ? `Data: ${doc.data}` : ""}
            ${doc.anno_scolastico ? ` – A.S. ${doc.anno_scolastico}` : ""}
          </div>
        </div>
        <div class="result-delibere">
          ${doc.delibere
            ? `<strong>Delibere:</strong> ${doc.delibere}`
            : "<em>Nessuna delibera rilevata nel testo del verbale.</em>"}
        </div>
        <div class="result-actions">
          <a href="verbali/${doc.file}" download>Scarica verbale</a>
        </div>
      </div>
    `;
  });

  resultsDiv.innerHTML = html;
});
