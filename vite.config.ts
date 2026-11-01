import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

function sanitizePublicHttpUrl(raw?: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed || trimmed.includes('MY_APP_URL') || trimmed.includes('YOUR_')) {
    return '';
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return '';
    }
    if (parsed.username || parsed.password) {
      return '';
    }
    return parsed.origin + parsed.pathname.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const safeApiBaseUrl = sanitizePublicHttpUrl(env.VITE_API_BASE_URL);
  const safeAppUrl = safeApiBaseUrl || sanitizePublicHttpUrl(env.APP_URL);

  return {
    base: './',
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(safeApiBaseUrl),
      'import.meta.env.VITE_APP_URL': JSON.stringify(safeAppUrl),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});


