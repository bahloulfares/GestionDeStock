import { useState } from 'react';
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, CircularProgress, IconButton,
} from '@mui/material';
import { Add as AddIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService, productsService } from '../services';
import dayjs from 'dayjs';

export default function InventoryPage() {
  const qc = useQueryClient();
  const [createDialog, setCreateDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState<{ open: boolean; session?: any }>({ open: false });
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ productId: string; qtyPhysical: string; comment: string }[]>([]);
  const [error, setError] = useState('');

  const { data: sessions, isLoading } = useQuery({ queryKey: ['inventory'], queryFn: inventoryService.getAll });
  const { data: productsData } = useQuery({ queryKey: ['products-all'], queryFn: () => productsService.getAll({ limit: 500 }) });
  const products = productsData?.data || [];

  const createMutation = useMutation({
    mutationFn: inventoryService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); qc.invalidateQueries({ queryKey: ['products'] }); setCreateDialog(false); setItems([]); setNotes(''); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur'),
  });

  const openCreate = () => {
    const initialItems = products.map((p: any) => ({ productId: p.id, qtyPhysical: String(p.qty), comment: '' }));
    setItems(initialItems);
    setNotes('');
    setError('');
    setCreateDialog(true);
  };

  const updateItem = (i: number, field: string, val: string) => {
    setItems(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: val };
      return next;
    });
  };

  const handleCreate = () => {
    const payload = {
      notes: notes || undefined,
      items: items.map(i => ({
        productId: i.productId,
        qtyPhysical: Number(i.qtyPhysical),
        comment: i.comment || undefined,
      })),
    };
    createMutation.mutate(payload);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Inventaire</Typography>
          <Typography variant="subtitle1">Gestion et correction des stocks physiques</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nouvel inventaire
        </Button>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell align="center">Nb articles</TableCell>
                <TableCell align="center">Voir</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : (sessions || []).length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>Aucun inventaire enregistré</TableCell></TableRow>
              ) : (sessions || []).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell><Typography variant="body2">{dayjs(s.createdAt).format('DD/MM/YYYY HH:mm')}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{s.notes || '—'}</Typography></TableCell>
                  <TableCell align="center"><Chip label={s.items?.length || 0} size="small" /></TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={async () => { const d = await inventoryService.getOne(s.id); setViewDialog({ open: true, session: d }); }}><ViewIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Saisie d'inventaire physique</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Alert severity="info" sx={{ mb: 2 }}>
            Pour chaque produit, entrez la quantité physique comptée. Un commentaire est obligatoire si la quantité diffère du stock système.
          </Alert>
          <TextField label="Notes générales" value={notes} onChange={e => setNotes(e.target.value)} fullWidth sx={{ mb: 2 }} />
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Produit</TableCell>
                  <TableCell>Référence</TableCell>
                  <TableCell align="center">Stock système</TableCell>
                  <TableCell align="center">Qté physique</TableCell>
                  <TableCell align="center">Écart</TableCell>
                  <TableCell>Commentaire</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, i) => {
                  const product = products.find((p: any) => p.id === item.productId);
                  const diff = Number(item.qtyPhysical) - (product?.qty || 0);
                  return (
                    <TableRow key={item.productId}>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{product?.name}</Typography></TableCell>
                      <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{product?.reference || '—'}</Typography></TableCell>
                      <TableCell align="center"><Chip label={product?.qty || 0} size="small" /></TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number" value={item.qtyPhysical}
                          onChange={e => updateItem(i, 'qtyPhysical', e.target.value)}
                          size="small" sx={{ width: 80 }} slotProps={{ htmlInput: { min: 0 } }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {diff !== 0 && (
                          <Chip
                            label={diff > 0 ? `+${diff}` : diff}
                            size="small"
                            color={diff > 0 ? 'success' : 'error'}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <TextField
                          placeholder={diff !== 0 ? 'Commentaire obligatoire *' : ''}
                          value={item.comment}
                          onChange={e => updateItem(i, 'comment', e.target.value)}
                          size="small" fullWidth
                          error={diff !== 0 && !item.comment.trim()}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setCreateDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreate} disabled={createMutation.isPending}>
            Valider l'inventaire et corriger les stocks
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialog.open} onClose={() => setViewDialog({ open: false })} maxWidth="lg" fullWidth>
        <DialogTitle>Détail inventaire du {viewDialog.session && dayjs(viewDialog.session.createdAt).format('DD/MM/YYYY HH:mm')}</DialogTitle>
        <DialogContent>
          {viewDialog.session?.notes && <Alert severity="info" sx={{ mb: 2 }}>{viewDialog.session.notes}</Alert>}
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Produit</TableCell>
                <TableCell align="center">Stock système</TableCell>
                <TableCell align="center">Qté physique</TableCell>
                <TableCell align="center">Écart</TableCell>
                <TableCell>Commentaire</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {viewDialog.session?.items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell><Typography variant="body2">{item.product?.name}</Typography></TableCell>
                    <TableCell align="center">{item.qtySystem}</TableCell>
                    <TableCell align="center">{item.qtyPhysical}</TableCell>
                    <TableCell align="center">
                      {item.difference !== 0 ? (
                        <Chip label={item.difference > 0 ? `+${item.difference}` : item.difference} size="small" color={item.difference > 0 ? 'success' : 'error'} />
                      ) : <Chip label="=" size="small" color="default" />}
                    </TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{item.comment || '—'}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewDialog({ open: false })}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
