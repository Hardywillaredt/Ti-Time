const CONFIG = window.TI_TIME_CONFIG || {};

const form = document.querySelector("#availability-form");
const statusEl = document.querySelector("#form-status");
const button = document.querySelector("#submit-button");
const label = document.querySelector("#submit-label");

const LOCAL_RESPONSE_KEY = "ti-time-local-responses";
const LAST_RESPONSE_KEY = "ti-time-last-response";

function setStatus(message, tone = "") {
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

function selectedSlots() {
  return [...form.querySelectorAll('input[name="availability"]:checked')].map(
    (input) => input.value,
  );
}

function buildResponse() {
  const data = new FormData(form);
  return {
    name: String(data.get("name") || "").trim(),
    availability: selectedSlots(),
    submittedAt: new Date().toISOString(),
  };
}

function saveLocalResponse(response) {
  const existing = JSON.parse(localStorage.getItem(LOCAL_RESPONSE_KEY) || "[]");
  existing.push(response);
  localStorage.setItem(LOCAL_RESPONSE_KEY, JSON.stringify(existing));
}

async function submitResponse(response) {
  const endpoint = String(CONFIG.submissionEndpoint || "").trim();

  if (!endpoint) {
    if (CONFIG.localDemoMode) {
      saveLocalResponse(response);
      return;
    }

    throw new Error("Submission endpoint is not configured yet.");
  }

  const mode = CONFIG.submitMode || "no-cors";
  const request =
    mode === "cors"
      ? {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(response),
        }
      : {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify(response),
        };

  const result = await fetch(endpoint, request);
  if (mode === "cors" && !result.ok) {
    throw new Error("Submission could not be recorded.");
  }
}

function goToThanks(response) {
  sessionStorage.setItem(LAST_RESPONSE_KEY, JSON.stringify(response));
  const name = encodeURIComponent(response.name);
  window.location.href = `thanks.html?name=${name}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("");

  if (!form.reportValidity()) {
    return;
  }

  const response = buildResponse();
  if (response.availability.length === 0) {
    setStatus("Pick at least one start time.", "error");
    return;
  }

  button.disabled = true;
  label.textContent = "Submitting...";

  try {
    await submitResponse(response);
    goToThanks(response);
  } catch (error) {
    setStatus(error.message || "Response could not be recorded.", "error");
    button.disabled = false;
    label.textContent = "Submit Availability";
  }
});
