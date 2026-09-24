import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Dev server for the studio host.
 *
 * `@remotion/player` ships ESM that references browser globals, so it has to be
 * pre-bundled rather than externalised.
 */
export default defineConfig({
  plugins: [react()],
  server: { port: 3100 },
  optimizeDeps: {
    include: ['react', 'react-dom/client', 'remotion', '@remotion/player'],
  },
})
