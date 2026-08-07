const CONFIG = window.TI_TIME_CONFIG || {};

const LOCAL_RESPONSE_KEY = "ti-time-local-responses";
const SLOTS = [
  "Saturday, August 29, 2026 at 7:00 AM PST",
  "Saturday, August 29, 2026 at 1:00 PM PST",
  "Sunday, August 30, 2026 at 7:00 AM PST",
  "Sunday, August 30, 2026 at 1:00 PM PST",
];

const sourceEl = document.querySelector("#response-source");
const overviewEl = document.querySelector("#slot-overview");
const tableEl = document.querySelector("#response-table");
const refreshButton = document.querySelector("#refresh-responses");

function normalizeResponse(raw) {
  const availability = Array.isArray(raw.availability)
    ? raw.availability
    : String(raw.availability || "")
        .split("|")
        .map((slot) => slot.trim())
        .filter(Boolean);

  return {
    name: String(raw.name || "Unknown").trim() || "Unknown",
    availability,
    submittedAt: raw.submittedAt || raw.timestamp || "",
  };
}

function localResponses() {
  return JSON.parse(localStorage.getItem(LOCAL_RESPONSE_KEY) || "[]").map(normalizeResponse);
}

function loadJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `tiTimeResponses${Date.now()}`;
    const script = document.createElement("script");
    const separator = url.includes("?") ? "&" : "?";

    window[callbackName] = (payload) => {
      resolve(payload);
      script.remove();
      delete window[callbackName];
    };

    script.onerror = () => {
      reject(new Error("Response endpoint could not be loaded."));
      script.remove();
      delete window[callbackName];
    };

    script.src = `${url}${separator}callback=${callbackName}`;
    document.body.appendChild(script);
  });
}

async function remoteResponses() {
  const endpoint = String(CONFIG.responsesEndpoint || "").trim();
  if (!endpoint) return null;

  if ((CONFIG.responseFormat || "jsonp") === "jsonp") {
    return loadJsonp(endpoint);
  }

  const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Response endpoint returned an error.");
  return response.json();
}

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderOverview(responses) {
  overviewEl.replaceChildren();
  for (const slot of SLOTS) {
    const names = responses
      .filter((response) => response.availability.includes(slot))
      .map((response) => response.name);

    const card = document.createElement("article");
    card.className = "overview-card";

    const heading = document.createElement("h2");
    heading.textContent = slot.replace(", August", " - August");

    const count = document.createElement("strong");
    count.textContent = String(names.length);

    const list = document.createElement("p");
    list.textContent = names.length ? names.join(", ") : "No declarations yet";

    card.append(heading, count, list);
    overviewEl.append(card);
  }
}

function renderTable(responses) {
  tableEl.replaceChildren();

  if (responses.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.textContent = "No availability has been recorded yet.";
    row.append(cell);
    tableEl.append(row);
    return;
  }

  for (const response of responses) {
    const row = document.createElement("tr");
    const name = document.createElement("td");
    const availability = document.createElement("td");
    const submitted = document.createElement("td");

    name.textContent = response.name;
    availability.textContent = response.availability.join(", ");
    submitted.textContent = formatDate(response.submittedAt);

    row.append(name, availability, submitted);
    tableEl.append(row);
  }
}

async function loadResponses() {
  sourceEl.textContent = "Loading council records...";

  try {
    const remote = await remoteResponses();
    const responses = (remote || localResponses()).map(normalizeResponse);
    responses.sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));

    renderOverview(responses);
    renderTable(responses);

    sourceEl.textContent = remote
      ? `${responses.length} response${responses.length === 1 ? "" : "s"} loaded from the configured endpoint.`
      : `${responses.length} local demo response${responses.length === 1 ? "" : "s"} shown. Configure responsesEndpoint for shared admin records.`;
  } catch (error) {
    const responses = localResponses();
    renderOverview(responses);
    renderTable(responses);
    sourceEl.textContent = `${error.message} Showing ${responses.length} local demo response${
      responses.length === 1 ? "" : "s"
    }.`;
  }
}

refreshButton.addEventListener("click", loadResponses);
loadResponses();
