import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Stack, CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesService } from '../services';

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; cat?: any }>({ open: false, mode: 'create' });
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['categories'], queryFn: categoriesService.getAll });

  const createMutation = useMutation({
    mutationFn: categoriesService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); closeDialog(); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => categoriesService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); closeDialog(); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: categoriesService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError: (e: any) => alert(e.response?.data?.message || 'Erreur'),
  });

  const closeDialog = () => { setDialog({ open: false, mode: 'create' }); setName(''); setError(''); };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (dialog.mode === 'create') createMutation.mutate({ name });
    else updateMutation.mutate({ id: dialog.cat?.id, data: { name } });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Catégories</Typography>
          <Typography variant="subtitle1">{(data || []).length} catégories</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setName(''); setError(''); setDialog({ open: true, mode: 'create' }); }}>
          Nouvelle catégorie
        </Button>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Créée le</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : (data || []).length === 0 ? (
                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>Aucune catégorie</TableCell></TableRow>
              ) : (data || []).map((cat: any) => (
                <TableRow key={cat.id}>
                  <TableCell><Typography variant="body2" fontWeight={500}>{cat.name}</Typography></TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{new Date(cat.createdAt).toLocaleDateString('fr-TN')}</Typography></TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => { setName(cat.name); setError(''); setDialog({ open: true, mode: 'edit', cat }); }} sx={{ mr: 0.5 }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => { if (confirm(`Supprimer "${cat.name}" ?`)) deleteMutation.mutate(cat.id); }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={dialog.open} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{dialog.mode === 'create' ? 'Nouvelle catégorie' : 'Modifier la catégorie'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField label="Nom *" value={name} onChange={e => setName(e.target.value)} fullWidth sx={{ mt: 1 }} />
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
