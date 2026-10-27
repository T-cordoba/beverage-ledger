module.exports = {
  apiKey: process.env.APPLITOOLS_API_KEY,
  // Free tier: one visual checkpoint at a time.
  testConcurrency: 1,
  batchName: 'Beverage Ledger — existencias e integridad de datos',
  browser: [{ width: 1280, height: 800, name: 'chrome' }],
};
