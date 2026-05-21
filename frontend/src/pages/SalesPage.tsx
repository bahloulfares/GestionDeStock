import { useState } from 'react';
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Stack, CircularProgress, FormControl, InputLabel, Select,
  MenuItem, Pagination, IconButton,
} from '@mui/material';
import { Add as AddIcon, Visibility as ViewIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesService, productsService } from '../services';
import { authStore } from '../store/auth.store';
import dayjs from 'dayjs';

const PAYMENT_LABELS: Record<string, string> = { CASH: 'Espèces', TRANSFER: 'Virement', CREDIT: 'Crédit' };
const STATUS_COLORS: Record<string, any> = { COMPLETED: 'success', CANCELLED: 'error' };

export default function SalesPage() {
  const qc = useQueryClient();
  const isAdmin = authStore.isAdmin();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState<{ open: boolean; sale?: any }>({ open: false });
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; saleId?: string }>({ open: false });
  const [cancelReason, setCancelReason] = useState('');
  const [form, setForm] = useState({ paymentMethod: 'CASH', notes: '', items: [{ productId: '', qty: '1', priceSell: '' }] });
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sales', page, statusFilter],
    queryFn: () => salesService.getAll({ page, limit: 15, status: statusFilter || undefined }),
  });

  const { data: productsData } = useQuery({ queryKey: ['products-all'], queryFn: () => productsService.getAll({ limit: 500 }) });
  const products = productsData?.data || [];

  const createMutation = useMutation({
    mutationFn: salesService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales'] }); qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setCreateDialog(false); resetForm(); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur'),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: any) => salesService.cancel(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales'] }); qc.invalidateQueries({ queryKey: ['products'] }); setCancelDialog({ open: false }); setCancelReason(''); },
    onError: (e: any) => alert(e.response?.data?.message || 'Erreur'),
  });

  const resetForm = () => { setForm({ paymentMethod: 'CASH', notes: '', items: [{ productId: '', qty: '1', priceSell: '' }] }); setError(''); };

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { productId: '', qty: '1', priceSell: '' }] }));
  const removeItem = (i: number) => setForm(p => ({ ...p, items: p.items.filter((_, j) => j !== i) }));
  const updateItem = (i: number, field: string, val: string) => {
    setForm(p => {
      const items = [...p.items];
      items[i] = { ...items[i], [field]: val };
      if (field === 'productId') {
        const prod = products.find((pr: any) => pr.id === val);
        if (prod) items[i].priceSell = String(prod.priceSell);
      }
      return { ...p, items };
    });
  };

  const handleCreate = () => {
    const payload = {
      paymentMethod: form.paymentMethod,
      notes: form.notes || undefined,
      items: form.items.map(i => ({ productId: i.productId, qty: Number(i.qty), priceSell: Number(i.priceSell) })),
    };
    createMutation.mutate(payload);
  };

  const totalSell = form.items.reduce((acc, i) => acc + (Number(i.qty) || 0) * (Number(i.priceSell) || 0), 0);
  const totalPages = Math.ceil((data?.total || 0) / 15);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Ventes</Typography>
          <Typography variant="subtitle1">{data?.total || 0} vente(s)</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setCreateDialog(true); }}>
          Nouvelle vente
        </Button>
      </Box>

      <Card sx={{ mb: 2, p: 2 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Statut</InputLabel>
          <Select value={statusFilter} label="Statut" onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="COMPLETED">Complétées</MenuItem>
            <MenuItem value="CANCELLED">Annulées</MenuItem>
          </Select>
        </FormControl>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Référence</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Règlement</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : data?.data?.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell><Typography variant="caption" fontFamily="monospace" sx={{ bgcolor: 'grey.100', px: 1, py: 0.25, borderRadius: 1 }}>#{s.id.slice(-8).toUpperCase()}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{dayjs(s.date).format('DD/MM/YYYY HH:mm')}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="body2" fontWeight={700} color="success.main">{Number(s.total).toFixed(3)} TND</Typography></TableCell>
                  <TableCell><Chip label={PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod} size="small" variant="outlined" /></TableCell>
                  <TableCell><Chip label={s.status === 'COMPLETED' ? 'Complétée' : 'Annulée'} size="small" color={STATUS_COLORS[s.status]} /></TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={async () => { const d = await salesService.getOne(s.id); setViewDialog({ open: true, sale: d }); }} sx={{ mr: 0.5 }}><ViewIcon fontSize="small" /></IconButton>
                    {isAdmin && s.status === 'COMPLETED' && (
                      <IconButton size="small" color="error" onClick={() => { setCancelDialog({ open: true, saleId: s.id }); setCancelReason(''); }}><CancelIcon fontSize="small" /></IconButton>
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

      {/* Create Sale Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nouvelle vente</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Mode de règlement *</InputLabel>
                <Select value={form.paymentMethod} label="Mode de règlement *" onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value }))}>
                  <MenuItem value="CASH">Espèces</MenuItem>
                  <MenuItem value="TRANSFER">Virement</MenuItem>
                  <MenuItem value="CREDIT">Crédit</MenuItem>
                </Select>
              </FormControl>
              <TextField label="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} fullWidth />
            </Stack>

            <Typography variant="subtitle2" fontWeight={600}>Articles</Typography>
            {form.items.map((item, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <FormControl sx={{ flex: 2 }}>
                  <InputLabel>Produit *</InputLabel>
                  <Select value={item.productId} label="Produit *" onChange={e => updateItem(i, 'productId', e.target.value)} size="small">
                    {products.map((p: any) => (
                      <MenuItem key={p.id} value={p.id} disabled={p.qty === 0}>
                        {p.name} {p.qty === 0 ? '(épuisé)' : `(stock: ${p.qty})`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField label="Qté *" type="number" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} size="small" sx={{ width: 80 }} inputProps={{ min: 1 }} />
                <TextField label="Prix TND *" type="number" value={item.priceSell} onChange={e => updateItem(i, 'priceSell', e.target.value)} size="small" sx={{ width: 110 }} inputProps={{ step: '0.001', min: 0 }} />
                <IconButton size="small" color="error" onClick={() => removeItem(i)} disabled={form.items.length === 1}><CancelIcon fontSize="small" /></IconButton>
              </Stack>
            ))}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Button onClick={addItem} variant="outlined" size="small" startIcon={<AddIcon />}>Ajouter un article</Button>
              <Typography variant="h6" fontWeight={700} color="success.main">
                Total : {totalSell.toFixed(3)} TND
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setCreateDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreate} disabled={createMutation.isPending} color="success">
            Enregistrer la vente
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialog.open} onClose={() => setViewDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>Détail de la vente</DialogTitle>
        <DialogContent>
          {viewDialog.sale && (
            <Box>
              <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
                <Box><Typography variant="caption" color="text.secondary">Date</Typography><Typography>{dayjs(viewDialog.sale.date).format('DD/MM/YYYY HH:mm')}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Règlement</Typography><Typography>{PAYMENT_LABELS[viewDialog.sale.paymentMethod]}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Statut</Typography><div><Chip label={viewDialog.sale.status === 'COMPLETED' ? 'Complétée' : 'Annulée'} size="small" color={STATUS_COLORS[viewDialog.sale.status]} /></div></Box>
              </Stack>
              {viewDialog.sale.cancelReason && <Alert severity="warning" sx={{ mb: 2 }}>Raison annulation : {viewDialog.sale.cancelReason}</Alert>}
              <Table size="small">
                <TableHead><TableRow><TableCell>Produit</TableCell><TableCell align="center">Qté</TableCell><TableCell align="right">Prix unit.</TableCell><TableCell align="right">Sous-total</TableCell></TableRow></TableHead>
                <TableBody>
                  {viewDialog.sale.items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product?.name}</TableCell>
                      <TableCell align="center">{item.qty}</TableCell>
                      <TableCell align="right">{Number(item.priceSell).toFixed(3)}</TableCell>
                      <TableCell align="right" fontWeight={600}>{(item.qty * Number(item.priceSell)).toFixed(3)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow><TableCell colSpan={3} align="right" sx={{ fontWeight: 700 }}>Total</TableCell><TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>{Number(viewDialog.sale.total).toFixed(3)} TND</TableCell></TableRow>
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewDialog({ open: false })}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog.open} onClose={() => setCancelDialog({ open: false })} maxWidth="xs" fullWidth>
        <DialogTitle>Annuler la vente</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Le stock sera réintégré automatiquement.
          </Typography>
          <TextField label="Raison de l'annulation *" value={cancelReason} onChange={e => setCancelReason(e.target.value)} fullWidth multiline rows={2} />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setCancelDialog({ open: false })}>Fermer</Button>
          <Button variant="contained" color="error" onClick={() => cancelMutation.mutate({ id: cancelDialog.saleId, reason: cancelReason })} disabled={!cancelReason.trim() || cancelMutation.isPending}>
            Confirmer l'annulation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
