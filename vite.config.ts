
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  define: {
    // This allows process.env.API_KEY to work in the browser using Vercel's env vars
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});
