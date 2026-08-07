#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const SLOTS = [
  "Saturday, August 29, 2026 at 7:00 AM PST",
  "Saturday, August 29, 2026 at 1:00 PM PST",
  "Sunday, August 30, 2026 at 7:00 AM PST",
  "Sunday, August 30, 2026 at 1:00 PM PST",
];

const args = process.argv.slice(2);
const readOnly = args.includes("--read-only");
const nameArg = valueAfter("--name");
const slotArg = valueAfter("--slot");
const testName =
  nameArg || `Codex backend test ${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}`;
const testSlot = slotArg || SLOTS[0];

function valueAfter(flag) {
  const index = args.indexOf(flag);
  if (index === -1) return "";
  return args[index + 1] || "";
}

function maskUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const deployment = parts[2] || "";
    const maskedDeployment = deployment
      ? `${deployment.slice(0, 8)}...${deployment.slice(-4)}`
      : "configured";
    return `${url.origin}/macros/s/${maskedDeployment}/exec`;
  } catch {
    return "configured endpoint";
  }
}

async function loadConfig() {
  const source = await readFile(new URL("../config.js", import.meta.url), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: "config.js", timeout: 1000 });
  return sandbox.window.TI_TIME_CONFIG || {};
}

function requireEndpoint(config, key) {
  const endpoint = String(config[key] || "").trim();
  if (!endpoint) {
    throw new Error(`Missing ${key} in config.js`);
  }
  return endpoint;
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 240)}`);
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function submitResponse(endpoint, response) {
  await fetchText(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(response),
  });
}

async function loadResponses(endpoint, responseFormat) {
  if ((responseFormat || "jsonp") === "jsonp") {
    const callback = `tiTimeTest${Date.now()}`;
    const url = new URL(endpoint);
    url.searchParams.set("callback", callback);
    const text = await fetchText(url);
    const escapedCallback = callback.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = text.match(new RegExp(`^\\s*${escapedCallback}\\((.*)\\);?\\s*$`, "s"));

    if (!match) {
      throw new Error("Response endpoint did not return the expected JSONP payload.");
    }

    return JSON.parse(match[1]);
  }

  return JSON.parse(await fetchText(endpoint));
}

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

function summarize(responses) {
  return SLOTS.map((slot) => ({
    slot,
    count: responses.filter((response) => response.availability.includes(slot)).length,
  }));
}

async function waitForResponse(endpoint, responseFormat, expectedName, expectedSlot) {
  let responses = [];

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    responses = (await loadResponses(endpoint, responseFormat)).map(normalizeResponse);
    const match = responses.find(
      (response) =>
        response.name === expectedName && response.availability.includes(expectedSlot),
    );

    if (match) {
      return { attempt, match, responses };
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return { attempt: 6, match: null, responses };
}

async function main() {
  if (!SLOTS.includes(testSlot)) {
    throw new Error(`Unknown slot "${testSlot}". Use one of: ${SLOTS.join(" | ")}`);
  }

  const config = await loadConfig();
  const submissionEndpoint = requireEndpoint(config, "submissionEndpoint");
  const responsesEndpoint = requireEndpoint(config, "responsesEndpoint");

  console.log(`Using endpoint: ${maskUrl(submissionEndpoint)}`);

  if (readOnly) {
    const responses = (await loadResponses(responsesEndpoint, config.responseFormat)).map(
      normalizeResponse,
    );
    console.log(`Loaded ${responses.length} response${responses.length === 1 ? "" : "s"}.`);
    for (const item of summarize(responses)) {
      console.log(`${item.count} - ${item.slot}`);
    }
    return;
  }

  const response = {
    name: testName,
    availability: [testSlot],
    submittedAt: new Date().toISOString(),
  };

  await submitResponse(submissionEndpoint, response);
  const result = await waitForResponse(
    responsesEndpoint,
    config.responseFormat,
    testName,
    testSlot,
  );

  if (!result.match) {
    throw new Error(
      `Submitted "${testName}", but it was not found in the response feed after retrying.`,
    );
  }

  console.log(`Submitted and confirmed "${testName}" after ${result.attempt} read attempt(s).`);
  for (const item of summarize(result.responses)) {
    console.log(`${item.count} - ${item.slot}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
