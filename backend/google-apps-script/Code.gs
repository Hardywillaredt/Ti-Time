const SHEET_NAME = 'Responses';
const SLOTS = [
  'Saturday, August 29, 2026 at 7:00 AM PST',
  'Saturday, August 29, 2026 at 1:00 PM PST',
  'Sunday, August 30, 2026 at 7:00 AM PST',
  'Sunday, August 30, 2026 at 1:00 PM PST',
];

function sheet() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const existing = book.getSheetByName(SHEET_NAME);
  const target = existing || book.insertSheet(SHEET_NAME);

  if (target.getLastRow() === 0) {
    target.appendRow(['Submitted At', 'Name'].concat(SLOTS));
  }

  return target;
}

function doPost(event) {
  const payload = JSON.parse(event.postData.contents || '{}');
  const availability = Array.isArray(payload.availability) ? payload.availability : [];
  const row = [
    payload.submittedAt || new Date().toISOString(),
    payload.name || '',
  ].concat(SLOTS.map((slot) => (availability.indexOf(slot) !== -1 ? 'Yes' : '')));

  sheet().appendRow(row);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(event) {
  const values = sheet().getDataRange().getValues();
  const responses = values.slice(1).map((row) => ({
    submittedAt: row[0],
    name: row[1],
    availability: SLOTS.filter((slot, index) => row[index + 2] === 'Yes'),
  }));

  const json = JSON.stringify(responses);
  const callback = event.parameter.callback;

  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
