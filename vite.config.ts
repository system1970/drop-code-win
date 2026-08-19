import { defineConfig } from 'vite';

// Vite builds the renderer (browser) bundle. The main process is compiled
// separately with `tsc -p tsconfig.main.json` (see the `compile` script).
export default defineConfig({
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../out/renderer',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  clearScreen: false,
});
