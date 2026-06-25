import { useState } from 'react';
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Stack, CircularProgress, Switch,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../services';
import dayjs from 'dayjs';

export default function UsersPage() {
  const qc = useQueryClient();
  const [createDialog, setCreateDialog] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', role: 'EMPLOYEE' });
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: usersService.getAll });

  const createMutation = useMutation({
    mutationFn: usersService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setCreateDialog(false); setForm({ email: '', password: '', role: 'EMPLOYEE' }); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => usersService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Utilisateurs</Typography>
          <Typography variant="subtitle1">{(data || []).length} compte(s) dans votre boutique</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm({ email: '', password: '', role: 'EMPLOYEE' }); setError(''); setCreateDialog(true); }}>
          Nouvel utilisateur
        </Button>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell>Créé le</TableCell>
                <TableCell>Vérifié</TableCell>
                <TableCell align="center">Actif</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : (data || []).map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{u.email}</Typography></TableCell>
                  <TableCell>
                    <Chip label={u.role === 'ADMIN' ? 'Administrateur' : 'Employé'} size="small" color={u.role === 'ADMIN' ? 'primary' : 'default'} />
                  </TableCell>
                  <TableCell><Typography variant="caption">{dayjs(u.createdAt).format('DD/MM/YYYY')}</Typography></TableCell>
                  <TableCell>
                    <Chip label={u.isVerified ? 'Oui' : 'Non'} size="small" color={u.isVerified ? 'success' : 'warning'} />
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={u.isActive}
                      size="small"
                      onChange={e => updateMutation.mutate({ id: u.id, data: { isActive: e.target.checked } })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nouvel utilisateur</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Email *" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} fullWidth />
            <TextField label="Mot de passe *" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Rôle</InputLabel>
              <Select value={form.role} label="Rôle" onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <MenuItem value="EMPLOYEE">Employé</MenuItem>
                <MenuItem value="ADMIN">Administrateur</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setCreateDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>Créer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
