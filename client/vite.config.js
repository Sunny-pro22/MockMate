import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
   
    allowedHosts: ['mockmate-5.onrender.com'], 

    host: '0.0.0.0',
    port: process.env.PORT || 5173,
  },
  plugins: [react()],
  base: './',
});
