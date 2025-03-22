import { DefaultSeoProps } from 'next-seo';

const config: DefaultSeoProps = {
  title: 'deveric-nextjs-15-scafold-app',
  description: 'A Next.js application with TypeScript, tRPC, NextAuth, Prisma, MUI (Dark Mode), and more.',
  openGraph: {
    type: 'website',
    locale: 'en_IE',
    url: 'https://developer.ericgitangu.com',
    site_name: 'deveric-nextjs-15-scafold-app',
    images: [
      {
        url: 'https://developer.ericgitangu.com/_next/image?url=%2Ffavicon.png&w=96&q=75',
        width: 800,
        height: 600,
        alt: 'deveric-nextjs-15-scafold-app',
      },
    ],
  },
};

export default config;
