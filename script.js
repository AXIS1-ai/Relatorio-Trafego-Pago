const STORAGE_KEY = "axis1-paid-traffic-report";

const form = document.querySelector("#report-form");
const clearButton = document.querySelector("#clear-form");
const pdfButton = document.querySelector("#generate-pdf");

const currencyFields = new Set([
  "metaSpend",
  "metaLinkCpc",
  "metaAllCpc",
  "metaCpm",
  "googleCostPerConversion",
  "googleSpend",
]);

const numericFields = new Set([
  "metaReach",
  "metaImpressions",
  "metaFrequency",
  "metaLinkClicks",
  "metaTotalClicks",
  "googleClicks",
  "googleConversions",
]);

const fields = Array.from(form.elements).filter((element) => element.name);

function parseNumber(value) {
  if (!value) return 0;
  const cleaned = String(value)
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function formatNumber(value, fractionDigits = 0) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value || 0);
}

function formatSmartNumber(value) {
  const hasDecimals = Math.abs(value % 1) > 0.0001;
  return formatNumber(value, hasDecimals ? 2 : 0);
}

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function getData() {
  return fields.reduce((data, field) => {
    data[field.name] = field.value.trim();
    return data;
  }, {});
}

function setText(id, value) {
  const element = document.querySelector(`#${id}`);
  if (element) element.textContent = value;
}

function getTotalClicks(data) {
  const metaLinkClicks = parseNumber(data.metaLinkClicks);
  const metaTotalClicks = parseNumber(data.metaTotalClicks);
  const googleClicks = parseNumber(data.googleClicks);
  return (metaTotalClicks || metaLinkClicks) + googleClicks;
}

function updatePreview() {
  const data = getData();
  const metaSpend = parseNumber(data.metaSpend);
  const googleSpend = parseNumber(data.googleSpend);
  const investment = metaSpend + googleSpend;
  const totalClicks = getTotalClicks(data);
  const conversions = parseNumber(data.googleConversions);
  const averageCpc = totalClicks > 0 ? investment / totalClicks : 0;

  setText("preview-client", data.clientName || "Cliente");
  setText("preview-period", data.reportPeriod || "Período do relatório");
  setText("preview-date", formatDate(data.issueDate));
  setText("preview-responsible", data.responsible || "AXIS 1");

  setText("summary-investment", formatCurrency(investment));
  setText("summary-clicks", formatNumber(totalClicks));
  setText("summary-conversions", formatSmartNumber(conversions));
  setText("summary-cpc", totalClicks > 0 ? formatCurrency(averageCpc) : "--");

  setText(
    "auto-summary",
    `No período analisado, as campanhas geraram ${formatNumber(totalClicks)} cliques, ${formatSmartNumber(
      conversions,
    )} conversões e investimento total de ${formatCurrency(investment)}.`,
  );

  fields.forEach((field) => {
    const output = document.querySelector(`#out-${field.name}`);
    if (!output) return;

    if (field.tagName === "TEXTAREA") {
      output.textContent = field.value.trim() || "Sem observações informadas.";
      return;
    }

    const value = parseNumber(field.value);
    if (currencyFields.has(field.name)) {
      output.textContent = formatCurrency(value);
      return;
    }

    if (numericFields.has(field.name)) {
      output.textContent = field.name === "metaFrequency" ? formatSmartNumber(value) : formatNumber(value);
      return;
    }

    output.textContent = field.value.trim() || "--";
  });

  const analysis = data.axisAnalysis || "Inclua a análise estratégica para consolidar a leitura do desempenho.";
  setText("out-axisAnalysis", analysis);
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getData()));
}

function loadData() {
  const today = new Date().toISOString().slice(0, 10);
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(stored, field.name)) {
      field.value = stored[field.name];
    }
  });

  if (!form.elements.issueDate.value) {
    form.elements.issueDate.value = today;
  }

  if (!form.elements.responsible.value) {
    form.elements.responsible.value = "AXIS 1";
  }
}

function clearForm() {
  if (!confirm("Limpar todos os dados preenchidos?")) return;
  localStorage.removeItem(STORAGE_KEY);
  form.reset();
  form.elements.issueDate.value = new Date().toISOString().slice(0, 10);
  form.elements.responsible.value = "AXIS 1";
  saveData();
  updatePreview();
}

function generatePdf() {
  saveData();
  updatePreview();
  document.title = `Relatório de Tráfego Pago - ${form.elements.clientName.value || "AXIS 1"}`;
  window.print();
}

loadData();
updatePreview();

form.addEventListener("input", () => {
  saveData();
  updatePreview();
});

clearButton.addEventListener("click", clearForm);
pdfButton.addEventListener("click", generatePdf);
