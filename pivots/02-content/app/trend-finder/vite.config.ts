import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Live search goes through the local API (npm run api) so the Apify token stays off the browser.
  // TF_API points a preview at another backend, e.g. TF_API=http://127.0.0.1:8797 for the zero-cost demo one.
  server: {
    proxy: { '/api': process.env.TF_API ?? 'http://localhost:8787' },
  },
})
