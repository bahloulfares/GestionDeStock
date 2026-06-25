import { useState } from 'react';
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Stack, CircularProgress, InputAdornment,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersService } from '../services';

export default function SuppliersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; supplier?: any }>({ open: false, mode: 'create' });
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', paymentTerms: '' });
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['suppliers', search], queryFn: () => suppliersService.getAll(search || undefined) });

  const createMutation = useMutation({
    mutationFn: suppliersService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); closeDialog(); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => suppliersService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); closeDialog(); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: suppliersService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
    onError: (e: any) => alert(e.response?.data?.message || 'Erreur'),
  });

  const closeDialog = () => { setDialog({ open: false, mode: 'create' }); setForm({ name: '', phone: '', email: '', city: '', paymentTerms: '' }); setError(''); };

  const handleSubmit = () => {
    const payload = { name: form.name, phone: form.phone || undefined, email: form.email || undefined, city: form.city || undefined, paymentTerms: form.paymentTerms || undefined };
    if (dialog.mode === 'create') createMutation.mutate(payload);
    else updateMutation.mutate({ id: dialog.supplier?.id, data: payload });
  };

  const openEdit = (s: any) => {
    setForm({ name: s.name, phone: s.phone || '', email: s.email || '', city: s.city || '', paymentTerms: s.paymentTerms || '' });
    setError('');
    setDialog({ open: true, mode: 'edit', supplier: s });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Fournisseurs</Typography>
          <Typography variant="subtitle1">{(data || []).length} fournisseur(s)</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm({ name: '', phone: '', email: '', city: '', paymentTerms: '' }); setError(''); setDialog({ open: true, mode: 'create' }); }}>
          Nouveau fournisseur
        </Button>
      </Box>

      <Card sx={{ mb: 2 }}>
        <Box sx={{ p: 2 }}>
          <TextField placeholder="Rechercher un fournisseur..." value={search} onChange={e => setSearch(e.target.value)} size="small" sx={{ minWidth: 280 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
        </Box>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Téléphone</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Ville</TableCell>
                <TableCell>Conditions paiement</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : (data || []).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{s.name}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{s.phone || '—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{s.email || '—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{s.city || '—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{s.paymentTerms || '—'}</Typography></TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => openEdit(s)} sx={{ mr: 0.5 }}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => { if (confirm('Supprimer ce fournisseur ?')) deleteMutation.mutate(s.id); }}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={dialog.open} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.mode === 'create' ? 'Nouveau fournisseur' : 'Modifier le fournisseur'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nom *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label="Téléphone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} fullWidth />
              <TextField label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} fullWidth />
            </Stack>
            <TextField label="Ville" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} fullWidth />
            <TextField label="Conditions de paiement" value={form.paymentTerms} onChange={e => setForm(p => ({ ...p, paymentTerms: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={closeDialog}>Annuler</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
            {dialog.mode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
