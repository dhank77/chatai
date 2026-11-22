// cPanel "Setup Node.js App" startup file (Application startup file: app.mjs or app.cjs).
// cPanel generates a broken "Hello World" app.mjs when creating an app; this file replaces it.
import('./server.mjs').catch((error) => {
  console.error('[app.mjs] Gagal menjalankan server:', error);
  process.exit(1);
});
