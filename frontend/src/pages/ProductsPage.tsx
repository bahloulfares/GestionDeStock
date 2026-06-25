import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, InputAdornment, Tooltip, Alert,
  CircularProgress, Pagination, Stack, MenuItem, FormControl, InputLabel, Select,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, Warning as WarningIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService, categoriesService } from '../services';
import { authStore } from '../store/auth.store';

export default function ProductsPage() {
  const qc = useQueryClient();
  const isAdmin = authStore.isAdmin();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; product?: any }>({ open: false, mode: 'create' });
  const [form, setForm] = useState({ name: '', reference: '', categoryId: '', priceBuy: '', priceSell: '', qty: '', minStock: '5' });
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, categoryFilter, lowStockFilter],
    queryFn: () => productsService.getAll({
      page, limit: 15,
      search: search || undefined,
      categoryId: categoryFilter || undefined,
      lowStock: lowStockFilter === 'true' ? true : undefined,
    }),
  });

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesService.getAll });

  const createMutation = useMutation({
    mutationFn: productsService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); closeDialog(); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => productsService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); closeDialog(); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: productsService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const openCreate = () => {
    setForm({ name: '', reference: '', categoryId: '', priceBuy: '', priceSell: '', qty: '', minStock: '5' });
    setError('');
    setDialog({ open: true, mode: 'create' });
  };

  const openEdit = (product: any) => {
    setForm({
      name: product.name, reference: product.reference || '', categoryId: product.categoryId || '',
      priceBuy: String(product.priceBuy), priceSell: String(product.priceSell),
      qty: String(product.qty), minStock: String(product.minStock),
    });
    setError('');
    setDialog({ open: true, mode: 'edit', product });
  };

  const closeDialog = () => setDialog({ open: false, mode: 'create' });

  const handleSubmit = () => {
    const payload = {
      name: form.name, reference: form.reference || undefined,
      categoryId: form.categoryId || undefined,
      priceBuy: Number(form.priceBuy), priceSell: Number(form.priceSell),
      qty: Number(form.qty), minStock: Number(form.minStock),
    };
    if (dialog.mode === 'create') createMutation.mutate(payload);
    else updateMutation.mutate({ id: dialog.product?.id, data: payload });
  };

  const totalPages = Math.ceil((data?.total || 0) / 15);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Produits</Typography>
          <Typography variant="subtitle1">{data?.total || 0} références</Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Nouveau produit
          </Button>
        )}
      </Box>

      {/* Filtres */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'center' }}>
            <TextField
              placeholder="Rechercher un produit..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              size="small" sx={{ minWidth: 250 }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Catégorie</InputLabel>
              <Select value={categoryFilter} label="Catégorie" onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}>
                <MenuItem value="">Toutes</MenuItem>
                {(categories || []).map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Stock</InputLabel>
              <Select value={lowStockFilter} label="Stock" onChange={e => { setLowStockFilter(e.target.value); setPage(1); }}>
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="true">Stock critique</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Produit</TableCell>
                <TableCell>Référence</TableCell>
                <TableCell>Catégorie</TableCell>
                <TableCell align="right">Prix achat</TableCell>
                <TableCell align="right">Prix vente</TableCell>
                <TableCell align="center">Stock</TableCell>
                <TableCell align="center">Min.</TableCell>
                {isAdmin && <TableCell align="center">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : data?.data?.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>Aucun produit trouvé</TableCell></TableRow>
              ) : data?.data?.map((p: any) => {
                const isLow = p.qty <= p.minStock;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isLow && <Tooltip title="Stock critique"><WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} /></Tooltip>}
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{p.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', px: 1, py: 0.25, borderRadius: 1 }}>{p.reference || '—'}</Typography></TableCell>
                    <TableCell><Chip label={p.categoryName || '—'} size="small" variant="outlined" /></TableCell>
                    <TableCell align="right"><Typography variant="body2">{Number(p.priceBuy).toFixed(3)}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2" sx={{ fontWeight: 600 }}>{Number(p.priceSell).toFixed(3)}</Typography></TableCell>
                    <TableCell align="center">
                      <Chip
                        label={p.qty}
                        size="small"
                        color={p.qty === 0 ? 'error' : isLow ? 'warning' : 'success'}
                      />
                    </TableCell>
                    <TableCell align="center"><Typography variant="body2">{p.minStock}</Typography></TableCell>
                    {isAdmin && (
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => openEdit(p)} sx={{ mr: 0.5 }}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(p.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" />
          </Box>
        )}
      </Card>

      {/* Dialog */}
      <Dialog open={dialog.open} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.mode === 'create' ? 'Nouveau produit' : 'Modifier le produit'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nom du produit *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} fullWidth />
            <TextField label="Référence" value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Catégorie</InputLabel>
              <Select value={form.categoryId} label="Catégorie" onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}>
                <MenuItem value="">Aucune</MenuItem>
                {(categories || []).map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
              <TextField label="Prix achat (TND) *" type="number" value={form.priceBuy} onChange={e => setForm(p => ({ ...p, priceBuy: e.target.value }))} fullWidth slotProps={{ htmlInput: { step: '0.001', min: 0 } }} />
              <TextField label="Prix vente (TND) *" type="number" value={form.priceSell} onChange={e => setForm(p => ({ ...p, priceSell: e.target.value }))} fullWidth slotProps={{ htmlInput: { step: '0.001', min: 0 } }} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Quantité *" type="number" value={form.qty} onChange={e => setForm(p => ({ ...p, qty: e.target.value }))} fullWidth slotProps={{ htmlInput: { min: 0 } }} />
              <TextField label="Stock minimum" type="number" value={form.minStock} onChange={e => setForm(p => ({ ...p, minStock: e.target.value }))} fullWidth slotProps={{ htmlInput: { min: 0 } }} />
            </Stack>
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
