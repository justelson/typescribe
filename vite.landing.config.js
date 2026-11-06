import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const landingRoot = resolve(projectRoot, 'landing');

function routeHtmlFallback() {
  const routes = new Set(['/benchmark/', '/downloads/']);
  return {
    name: 'typescribe-route-html-fallback',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        const pathname = (request.url || '').split('?')[0];
        if (routes.has(pathname)) request.url = '/index.html';
        next();
      });
    },
  };
}

export default defineConfig({
  root: landingRoot,
  base: '/',
  publicDir: resolve(landingRoot, 'public'),
  plugins: [routeHtmlFallback(), react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 8780,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 8780,
    strictPort: true,
  },
  build: {
    outDir: resolve(projectRoot, 'dist-landing'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(landingRoot, 'index.html'),
    },
  },
});
