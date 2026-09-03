import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.VITE_PORT) || 5173

  return {
    plugins: [react()],
    server: { port, strictPort: true },
    preview: { port, strictPort: true },
  }
})
