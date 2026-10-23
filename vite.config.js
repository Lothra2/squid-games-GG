import { defineConfig } from 'vite';

// base relativa: el juego funciona igual en Netlify, en una subcarpeta o abierto desde un link de artifact
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000, assetsInlineLimit: 0 },
});
