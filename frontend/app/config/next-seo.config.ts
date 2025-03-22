import { DefaultSeoProps } from 'next-seo';

const config: DefaultSeoProps = {
  title: 'Reflekt - A Personal Journaling App',
  description: 'Reflect on your thoughts with AI-powered insights',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://reflekt.app',
    siteName: 'Reflekt',
    images: [
      {
        url: 'https://reflekt.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Reflekt - A Personal Journaling App',
      },
    ],
  },
  additionalLinkTags: [
    {
      rel: 'manifest',
      href: '/manifest.json'
    }
  ],
  additionalMetaTags: [
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1'
    },
    {
      name: 'description',
      content: 'Reflect on your thoughts with AI-powered insights'
    },
    {
      name: 'keywords',
      content: 'journaling, reflection, AI, personal development, journaling app'
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
