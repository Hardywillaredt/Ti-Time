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

## Response Delivery

GitHub Pages only hosts static files, so it cannot store form submissions by itself. By default, the button opens a prefilled GitHub Issue in this repository:

```js
const GITHUB_ISSUE_URL = "https://github.com/Hardywillaredt/Ti-Time/issues/new";
```

That works without a backend as long as GitHub Issues are enabled. Responses will be visible wherever repo issues are visible.

The public poll does not show a GitHub-labeled response button. An unlinked organizer page at `responses.html` points to the GitHub Issues response inbox. GitHub Pages does not make unlinked pages private, so keep the repo/settings aligned with the privacy level you need.

To route private form posts through a static-form service, configure this value at the top of `script.js`:

```js
const FORM_ENDPOINT = "https://formspree.io/f/your-form-id";
const ORGANIZER_EMAIL = "";
```

Or use the mailto fallback:

```js
const FORM_ENDPOINT = "";
const ORGANIZER_EMAIL = "you@example.com";
```

If none of those values are set, the page copies a formatted response to the visitor's clipboard.
