import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://lignumvitae.com.mx',
  redirects: { '/about': '/nosotros', '/contact': '/contacto', '/privacy': '/privacidad' },
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // El servidor standalone toma PORT del entorno en tiempo de ejecución.
  server: { host: '0.0.0.0', port: 4321 },
  vite: { plugins: [tailwindcss()] },
});
