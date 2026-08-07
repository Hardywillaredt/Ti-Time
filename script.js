const FORM_ENDPOINT = "";
const ORGANIZER_EMAIL = "";
const GITHUB_ISSUE_URL = "https://github.com/Hardywillaredt/Ti-Time/issues/new";

const form = document.querySelector("#availability-form");
const statusEl = document.querySelector("#form-status");
const button = document.querySelector("#submit-button");
const label = document.querySelector("#submit-label");
const icon = document.querySelector("#submit-icon");

function deliveryMode() {
  if (FORM_ENDPOINT) return "endpoint";
  if (ORGANIZER_EMAIL) return "email";
  if (GITHUB_ISSUE_URL) return "github";
  return "copy";
}

function setStatus(message, tone = "") {
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

function selectedSlots() {
  return [...form.querySelectorAll('input[name="availability"]:checked')].map(
    (input) => input.value,
  );
}

function responseSummary() {
  const data = new FormData(form);
  const slots = selectedSlots();

  return [
    "TI4 availability poll response",
    "",
    `Name: ${data.get("name")}`,
    `Contact: ${data.get("contact")}`,
    "",
    "Available start times:",
    ...slots.map((slot) => `- ${slot}`),
  ].join("\n");
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const scratch = document.createElement("textarea");
  scratch.value = text;
  scratch.setAttribute("readonly", "");
  scratch.style.position = "fixed";
  scratch.style.left = "-9999px";
  document.body.appendChild(scratch);
  scratch.select();
  document.execCommand("copy");
  scratch.remove();
}

async function submitToEndpoint() {
  const payload = new FormData(form);
  payload.set("availability", selectedSlots().join(", "));
  payload.set("summary", responseSummary());

  const response = await fetch(FORM_ENDPOINT, {
    method: "POST",
    body: payload,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Submission failed.");
  }
}

function openEmail(summary) {
  const subject = encodeURIComponent("TI4 availability poll response");
  const body = encodeURIComponent(summary);
  window.location.href = `mailto:${ORGANIZER_EMAIL}?subject=${subject}&body=${body}`;
}

function openGitHubIssue(summary) {
  const data = new FormData(form);
  const player = data.get("name") || "Player";
  const title = encodeURIComponent(`TI4 availability: ${player}`);
  const body = encodeURIComponent(summary);
  window.location.href = `${GITHUB_ISSUE_URL}?title=${title}&body=${body}`;
}

function configureButton() {
  const mode = deliveryMode();
  if (mode === "endpoint") {
    label.textContent = "Submit Availability";
    icon.textContent = ">";
  } else if (mode === "email") {
    label.textContent = "Submit Availability";
    icon.textContent = "@";
  } else if (mode === "github") {
    label.textContent = "Submit Availability";
    icon.textContent = ">";
  } else {
    label.textContent = "Copy response";
    icon.textContent = "#";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("");

  const slots = selectedSlots();
  if (slots.length === 0) {
    setStatus("Pick at least one start time.", "error");
    return;
  }

  if (!form.reportValidity()) {
    return;
  }

  const mode = deliveryMode();
  const summary = responseSummary();
  button.disabled = true;

  try {
    if (mode === "endpoint") {
      await submitToEndpoint();
      form.reset();
      setStatus("Response sent.", "success");
    } else if (mode === "email") {
      openEmail(summary);
      setStatus("Email draft opened.", "success");
    } else if (mode === "github") {
      openGitHubIssue(summary);
      setStatus("Response form opened.", "success");
    } else {
      await copyText(summary);
      setStatus("Response copied.", "success");
    }
  } catch (error) {
    setStatus(error.message || "Response could not be sent.", "error");
  } finally {
    button.disabled = false;
  }
});

configureButton();
