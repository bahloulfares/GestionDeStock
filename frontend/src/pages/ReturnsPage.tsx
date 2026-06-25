import { useState } from 'react';
import {
  Box, Card, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress, IconButton, Pagination, Stack,
} from '@mui/material';
import { Visibility as ViewIcon, CheckCircle as CheckIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { returnsService } from '../services';
import { authStore } from '../store/auth.store';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, any> = { PENDING: 'warning', COMPLETED: 'success', REJECTED: 'error' };
const REASON_LABELS: Record<string, string> = { BROKEN: 'Cassé/Défectueux', WRONG_ITEM: 'Erreur article', REFUND: 'Remboursement' };

export default function ReturnsPage() {
  const qc = useQueryClient();
  const isAdmin = authStore.isAdmin();
  const [page, setPage] = useState(1);
  const [viewDialog, setViewDialog] = useState<{ open: boolean; ret?: any }>({ open: false });

  const { data, isLoading } = useQuery({
    queryKey: ['returns', page],
    queryFn: () => returnsService.getAll({ page, limit: 15 }),
  });

  const validateMutation = useMutation({
    mutationFn: returnsService.validate,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['returns'] }); qc.invalidateQueries({ queryKey: ['products'] }); setViewDialog({ open: false }); },
  });

  const rejectMutation = useMutation({
    mutationFn: returnsService.reject,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['returns'] }); setViewDialog({ open: false }); },
  });

  const totalPages = Math.ceil((data?.total || 0) / 15);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Retours clients</Typography>
        <Typography variant="subtitle1">{data?.total || 0} demande(s) de retour</Typography>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Vente N°</TableCell>
                <TableCell>Créé par</TableCell>
                <TableCell align="center">Articles</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : data?.data?.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell><Typography variant="body2">{dayjs(r.createdAt).format('DD/MM/YYYY HH:mm')}</Typography></TableCell>
                  <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>#{r.sale?.id.slice(-8).toUpperCase()}</Typography></TableCell>
                  <TableCell>{r.createdByUser?.email}</TableCell>
                  <TableCell align="center"><Chip label={r.items?.length || 0} size="small" /></TableCell>
                  <TableCell><Chip label={r.status === 'PENDING' ? 'En attente' : r.status === 'COMPLETED' ? 'Validé' : 'Refusé'} size="small" color={STATUS_COLORS[r.status]} /></TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => setViewDialog({ open: true, ret: r })}><ViewIcon fontSize="small" /></IconButton>
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

      {/* View/Process Dialog */}
      <Dialog open={viewDialog.open} onClose={() => setViewDialog({ open: false })} maxWidth="md" fullWidth>
        <DialogTitle>Détail du retour</DialogTitle>
        <DialogContent>
          {viewDialog.ret && (
            <Box>
              <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
                <Box><Typography variant="caption" color="text.secondary">Vente</Typography><Typography sx={{ fontFamily: 'monospace' }}>#{viewDialog.ret.sale?.id.slice(-8).toUpperCase()}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Créé le</Typography><Typography>{dayjs(viewDialog.ret.createdAt).format('DD/MM/YYYY HH:mm')}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Statut</Typography><div><Chip label={viewDialog.ret.status} size="small" color={STATUS_COLORS[viewDialog.ret.status]} /></div></Box>
              </Stack>
              {viewDialog.ret.notes && (
                <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">Notes : {viewDialog.ret.notes}</Typography>
                </Box>
              )}
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Articles retournés</Typography>
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell>Produit</TableCell>
                  <TableCell align="center">Qté</TableCell>
                  <TableCell>Motif</TableCell>
                  <TableCell align="center">Remis en stock ?</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {viewDialog.ret.items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product?.name}</TableCell>
                      <TableCell align="center">{item.qty}</TableCell>
                      <TableCell><Chip label={REASON_LABELS[item.reason] || item.reason} size="small" variant="outlined" /></TableCell>
                      <TableCell align="center">
                        <Chip label={item.returnToStock ? 'Oui' : 'Non'} size="small" color={item.returnToStock ? 'success' : 'default'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewDialog({ open: false })}>Fermer</Button>
          {isAdmin && viewDialog.ret?.status === 'PENDING' && (
            <>
              <Button color="error" startIcon={<CancelIcon />} onClick={() => rejectMutation.mutate(viewDialog.ret.id)} disabled={rejectMutation.isPending || validateMutation.isPending}>
                Refuser
              </Button>
              <Button variant="contained" color="success" startIcon={<CheckIcon />} onClick={() => validateMutation.mutate(viewDialog.ret.id)} disabled={validateMutation.isPending || rejectMutation.isPending}>
                Valider le retour
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
