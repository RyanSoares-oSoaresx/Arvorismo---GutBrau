import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GutBrau Escalas',
    short_name: 'GutBrau',
    description: 'Sistema de gestão e consulta de escalas de trabalho da Cervejaria GutBrau.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fbfaf6',
    theme_color: '#0a2a15',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
