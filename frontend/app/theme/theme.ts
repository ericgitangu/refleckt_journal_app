import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark', // default to dark mode
    primary: { main: '#90caf9' },  // lighter for dark BG
    secondary: { main: '#f48fb1' },
    error: { main: '#f44336' },
    background: {
      default: '#121212',
      paper: '#1e1e1e'
    },
  },
  typography: {
    fontFamily: ['Montserrat', 'sans-serif'].join(','),
    allVariants: {
      color: '#ffffff' // ensure text is visible on dark BG
    }
  },
});

export default theme;
