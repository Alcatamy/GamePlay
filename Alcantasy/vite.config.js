import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        host: true, // Allow access from mobile/network
        port: 5173,
        proxy: {
            '/api': {
                target: 'https://api-fantasy.llt-services.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '/api'),
                headers: {
                    'Origin': 'https://fantasy.laliga.com'
                }
            },
            '/stats': {
                target: 'https://stats-api-fantasy.llt-services.com',
                changeOrigin: true,
                headers: {
                    'Origin': 'https://fantasy.laliga.com'
                }
            }
        }
    },
    build: {
        outDir: 'dist'
    }
})
