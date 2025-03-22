import { DefaultSeoProps } from 'next-seo';

const config: DefaultSeoProps = {
  title: 'deveric-nextjs-15-scafold-app',
  description: 'A Next.js 15 (App Router) project with TypeScript, dark-mode Material UI, tRPC, NextAuth, and Prisma.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://deveric-nextjs-15-scafold-app.vercel.app',
    siteName: 'deveric-nextjs-15-scafold-app',
    images: [
      {
        url: 'https://deveric-nextjs-15-scafold-app.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'deveric-nextjs-15-scafold-app',
      },
    ],
  },
  additionalMetaTags: [
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1'
    },
    {
      name: 'description',
      content: "Deveric's scafold Next.js application with TypeScript, tRPC, NextAuth, Prisma, MUI (Dark Mode), and more."
    },
    {
      name: 'keywords',
      content: 'Next.js, TypeScript, tRPC, NextAuth, Prisma, MUI, Dark Mode, Next.js 15, Next.js 15 Scafold, Next.js 15 Scafold App, Next.js 15 Scafold App by Eric Gitangu'
    },
    {
      name: 'author',
      content: 'Eric Gitangu'
    },
    {
      name: 'robots',
      content: 'index, follow'
    },
    {
      name: 'googlebot',
      content: 'index, follow'
    },
    {
      name: 'google-site-verification',
      content: 'YOUR_GOOGLE_SITE_VERIFICATION_CODE'
    },
    {
      name: 'msvalidate.01',
      content: 'YOUR_BING_VERIFICATION_CODE'
    },
    {
      name: 'yandex-verification',
      content: 'YOUR_YANDEX_VERIFICATION_CODE'
    },
    {
      name: 'alexaVerifyID',
      content: 'YOUR_ALEXA_VERIFY_ID'
    }
  ]
};

export default config;
