import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/auth/',
        '/teacher/',
      ],
    },
    sitemap: 'https://fundacionsanmateosoacha.edu.co/sitemap.xml',
  };
}
