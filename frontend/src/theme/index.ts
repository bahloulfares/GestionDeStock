import { createTheme, alpha } from '@mui/material/styles';

// ─── Palette professionnelle claire ──────────────────────────────────────────
const PRIMARY = '#1A56DB';   // Bleu royal professionnel
const SECONDARY = '#7E3AF2'; // Violet
const SUCCESS = '#0E9F6E';
const WARNING = '#FF5A1F';
const ERROR = '#E02424';
const INFO = '#3F83F8';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: PRIMARY,
      light: '#3F83F8',
      dark: '#1E429F',
      contrastText: '#ffffff',
    },
    secondary: {
      main: SECONDARY,
      light: '#9061F9',
      dark: '#6C2BD9',
      contrastText: '#ffffff',
    },
    success: { main: SUCCESS },
    warning: { main: WARNING },
    error: { main: ERROR },
    info: { main: INFO },
    background: {
      default: '#F3F4F6',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#111928',
      secondary: '#6B7280',
    },
    divider: '#E5E7EB',
  },

  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: '1.75rem', fontWeight: 700 },
    h3: { fontSize: '1.5rem', fontWeight: 600 },
    h4: { fontSize: '1.25rem', fontWeight: 600 },
    h5: { fontSize: '1.125rem', fontWeight: 600 },
    h6: { fontSize: '1rem', fontWeight: 600 },
    subtitle1: { fontSize: '0.875rem', fontWeight: 500, color: '#6B7280' },
    body1: { fontSize: '0.875rem' },
    body2: { fontSize: '0.8125rem' },
    caption: { fontSize: '0.75rem' },
  },

  shape: { borderRadius: 10 },

  shadows: [
    'none',
    '0px 1px 2px rgba(0,0,0,0.06), 0px 1px 3px rgba(0,0,0,0.1)',
    '0px 1px 5px rgba(0,0,0,0.08), 0px 2px 4px rgba(0,0,0,0.06)',
    '0px 2px 8px rgba(0,0,0,0.08), 0px 4px 6px rgba(0,0,0,0.05)',
    '0px 4px 12px rgba(0,0,0,0.1)',
    '0px 6px 16px rgba(0,0,0,0.1)',
    '0px 8px 24px rgba(0,0,0,0.1)',
    '0px 10px 28px rgba(0,0,0,0.1)',
    '0px 12px 32px rgba(0,0,0,0.1)',
    '0px 14px 36px rgba(0,0,0,0.1)',
    '0px 16px 40px rgba(0,0,0,0.1)',
    '0px 18px 44px rgba(0,0,0,0.1)',
    '0px 20px 48px rgba(0,0,0,0.1)',
    '0px 22px 52px rgba(0,0,0,0.1)',
    '0px 24px 56px rgba(0,0,0,0.1)',
    '0px 26px 60px rgba(0,0,0,0.1)',
    '0px 28px 64px rgba(0,0,0,0.1)',
    '0px 30px 68px rgba(0,0,0,0.1)',
    '0px 32px 72px rgba(0,0,0,0.1)',
    '0px 34px 76px rgba(0,0,0,0.1)',
    '0px 36px 80px rgba(0,0,0,0.1)',
    '0px 38px 84px rgba(0,0,0,0.1)',
    '0px 40px 88px rgba(0,0,0,0.1)',
    '0px 42px 92px rgba(0,0,0,0.1)',
    '0px 44px 96px rgba(0,0,0,0.1)',
  ],

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@import': "url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap')",
        body: {
          backgroundColor: '#F3F4F6',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-track': { background: '#F3F4F6' },
          '&::-webkit-scrollbar-thumb': { background: '#D1D5DB', borderRadius: '3px' },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        contained: {
          '&:hover': { filter: 'brightness(1.08)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 1px 3px rgba(0,0,0,0.1), 0px 1px 2px rgba(0,0,0,0.06)',
          border: '1px solid #E5E7EB',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 12 },
        elevation1: { boxShadow: '0px 1px 3px rgba(0,0,0,0.1)' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#F9FAFB',
            '&.Mui-focused': { backgroundColor: '#FFFFFF' },
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#F9FAFB',
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#6B7280',
            borderBottom: '2px solid #E5E7EB',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: alpha(PRIMARY, 0.04) },
          '&:last-child td': { borderBottom: 0 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 500, fontSize: '0.75rem' },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid #E5E7EB',
          boxShadow: '4px 0 8px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderBottom: '1px solid #E5E7EB',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, height: 6 },
      },
    },
  },
});
