import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    allowedHosts: ['mockmate-5.onrender.com'], // ✅ Allow Render host
  },
});
