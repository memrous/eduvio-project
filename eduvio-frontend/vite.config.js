import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

// Only the version is exposed to the client, not the whole package.json
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.APP_VERSION': JSON.stringify(version),
  },
  server: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: true,
    proxy: {
      "/storage": {
        target: "http://localhost:80",
        changeOrigin: true,
      },
    },
    watch: {
      usePolling: true,
    },
  },
  root: new URL('.', import.meta.url).pathname,
})
