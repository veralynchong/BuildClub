import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Local demo only: no backend, so the app falls back to sample data.
export default defineConfig({ plugins: [react()], server: { port: 5221, strictPort: true, proxy: { '/api': 'http://127.0.0.1:9' } } })
