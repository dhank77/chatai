// cPanel "Setup Node.js App" startup file (Application startup file: app.cjs).
// Passenger loads startup files with require(), so this CommonJS shim loads the ESM server.
import('./server.mjs').catch((error) => {
  console.error('[app.cjs] Gagal menjalankan server:', error);
  process.exit(1);
});
