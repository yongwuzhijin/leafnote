import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  root: resolve('src/renderer'),
  base: './',
  build: {
    outDir: resolve('dist/renderer'),
    emptyOutDir: true
  },
  server: {
    fs: {
      allow: [resolve('.')]
    }
  }
})
