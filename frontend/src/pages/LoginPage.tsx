import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  InputAdornment, IconButton, Alert, CircularProgress, Divider,
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility, VisibilityOff,
  Store as StoreIcon,
} from '@mui/icons-material';
import { authService } from '../services';
import { authStore } from '../store/auth.store';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authService.login(email, password);
      authStore.setTokens(data.accessToken, data.refreshToken);
      onLogin();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #EBF2FF 0%, #F5F0FF 50%, #FFF7ED 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2,
    }}>
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: 3,
            background: 'linear-gradient(135deg, #1A56DB 0%, #7E3AF2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 2, boxShadow: '0 8px 24px rgba(26,86,219,0.3)',
          }}>
            <StoreIcon sx={{ color: 'white', fontSize: 36 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            StockTN
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestion de stocks pour boutiques mobiles
          </Typography>
        </Box>

        <Card sx={{ boxShadow: '0 20px 60px rgba(0,0,0,0.1)', border: 'none' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              Connexion
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Accédez à votre espace de gestion
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                sx={{ mb: 2 }}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>
                  }
                }}
              />
              <TextField
                fullWidth
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                sx={{ mb: 3 }}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  py: 1.5, fontWeight: 700, fontSize: '1rem',
                  background: 'linear-gradient(135deg, #1A56DB 0%, #7E3AF2 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #1E429F 0%, #6C2BD9 100%)' },
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Se connecter'}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }}>
              <Typography variant="caption" color="text.secondary">Démo</Typography>
            </Divider>

            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                Comptes de démo :
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                👑 admin@demo.tn / Admin@2026!
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                👤 employe@demo.tn / Employe@2026!
              </Typography>
            </Box>

            <Box sx={{ mt: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Link to="/forgot-password" style={{ color: '#1A56DB', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
                Mot de passe oublié ?
              </Link>
              <Box sx={{ mt: 1 }}>
                <Link to="/setup" style={{ color: '#7E3AF2', fontWeight: 500, fontSize: '0.75rem', textDecoration: 'none', opacity: 0.8 }}>
                  ⚙️ Premier démarrage (Configuration initiale)
                </Link>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
