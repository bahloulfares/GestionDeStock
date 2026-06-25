import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, CircularProgress,
  InputAdornment,
} from '@mui/material';
import { Email as EmailIcon, ArrowBack as ArrowBackIcon, Store as StoreIcon } from '@mui/icons-material';
import { authService } from '../services';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await authService.forgotPassword(email);
      setSuccess(data.message || "Si un compte est associé à cette adresse, un e-mail de réinitialisation a été envoyé.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Une erreur est survenue lors de la demande.");
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
              Mot de passe oublié
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Saisissez votre e-mail pour recevoir un lien de réinitialisation de mot de passe.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2 }}>{success}</Alert>}

            {!success ? (
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Adresse Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  sx={{ mb: 3 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
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
                  {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Envoyer le lien'}
                </Button>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Vérifiez votre boîte de réception (et vos spams). Le lien expirera dans 15 minutes.
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 3.5, textAlign: 'center' }}>
              <Button
                component={Link}
                to="/login"
                variant="text"
                startIcon={<ArrowBackIcon />}
                sx={{ textTransform: 'none', color: '#1A56DB', fontWeight: 600 }}
              >
                Retour à la connexion
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
