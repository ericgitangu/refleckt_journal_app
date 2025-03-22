'use client';

import React, { useContext, useState, useEffect } from 'react';
import { IconButton } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { ThemeContext } from '@/context/ThemeContext';

const ThemeToggle = () => {
  const { toggleColorMode } = useContext(ThemeContext);
  const [mode, setMode] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const userPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setMode(userPreference);
  }, []);

  const handleToggle = () => {
    toggleColorMode();
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <IconButton onClick={handleToggle} color="inherit">
      {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
    </IconButton>
  );
};

export default ThemeToggle;
