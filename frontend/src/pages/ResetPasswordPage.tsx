import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, CircularProgress,
  InputAdornment, IconButton,
} from '@mui/material';
import { Lock as LockIcon, Visibility, VisibilityOff, Store as StoreIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { authService } from '../services';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Token de réinitialisation manquant.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await authService.resetPassword(form.password, token);
      setSuccess(data.message || 'Mot de passe réinitialisé avec succès !');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la réinitialisation du mot de passe. Le token a peut-être expiré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #EBF2FF 0%, #F5F0FF 50%, #FFF7ED 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
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

        <Card sx={{ boxShadow: '0 20px 60px rgba(0,0,0,0.1)', border: 'none', borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              Nouveau mot de passe
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Saisissez votre nouveau mot de passe ci-dessous.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}
            {success && (
              <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2.5, borderRadius: 2 }}>
                {success}
              </Alert>
            )}

            {!token ? (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                Lien de réinitialisation invalide (Token absent de l'URL).
              </Alert>
            ) : !success ? (
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  label="Nouveau mot de passe"
                  value={form.password}
                  onChange={handleChange}
                  required
                  sx={{ mb: 2.5 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPwd(!showPwd)} edge="end" size="small">
                            {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />
                <TextField
                  fullWidth
                  name="confirmPassword"
                  type="password"
                  label="Confirmer le mot de passe"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  sx={{ mb: 3.5 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      )
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
                    borderRadius: 2.5,
                    boxShadow: '0 4px 12px rgba(26,86,219,0.2)',
                    textTransform: 'none',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1E429F 0%, #6C2BD9 100%)',
                      boxShadow: '0 6px 16px rgba(26,86,219,0.3)',
                    }
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Réinitialiser le mot de passe'}
                </Button>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Redirection vers la page de connexion dans quelques instants...
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Link to="/login" style={{ color: '#1A56DB', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
                Retour à la connexion
              </Link>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
