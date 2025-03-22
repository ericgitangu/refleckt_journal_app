'use client';

import { Box, Typography, Button, Link as MuiLink } from '@mui/material';
import { useRouter } from 'next/navigation';
import { GitHub, Language, AutoFixHigh } from '@mui/icons-material';
import ThemeToggle from '@/components/ThemeToggle'; // Import the ThemeToggle component

export default function HomePage() {
  const router = useRouter();

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      textAlign: 'center',
      p: 4,
      color: '#fff',
    }}>
      <Typography variant="h4" gutterBottom>
        Welcome to <strong>deveric-nextjs-15-scafold-app</strong>
      </Typography>
      <Typography variant="body1" sx={{ maxWidth: '480px' }}>
        This project was <strong>automated</strong> using a script by{' '}
        <MuiLink href="https://developer.ericgitangu.com" target="_blank" rel="noopener noreferrer">
          Eric Gitangu
        </MuiLink>.
        <br />
        Check out his GitHub:{' '}
        <MuiLink href="https://github.com/ericgitangu" target="_blank" rel="noopener noreferrer">
          @ericgitangu
        </MuiLink>.
      </Typography>

      <Typography variant="body1">
        The app includes:
      </Typography>
      <ul style={{ textAlign: 'left' }}>
        <li>✅ Next.js 15 + TypeScript + ESLint + Tailwind CSS</li>
        <li>✅ tRPC &amp; React Query integration</li>
        <li>✅ NextAuth (Google OAuth) for authentication</li>
        <li>✅ Prisma (w/ Google Auth fields)</li>
        <li>✅ Material UI (dark mode default)</li>
        <li>✅ Separate server layout & client hooking logic</li>
      </ul>

      <Typography variant="body2">
        Get started by editing <strong>app/page.tsx</strong>. Save and see your changes instantly.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AutoFixHigh />}
          onClick={() => router.push('/api/auth/signin')}
        >
          Auth Test
        </Button>
        <Button
          variant="contained"
          startIcon={<GitHub />}
          href="https://github.com/ericgitangu"
          target="_blank"
        >
          GitHub Repo
        </Button>
        <Button
          variant="contained"
          startIcon={<Language />}
          href="https://nextjs.org/"
          target="_blank"
        >
          Next.js Docs
        </Button>
      </Box>

      <Typography variant="body2" sx={{ mt: 4 }}>
        Script documentation {' '}
        <MuiLink href="https://github.com/ericgitangu/deveric-nextjs-15-scafold-app" target="_blank" rel="noopener noreferrer">
          README
        </MuiLink>{' '}
        {' '}
        |{' '}
        <MuiLink href="https://developer.ericgitangu.com" target="_blank" rel="noopener noreferrer">
          Author
        </MuiLink>
        {' '}
        |{' '}
        <MuiLink href="https://github.com/ericgitangu" target="_blank" rel="noopener noreferrer">
          GitHub
        </MuiLink>
        {' '}
        |{' '}
        <MuiLink href="https://linkedin.com/in/ericgitangu" target="_blank" rel="noopener noreferrer">
          LinkedIn
        </MuiLink>
      </Typography>
    </Box>
  );
}
