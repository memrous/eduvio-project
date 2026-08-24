import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
