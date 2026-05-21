import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, CircularProgress,
  InputAdornment, IconButton,
} from '@mui/material';
import { Store as StoreIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import { authService } from '../services';

export default function RegisterPage() {
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
      setSuccess('Compte créé avec succès ! Redirection...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #EBF2FF 0%, #F5F0FF 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
    }}>
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: 3,
            background: 'linear-gradient(135deg, #1A56DB 0%, #7E3AF2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 1.5,
          }}>
            <StoreIcon sx={{ color: 'white', fontSize: 28 }} />
          </Box>
          <Typography variant="h5" fontWeight={800}>Créer votre boutique</Typography>
          <Typography variant="body2" color="text.secondary">StockTN — Gestion de stocks</Typography>
        </Box>

        <Card sx={{ boxShadow: '0 20px 60px rgba(0,0,0,0.1)', border: 'none' }}>
          <CardContent sx={{ p: 4 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField fullWidth name="shopName" label="Nom de la boutique" value={form.shopName} onChange={handleChange} required sx={{ mb: 2 }} />
              <TextField fullWidth name="email" type="email" label="Email" value={form.email} onChange={handleChange} required sx={{ mb: 2 }} />
              <TextField fullWidth name="phone" label="Téléphone" value={form.phone} onChange={handleChange} sx={{ mb: 2 }} />
              <TextField
                fullWidth name="password" type={showPwd ? 'text' : 'password'}
                label="Mot de passe" value={form.password} onChange={handleChange} required sx={{ mb: 2 }}
                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPwd(!showPwd)} size="small">{showPwd ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }}
              />
              <TextField fullWidth name="confirmPassword" type="password" label="Confirmer le mot de passe" value={form.confirmPassword} onChange={handleChange} required sx={{ mb: 3 }} />
              <Button type="submit" fullWidth variant="contained" size="large" disabled={loading}
                sx={{ py: 1.5, fontWeight: 700, background: 'linear-gradient(135deg, #1A56DB 0%, #7E3AF2 100%)' }}>
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : "Créer mon compte"}
              </Button>
            </Box>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Déjà un compte ?{' '}
                <Link to="/login" style={{ color: '#1A56DB', fontWeight: 600, textDecoration: 'none' }}>Se connecter</Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
