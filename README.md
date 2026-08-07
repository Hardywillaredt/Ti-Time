# TI4 Time Poll

Static GitHub Pages scheduling poll for a Twilight Imperium IV game on:

- Saturday, August 29, 2026 at 7:00 AM PST
- Saturday, August 29, 2026 at 1:00 PM PST
- Sunday, August 30, 2026 at 7:00 AM PST
- Sunday, August 30, 2026 at 1:00 PM PST

## Publish on GitHub Pages

1. Push this repository to GitHub.
2. In the repo, open **Settings > Pages**.
3. Set the source to the root of the `master` branch.
4. Save and use the published Pages URL.

## Submission Flow

The public poll submits without opening GitHub. After a valid submission, visitors land on `thanks.html`.

GitHub Pages cannot store submissions by itself. To collect real shared responses, configure the endpoints in `config.js`.

When a visitor returns from the same browser, the form reloads their last submitted name and start times so they can adjust and submit again. The Google Sheet keeps every submission row, and the admin overview uses the latest submission for each name as the current declaration.

For local-only testing before the backend is ready, temporarily set `localDemoMode` to `true`. Do not use that mode for the invite link, because each visitor's response would stay in that visitor's browser.

## Google Sheets Backend

The repo includes a tiny Google Apps Script backend at `backend/google-apps-script/Code.gs`.

1. Create a Google Sheet for the poll.
2. Open **Extensions > Apps Script**.
3. Replace the default script with `backend/google-apps-script/Code.gs`.
4. Deploy as a web app.
5. Set access to **Anyone**.
6. Copy the web app URL.
7. Paste it into `config.js` for both endpoints:

```js
window.TI_TIME_CONFIG = {
  submissionEndpoint: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",
  responsesEndpoint: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",
  responseFormat: "jsonp",
  submitMode: "no-cors",
  localDemoMode: false,
};
```

The admin schedule overview lives at `responses.html`. It is not linked from the public poll, but GitHub Pages cannot make unlinked pages private.

## Test the Backend

After `config.js` has the deployed Apps Script URL, run:

```bash
node scripts/test-sheets-backend.mjs
```

The test writes one row named `Codex backend test ...`, then reads the response feed and confirms that row appears in the schedule data. To inspect counts without writing a new row:

```bash
node scripts/test-sheets-backend.mjs --read-only
```
