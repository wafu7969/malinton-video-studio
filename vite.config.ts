import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    react(),
    dts({ include: ['src'], rollupTypes: false, insertTypesEntry: true }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'MalintonVideoStudio',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        exports: 'named',
        assetFileNames: (assetInfo) =>
          assetInfo.name === 'style.css' ? 'style.css' : '[name][extname]',
      },
    },
    cssCodeSplit: false,
    sourcemap: false,
    emptyOutDir: true,
  },
})
