
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This allows process.env.API_KEY to work in the browser using Vercel's env vars
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});
