import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 5173, // Mapeado para 5178 no Docker
        watch: {
            usePolling: true
        }
    }
})
