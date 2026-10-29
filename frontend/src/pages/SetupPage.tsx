import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, CircularProgress,
  InputAdornment, IconButton,
} from '@mui/material';
import { Store as StoreIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import { authService } from '../services';

export default function SetupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ shopName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.register(form.shopName, form.email, form.password, form.phone);
      setSuccess('Boutique créée avec succès ! Vous bénéficiez de 14 jours d\'essai gratuit. Redirection...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création de la boutique');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
    }}>
      <Box sx={{ width: '100%', maxWidth: 480 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: '16px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 2,
            boxShadow: '0 8px 30px rgba(59, 130, 246, 0.4)',
          }}>
            <StoreIcon sx={{ color: 'white', fontSize: 32 }} />
          </Box>
          <Typography variant="h4" sx={{ color: 'white', letterSpacing: '-0.5px', fontWeight: 900 }}>
            Créer ma Boutique
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: '#94a3b8' }}>
            14 jours d'essai gratuit StockTN • Aucun paiement requis
          </Typography>
        </Box>

        <Card sx={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(16px)',
          borderRadius: '16px',
        }}>
          <CardContent sx={{ p: 4 }}>
            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 3, borderRadius: '8px' }}>{success}</Alert>}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                name="shopName"
                label="Nom de la boutique / entreprise"
                value={form.shopName}
                onChange={handleChange}
                required
                variant="outlined"
                sx={{
                  mb: 2.5,
                  '& label': { color: '#94a3b8' },
                  '& label.Mui-focused': { color: '#3b82f6' },
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                  }
                }}
              />
              <TextField
                fullWidth
                name="email"
                type="email"
                label="Adresse Email de l'Admin"
                value={form.email}
                onChange={handleChange}
                required
                sx={{
                  mb: 2.5,
                  '& label': { color: '#94a3b8' },
                  '& label.Mui-focused': { color: '#3b82f6' },
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                  }
                }}
              />
              <TextField
                fullWidth
                name="phone"
                label="Téléphone (Optionnel)"
                value={form.phone}
                onChange={handleChange}
                sx={{
                  mb: 2.5,
                  '& label': { color: '#94a3b8' },
                  '& label.Mui-focused': { color: '#3b82f6' },
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                  }
                }}
              />
              <TextField
                fullWidth
                name="password"
                type={showPwd ? 'text' : 'password'}
                label="Mot de passe de l'Admin"
                value={form.password}
                onChange={handleChange}
                required
                 slotProps={{
                   input: {
                     endAdornment: (
                       <InputAdornment position="end">
                         <IconButton onClick={() => setShowPwd(!showPwd)} size="small" sx={{ color: '#94a3b8' }}>
                           {showPwd ? <VisibilityOff /> : <Visibility />}
                         </IconButton>
                       </InputAdornment>
                     )
                   }
                 }}
                sx={{
                  mb: 2.5,
                  '& label': { color: '#94a3b8' },
                  '& label.Mui-focused': { color: '#3b82f6' },
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
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
                sx={{
                  mb: 3.5,
                  '& label': { color: '#94a3b8' },
                  '& label.Mui-focused': { color: '#3b82f6' },
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
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
                  py: 1.5,
                  fontWeight: 800,
                  fontSize: '15px',
                  borderRadius: '10px',
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)',
                    transform: 'translateY(-1px)',
                  }
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : "Démarrer l'essai gratuit de 14 jours"}
              </Button>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Button
                  onClick={() => navigate('/login')}
                  sx={{ color: '#94a3b8', textTransform: 'none', fontSize: '0.875rem' }}
                >
                  Déjà un compte ? Se connecter
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
