import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5177,
        proxy: {
            '/api': {
                target: 'http://backend:5003',
                changeOrigin: true,
                secure: false,
            }
        },
        watch: {
            usePolling: true
        }
    },
    build: {
        chunkSizeWarningLimit: 1600
    }
})
