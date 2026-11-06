// A user-initiated local download. No upload, API call, or project persistence.
export function saveSampleExport({ filename, content }, browser = window) {
  const url = browser.URL.createObjectURL(new browser.Blob([content], { type: 'text/plain;charset=utf-8' }));
  const link = browser.document.createElement('a');
  link.href = url;
  link.download = filename;
  browser.document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    browser.setTimeout(() => browser.URL.revokeObjectURL(url), 1000);
  }
}
