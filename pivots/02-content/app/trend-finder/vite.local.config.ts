// Local-only: same as vite.config.ts but proxies /api to this worktree's own API on 8790.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], server: { proxy: { '/api': 'http://localhost:8790' } } })
