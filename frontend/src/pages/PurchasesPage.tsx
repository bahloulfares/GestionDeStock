import { useState } from 'react';
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, Stack, CircularProgress, Select, MenuItem,
  FormControl, InputLabel, Pagination,
} from '@mui/material';
import {
  Add as AddIcon, CheckCircle as ValidateIcon, Cancel as CancelIcon,
  Delete as DeleteIcon, Visibility as ViewIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesService, suppliersService, productsService } from '../services';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, any> = { DRAFT: 'default', VALIDATED: 'success', CANCELLED: 'error' };
const STATUS_LABELS: Record<string, string> = { DRAFT: 'Brouillon', VALIDATED: 'Validé', CANCELLED: 'Annulé' };

export default function PurchasesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState<{ open: boolean; order?: any }>({ open: false });
  const [form, setForm] = useState({ supplierId: '', invoiceNumber: '', notes: '', items: [{ productId: '', qty: '1', priceBuy: '' }] });
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', page, statusFilter],
    queryFn: () => purchasesService.getAll({ page, limit: 15, status: statusFilter || undefined }),
  });

  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => suppliersService.getAll() });
  const { data: productsData } = useQuery({ queryKey: ['products-all'], queryFn: () => productsService.getAll({ limit: 500 }) });
  const products = productsData?.data || [];

  const createMutation = useMutation({
    mutationFn: purchasesService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); setCreateDialog(false); resetForm(); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur'),
  });

  const validateMutation = useMutation({
    mutationFn: purchasesService.validate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchases'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: purchasesService.cancel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchases'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: purchasesService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchases'] }),
  });

  const resetForm = () => { setForm({ supplierId: '', invoiceNumber: '', notes: '', items: [{ productId: '', qty: '1', priceBuy: '' }] }); setError(''); };

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { productId: '', qty: '1', priceBuy: '' }] }));
  const removeItem = (i: number) => setForm(p => ({ ...p, items: p.items.filter((_, j) => j !== i) }));
  const updateItem = (i: number, field: string, val: string) => {
    setForm(p => {
      const items = [...p.items];
      items[i] = { ...items[i], [field]: val };
      if (field === 'productId') {
        const prod = products.find((pr: any) => pr.id === val);
        if (prod) items[i].priceBuy = String(prod.priceBuy);
      }
      return { ...p, items };
    });
  };

  const handleCreate = () => {
    const payload = {
      supplierId: form.supplierId,
      invoiceNumber: form.invoiceNumber || undefined,
      notes: form.notes || undefined,
      items: form.items.map(i => ({ productId: i.productId, qty: Number(i.qty), priceBuy: Number(i.priceBuy) })),
    };
    createMutation.mutate(payload);
  };

  const totalPages = Math.ceil((data?.total || 0) / 15);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Bons de commande</Typography>
          <Typography variant="subtitle1">{data?.total || 0} commande(s)</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setCreateDialog(true); }}>
          Nouveau bon
        </Button>
      </Box>

      <Card sx={{ mb: 2, p: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Statut</InputLabel>
          <Select value={statusFilter} label="Statut" onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="DRAFT">Brouillon</MenuItem>
            <MenuItem value="VALIDATED">Validé</MenuItem>
            <MenuItem value="CANCELLED">Annulé</MenuItem>
          </Select>
        </FormControl>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>N° Facture</TableCell>
                <TableCell>Fournisseur</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : data?.data?.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell><Typography variant="body2" fontFamily="monospace">{o.invoiceNumber || '—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2" fontWeight={500}>{o.supplier?.name || '—'}</Typography></TableCell>
                  <TableCell><Typography variant="caption">{dayjs(o.date || o.createdAt).format('DD/MM/YYYY')}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="body2" fontWeight={600}>{Number(o.total || 0).toFixed(3)} TND</Typography></TableCell>
                  <TableCell><Chip label={STATUS_LABELS[o.status]} size="small" color={STATUS_COLORS[o.status]} /></TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={async () => { const d = await purchasesService.getOne(o.id); setViewDialog({ open: true, order: d }); }} sx={{ mr: 0.5 }}><ViewIcon fontSize="small" /></IconButton>
                    {o.status === 'DRAFT' && <>
                      <IconButton size="small" color="success" onClick={() => { if (confirm('Valider ce bon de commande ? Les stocks seront mis à jour.')) validateMutation.mutate(o.id); }} sx={{ mr: 0.5 }}><ValidateIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => { if (confirm('Supprimer ce bon ?')) deleteMutation.mutate(o.id); }}><DeleteIcon fontSize="small" /></IconButton>
                    </>}
                    {o.status === 'VALIDATED' && (
                      <IconButton size="small" color="warning" onClick={() => { if (confirm('Annuler ce bon validé ?')) cancelMutation.mutate(o.id); }}><CancelIcon fontSize="small" /></IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" />
          </Box>
        )}
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nouveau bon de commande</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Fournisseur *</InputLabel>
                <Select value={form.supplierId} label="Fournisseur *" onChange={e => setForm(p => ({ ...p, supplierId: e.target.value }))}>
                  {(suppliers || []).map((s: any) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="N° Facture" value={form.invoiceNumber} onChange={e => setForm(p => ({ ...p, invoiceNumber: e.target.value }))} fullWidth />
            </Stack>
            <TextField label="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} fullWidth multiline rows={2} />

            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Lignes de commande</Typography>
            {form.items.map((item, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <FormControl sx={{ flex: 2 }}>
                  <InputLabel>Produit *</InputLabel>
                  <Select value={item.productId} label="Produit *" onChange={e => updateItem(i, 'productId', e.target.value)} size="small">
                    {products.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label="Qté *" type="number" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} size="small" sx={{ width: 80 }} inputProps={{ min: 1 }} />
                <TextField label="Prix achat *" type="number" value={item.priceBuy} onChange={e => updateItem(i, 'priceBuy', e.target.value)} size="small" sx={{ width: 120 }} inputProps={{ step: '0.001', min: 0 }} />
                <IconButton size="small" color="error" onClick={() => removeItem(i)} disabled={form.items.length === 1}><CancelIcon fontSize="small" /></IconButton>
              </Stack>
            ))}
            <Button onClick={addItem} variant="outlined" size="small" startIcon={<AddIcon />} sx={{ alignSelf: 'flex-start' }}>
              Ajouter une ligne
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setCreateDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreate} disabled={createMutation.isPending}>Créer le bon</Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialog.open} onClose={() => setViewDialog({ open: false })} maxWidth="md" fullWidth>
        <DialogTitle>Bon de commande — {viewDialog.order?.invoiceNumber || 'Sans numéro'}</DialogTitle>
        <DialogContent>
          {viewDialog.order && (
            <Box>
              <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
                <Box><Typography variant="caption" color="text.secondary">Fournisseur</Typography><Typography fontWeight={600}>{viewDialog.order.supplier?.name}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Statut</Typography><div><Chip label={STATUS_LABELS[viewDialog.order.status]} size="small" color={STATUS_COLORS[viewDialog.order.status]} /></div></Box>
                <Box><Typography variant="caption" color="text.secondary">Date</Typography><Typography>{dayjs(viewDialog.order.date || viewDialog.order.createdAt).format('DD/MM/YYYY')}</Typography></Box>
              </Stack>
              <Table size="small">
                <TableHead><TableRow><TableCell>Produit</TableCell><TableCell align="center">Qté</TableCell><TableCell align="right">Prix unitaire</TableCell><TableCell align="right">Sous-total</TableCell></TableRow></TableHead>
                <TableBody>
                  {viewDialog.order.items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product?.name}</TableCell>
                      <TableCell align="center">{item.qty}</TableCell>
                      <TableCell align="right">{Number(item.priceBuy).toFixed(3)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{(item.qty * Number(item.priceBuy)).toFixed(3)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>{Number(viewDialog.order.total || 0).toFixed(3)} TND</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewDialog({ open: false })}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
