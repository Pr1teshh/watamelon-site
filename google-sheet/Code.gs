/**
 * Watamelon contact form → Google Sheet
 *
 * Paste this whole file into Extensions → Apps Script in your Google Sheet,
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * Copy the Web app URL into data-sheet-url on the form in index.html.
 */

const SHEET_NAME = 'Enquiries';
const HEADERS = ['Received', 'Name', 'Email', 'Company', 'Website', 'Services', 'Brief', 'Page'];

function doPost(e) {
  const p = (e && e.parameter) || {};

  // Bots fill the hidden "_honey" field; real visitors never see it.
  if (p._honey) return reply_('ignored');

  try {
    getSheet_().appendRow([
      new Date(),
      clean_(p.name),
      clean_(p.email),
      clean_(p.company),
      clean_(p.website),
      clean_(p.services),
      clean_(p.brief),
      clean_(p.page),
    ]);
  } catch (err) {
    console.error(err);
    return reply_('error: ' + err.message);
  }
  return reply_('ok');
}

// Opening the Web app URL in a browser shows this, so you can check it's live.
function doGet() {
  return reply_('Watamelon form endpoint is running.');
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Keep cells short and stop text that starts with = + - @ being run as a formula.
function clean_(value) {
  let s = String(value || '').trim().slice(0, 5000);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function reply_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}
