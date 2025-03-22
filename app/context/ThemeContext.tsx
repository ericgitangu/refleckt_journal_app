'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

interface ThemeContextType {
  toggleColorMode: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  toggleColorMode: () => {},
});

export function CustomThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Attempt to detect user preference
    const userPrefDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setMode(userPrefDark ? 'dark' : 'dark'); // force default dark
  }, []);

  const toggleColorMode = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const theme = React.useMemo(() =>
    createTheme({
      palette: {
        mode,
        primary: { main: '#90caf9' },
        secondary: { main: '#f48fb1' },
        background: {
          default: mode === 'dark' ? '#121212' : '#f5f5f5',
          paper: mode === 'dark' ? '#1e1e1e' : '#ffffff'
        },
      },
      typography: {
        fontFamily: 'Montserrat, sans-serif',
        allVariants: { color: mode === 'dark' ? '#fff' : '#000' }
      }
    }), [mode]);

  return (
    <ThemeContext.Provider value={{ toggleColorMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
