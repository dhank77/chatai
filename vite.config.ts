import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  // Make .env values (SUPERVIBECODE_API_KEY, SUPABASE_*, JWT_SECRET, ...) available to
  // server code via process.env in dev/build. Never sent to the browser: only VITE_* vars
  // are inlined into client bundles. Real environment variables take precedence.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
  },
  publicDir: 'public',
  };
});
