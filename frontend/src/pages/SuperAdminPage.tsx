import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  CircularProgress,
  Tabs,
  Tab,
  Avatar,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Store as StoreIcon,
  CheckCircle as ActiveIcon,
  Warning as ExpiringIcon,
  Error as ExpiredIcon,
  Block as BlockIcon,
  AttachMoney as MoneyIcon,
  Update as RenewIcon,
  LockOpen as UnlockIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  People as UsersIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superAdminService } from '../services';

export default function SuperAdminPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modales
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [viewTenantId, setViewTenantId] = useState<string | null>(null);
  const [detailsTab, setDetailsTab] = useState<number>(0);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  // Formulaire Renouvellement
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [renewAmount, setRenewAmount] = useState<string>('40');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [renewNotes, setRenewNotes] = useState<string>('');

  // Formulaire Création Boutique
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    adminEmail: '',
    adminPassword: '',
    plan: 'MONTHLY',
    durationMonths: 1,
    amount: 40,
    paymentMethod: 'CASH',
  });

  // Formulaire Blocage
  const [blockReason, setBlockReason] = useState('');

  // ─── Requêtes API ────────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['superadmin-stats'],
    queryFn: superAdminService.getStats,
  });

  const { data: tenantsData, isLoading: tenantsLoading, refetch: refetchTenants } = useQuery({
    queryKey: ['superadmin-tenants', search, statusFilter],
    queryFn: () => superAdminService.getTenants({ search, status: statusFilter }),
  });

  const { data: tenantDetails, isLoading: tenantDetailsLoading } = useQuery({
    queryKey: ['superadmin-tenant-details', viewTenantId],
    queryFn: () => superAdminService.getTenant(viewTenantId!),
    enabled: !!viewTenantId && detailsDialogOpen,
  });

  // ─── Mutations ───────────────────────────────────────────────────────────
  const renewMutation = useMutation({
    mutationFn: (data: any) =>
      superAdminService.renewSubscription(selectedTenant.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-tenants'] });
      setRenewDialogOpen(false);
      setSelectedTenant(null);
    },
  });

  const toggleBlockMutation = useMutation({
    mutationFn: (data: any) =>
      superAdminService.toggleBlock(selectedTenant.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-tenants'] });
      setBlockDialogOpen(false);
      setSelectedTenant(null);
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: (data: any) => superAdminService.createTenant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-tenants'] });
      setCreateDialogOpen(false);
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        adminEmail: '',
        adminPassword: '',
        plan: 'MONTHLY',
        durationMonths: 1,
        amount: 40,
        paymentMethod: 'CASH',
      });
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleOpenRenew = (tenant: any, defaultMonths = 1, defaultAmt = 40) => {
    setSelectedTenant(tenant);
    setDurationMonths(defaultMonths);
    setRenewAmount(String(defaultAmt));
    setPaymentMethod('CASH');
    setRenewNotes('');
    setRenewDialogOpen(true);
  };

  const handleOpenBlock = (tenant: any) => {
    setSelectedTenant(tenant);
    setBlockReason('');
    setBlockDialogOpen(true);
  };

  const handleOpenDetails = (tenantId: string) => {
    setViewTenantId(tenantId);
    setDetailsTab(0);
    setDetailsDialogOpen(true);
  };

  const handleRenewSubmit = () => {
    if (!selectedTenant) return;
    renewMutation.mutate({
      durationMonths: Number(durationMonths),
      amount: Number(renewAmount),
      paymentMethod,
      notes: renewNotes,
    });
  };

  const handleBlockSubmit = () => {
    if (!selectedTenant) return;
    toggleBlockMutation.mutate({
      isBlocked: !selectedTenant.isBlocked,
      blockReason,
    });
  };

  const handleCreateSubmit = () => {
    createTenantMutation.mutate({
      ...createForm,
      durationMonths: Number(createForm.durationMonths),
      amount: Number(createForm.amount),
    });
  };

  // Statut badge
  const renderStatusBadge = (tenant: any) => {
    if (tenant.isBlocked) {
      return <Chip size="small" icon={<BlockIcon />} label="Suspendu" color="error" variant="filled" />;
    }
    if (tenant.status === 'EXPIRED') {
      return <Chip size="small" icon={<ExpiredIcon />} label="Expiré" color="error" variant="outlined" />;
    }
    if (tenant.status === 'TRIAL') {
      return (
        <Chip
          size="small"
          label={`Essai (${tenant.daysLeft}j)`}
          sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 600 }}
        />
      );
    }
    if (tenant.isExpiringSoon) {
      return (
        <Chip
          size="small"
          icon={<ExpiringIcon />}
          label={`Expire dans ${tenant.daysLeft}j`}
          color="warning"
        />
      );
    }
    return (
      <Chip
        size="small"
        icon={<ActiveIcon />}
        label={`Actif (${tenant.daysLeft}j)`}
        color="success"
      />
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* En-tête */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', mb: 0.5 }}>
            Contrôle Super-Admin — Vos Clients
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Supervisez les boutiques, contrôlez les accès et prolongez les abonnements payés.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              refetchStats();
              refetchTenants();
            }}
          >
            Actualiser
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ bgcolor: '#1A56DB', '&:hover': { bgcolor: '#1E429F' } }}
          >
            Nouveau Client
          </Button>
        </Box>
      </Box>

      {/* Cartes KPI */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" color="text.secondary">Total Boutiques</Typography>
                <StoreIcon sx={{ color: '#1A56DB' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: '#1E293B' }}>
                {statsLoading ? <CircularProgress size={24} /> : stats?.totalTenants || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" color="text.secondary">Boutiques Actives</Typography>
                <ActiveIcon sx={{ color: '#0E9F6E' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: '#0E9F6E' }}>
                {statsLoading ? <CircularProgress size={24} /> : stats?.activeCount || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" color="text.secondary">Périodes d'Essai</Typography>
                <Typography sx={{ fontWeight: 700, color: '#B45309' }}>14j</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: '#D97706' }}>
                {statsLoading ? <CircularProgress size={24} /> : stats?.trialCount || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" color="text.secondary">Expire sous 7j</Typography>
                <ExpiringIcon sx={{ color: '#E02424' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: '#E02424' }}>
                {statsLoading ? <CircularProgress size={24} /> : stats?.expiringSoonCount || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ borderRadius: 3, bgcolor: '#F8FAFC', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" color="text.secondary">Revenus Encaissés</Typography>
                <MoneyIcon sx={{ color: '#7E3AF2' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 1, color: '#7E3AF2' }}>
                {statsLoading ? <CircularProgress size={24} /> : `${(stats?.totalRevenue || 0).toFixed(3)} DT`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Barre de Recherche et Filtres */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Rechercher par nom, email, téléphone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 260 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
        />

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Filtrer par statut</InputLabel>
          <Select
            value={statusFilter}
            label="Filtrer par statut"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">Tous les statuts</MenuItem>
            <MenuItem value="ACTIVE">Actifs uniquement</MenuItem>
            <MenuItem value="TRIAL">Période d'essai</MenuItem>
            <MenuItem value="EXPIRED">Expirés</MenuItem>
            <MenuItem value="SUSPENDED">Suspendus / Bloqués</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* Tableau des Clients */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Boutique & Contact</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Plan</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Statut & Validité</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Expiration</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Activité</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Total Payé</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenantsLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : tenantsData?.items?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">Aucun client trouvé.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              tenantsData?.items?.map((t: any) => (
                <TableRow key={t.id} hover>
                  <TableCell>
                    <Box
                      onClick={() => handleOpenDetails(t.id)}
                      sx={{
                        cursor: 'pointer',
                        display: 'inline-block',
                        '&:hover .tenant-name': { color: 'primary.main', textDecoration: 'underline' },
                      }}
                    >
                      <Typography variant="subtitle2" className="tenant-name" sx={{ fontWeight: 700, color: '#1E293B', transition: 'color 0.15s' }}>
                        {t.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {t.email} {t.phone ? `• ${t.phone}` : ''}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      label={t.plan === 'YEARLY' ? 'Annuel' : t.plan === 'MONTHLY' ? 'Mensuel' : 'Essai'}
                      variant="outlined"
                    />
                  </TableCell>

                  <TableCell>{renderStatusBadge(t)}</TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {new Date(t.subscriptionExpiresAt).toLocaleDateString('fr-FR')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.daysLeft > 0 ? `${t.daysLeft} jours restants` : 'Période terminée'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                      <strong>{t.counts.users}</strong> utilisateurs • <strong>{t.counts.products}</strong> produits
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      <strong>{t.counts.sales}</strong> ventes enregistrées
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0E9F6E' }}>
                      {t.totalRevenue.toFixed(3)} DT
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Tooltip title="Fiche détaillée & Utilisateurs">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenDetails(t.id)}
                          sx={{ bgcolor: 'rgba(26, 86, 219, 0.08)', '&:hover': { bgcolor: 'rgba(26, 86, 219, 0.16)' } }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Prolonger de 1 mois (+40 DT)">
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={() => handleOpenRenew(t, 1, 40)}
                          sx={{ textTransform: 'none', px: 1 }}
                        >
                          +1 Mois
                        </Button>
                      </Tooltip>

                      <Tooltip title="Prolonger de 1 an (+400 DT)">
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => handleOpenRenew(t, 12, 400)}
                          sx={{ textTransform: 'none', px: 1 }}
                        >
                          +1 An
                        </Button>
                      </Tooltip>

                      <Tooltip title={t.isBlocked ? 'Débloquer la boutique' : 'Suspendre l\'accès'}>
                        <IconButton
                          size="small"
                          color={t.isBlocked ? 'success' : 'error'}
                          onClick={() => handleOpenBlock(t)}
                        >
                          {t.isBlocked ? <UnlockIcon /> : <BlockIcon />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ─── MODALE PROLONGER ABONNEMENT ────────────────────────────────────── */}
      <Dialog open={renewDialogOpen} onClose={() => setRenewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Prolonger l'abonnement — {selectedTenant?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Alert severity="info">
              Expiration actuelle : <strong>{selectedTenant && new Date(selectedTenant.subscriptionExpiresAt).toLocaleDateString('fr-FR')}</strong> ({selectedTenant?.daysLeft} jours restants).
            </Alert>

            <FormControl fullWidth>
              <InputLabel>Durée à ajouter</InputLabel>
              <Select
                value={durationMonths}
                label="Durée à ajouter"
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setDurationMonths(m);
                  if (m === 1) setRenewAmount('40');
                  else if (m === 12) setRenewAmount('400');
                  else setRenewAmount(String(m * 35));
                }}
              >
                <MenuItem value={1}>1 Mois (+30 jours)</MenuItem>
                <MenuItem value={3}>3 Mois (+90 jours)</MenuItem>
                <MenuItem value={6}>6 Mois (+180 jours)</MenuItem>
                <MenuItem value={12}>1 An (+365 jours) — Offre annuelle</MenuItem>
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Montant encaissé (DT)"
                  type="number"
                  value={renewAmount}
                  onChange={(e) => setRenewAmount(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Moyen de paiement</InputLabel>
                  <Select
                    value={paymentMethod}
                    label="Moyen de paiement"
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <MenuItem value="CASH">Espèces (Cash)</MenuItem>
                    <MenuItem value="D17">D17 (Poste)</MenuItem>
                    <MenuItem value="VIREMENT">Virement Bancaire</MenuItem>
                    <MenuItem value="CHEQUE">Chèque</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Note / Commentaire (optionnel)"
              placeholder="Ex: Payé en main propre à Tunis"
              value={renewNotes}
              onChange={(e) => setRenewNotes(e.target.value)}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRenewDialogOpen(false)}>Annuler</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<RenewIcon />}
            onClick={handleRenewSubmit}
            disabled={renewMutation.isPending}
          >
            {renewMutation.isPending ? 'Enregistrement...' : 'Valider & Prolonger'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── MODALE SUSPENDRE / DÉBLOQUER ───────────────────────────────────── */}
      <Dialog open={blockDialogOpen} onClose={() => setBlockDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: selectedTenant?.isBlocked ? '#0E9F6E' : '#E02424' }}>
          {selectedTenant?.isBlocked ? 'Réactiver la boutique' : 'Suspendre l\'accès à la boutique'}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {selectedTenant?.isBlocked
              ? `Voulez-vous réactiver l'accès pour la boutique "${selectedTenant?.name}" ? Les employés pourront à nouveau se connecter.`
              : `Voulez-vous suspendre "${selectedTenant?.name}" ? Tous les utilisateurs de cette boutique seront immédiatement bloqués.`}
          </Typography>
          {!selectedTenant?.isBlocked && (
            <TextField
              fullWidth
              label="Motif de la suspension"
              placeholder="Ex: Facture impayée depuis plus de 15 jours"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              multiline
              rows={2}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBlockDialogOpen(false)}>Annuler</Button>
          <Button
            variant="contained"
            color={selectedTenant?.isBlocked ? 'success' : 'error'}
            onClick={handleBlockSubmit}
            disabled={toggleBlockMutation.isPending}
          >
            {selectedTenant?.isBlocked ? 'Réactiver' : 'Bloquer la boutique'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── MODALE CRÉATION BOUTIQUE ───────────────────────────────────────── */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Créer un nouveau client boutique</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1A56DB' }}>
              1. Informations de la boutique
            </Typography>

            <TextField
              label="Nom de la boutique"
              placeholder="Ex: Boutique Phone Plus"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              fullWidth
              required
            />

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Email de la boutique"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Téléphone"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  fullWidth
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1A56DB', mt: 1 }}>
              2. Compte Administrateur du Client
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Email Administrateur"
                  value={createForm.adminEmail}
                  onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Mot de passe provisoire"
                  type="password"
                  value={createForm.adminPassword}
                  onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1A56DB', mt: 1 }}>
              3. Abonnement & Paiement initial
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Durée accordée</InputLabel>
                  <Select
                    value={createForm.durationMonths}
                    label="Durée accordée"
                    onChange={(e) => {
                      const m = Number(e.target.value);
                      setCreateForm({
                        ...createForm,
                        durationMonths: m,
                        plan: m >= 12 ? 'YEARLY' : 'MONTHLY',
                        amount: m === 1 ? 40 : m === 12 ? 400 : m * 35,
                      });
                    }}
                  >
                    <MenuItem value={1}>1 Mois (Mensuel)</MenuItem>
                    <MenuItem value={3}>3 Mois</MenuItem>
                    <MenuItem value={6}>6 Mois</MenuItem>
                    <MenuItem value={12}>1 An (Annuel)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Montant reçu (DT)"
                  type="number"
                  value={createForm.amount}
                  onChange={(e) => setCreateForm({ ...createForm, amount: Number(e.target.value) })}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleCreateSubmit}
            disabled={
              createTenantMutation.isPending ||
              !createForm.name ||
              !createForm.email ||
              !createForm.adminEmail ||
              !createForm.adminPassword
            }
          >
            {createTenantMutation.isPending ? 'Création...' : 'Créer le Client'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── MODALE DÉTAILS COMPLETS DE LA BOUTIQUE & UTILISATEURS ───────────── */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ p: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: 'primary.50', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <StoreIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {tenantDetails?.name || 'Chargement...'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Fiche détaillée et utilisateurs de la boutique
              </Typography>
            </Box>
          </Box>
          {tenantDetails && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={tenantDetails.plan === 'YEARLY' ? 'Abonnement Annuel' : tenantDetails.plan === 'MONTHLY' ? 'Abonnement Mensuel' : "Période d'essai"}
                size="small"
                variant="outlined"
              />
              <Chip
                label={tenantDetails.isBlocked ? 'Suspendu' : tenantDetails.status === 'ACTIVE' ? 'Actif' : tenantDetails.status === 'EXPIRED' ? 'Expiré' : 'Essai'}
                color={tenantDetails.isBlocked ? 'error' : tenantDetails.status === 'ACTIVE' ? 'success' : 'warning'}
                size="small"
              />
            </Box>
          )}
        </DialogTitle>

        <Box sx={{ px: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tabs value={detailsTab} onChange={(_, val) => setDetailsTab(val)}>
            <Tab icon={<UsersIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Utilisateurs & Activité (${tenantDetails?.users?.length || 0})`} />
            <Tab icon={<ReceiptIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Historique Paiements (${tenantDetails?.payments?.length || 0})`} />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: 2.5 }}>
          {tenantDetailsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : !tenantDetails ? (
            <Alert severity="error">Impossible de charger les données de cette boutique.</Alert>
          ) : detailsTab === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Infos Contact & Compteurs */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', bgcolor: '#F8FAFC' }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
                      {tenantDetails.counts?.users || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Utilisateurs
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', bgcolor: '#F8FAFC' }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#0E9F6E' }}>
                      {tenantDetails.counts?.products || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Produits en catalogue
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', bgcolor: '#F8FAFC' }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#7E3AF2' }}>
                      {tenantDetails.counts?.sales || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Ventes enregistrées
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', bgcolor: '#F8FAFC' }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#D97706' }}>
                      {tenantDetails.counts?.suppliers || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Fournisseurs
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Coordonnées */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Email boutique :</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{tenantDetails.email}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Téléphone :</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{tenantDetails.phone || 'Non renseigné'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Date d'inscription :</Typography>
                    <Typography variant="body2">{new Date(tenantDetails.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Expiration de l'abonnement :</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: tenantDetails.daysLeft <= 7 ? 'error.main' : 'text.primary' }}>
                      {new Date(tenantDetails.subscriptionExpiresAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} ({tenantDetails.daysLeft} jours restants)
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Tableau des utilisateurs de la boutique */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#1E293B' }}>
                  Comptes utilisateurs de la boutique ({tenantDetails.users?.length || 0})
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Utilisateur</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Rôle</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Créé le</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tenantDetails.users?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                            <Typography variant="body2" color="text.secondary">Aucun utilisateur rattaché.</Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        tenantDetails.users?.map((u: any) => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar sx={{ width: 30, height: 30, bgcolor: u.role === 'ADMIN' ? 'primary.main' : 'grey.500', fontSize: '0.75rem', fontWeight: 700 }}>
                                  {u.email.charAt(0).toUpperCase()}
                                </Avatar>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {u.email}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={u.role === 'ADMIN' ? 'Administrateur Gérant' : 'Vendeur / Caisse'}
                                color={u.role === 'ADMIN' ? 'primary' : 'default'}
                                variant={u.role === 'ADMIN' ? 'filled' : 'outlined'}
                                sx={{ height: 22, fontSize: '0.7rem' }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={u.isActive ? 'Actif' : 'Désactivé'}
                                color={u.isActive ? 'success' : 'error'}
                                sx={{ height: 20, fontSize: '0.65rem' }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          ) : (
            /* Tab 1 : Historique des paiements */
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#1E293B' }}>
                Historique des encaissements & renouvellements
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Date d'encaissement</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Montant</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Durée</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Période couverte</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Moyen de paiement</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tenantDetails.payments?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">Aucun paiement enregistré pour cette boutique pour le moment.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      tenantDetails.payments?.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {new Date(p.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#0E9F6E' }}>
                              {p.amount.toFixed(3)} DT
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={`+${p.durationMonths} mois`} variant="outlined" sx={{ height: 22 }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(p.startDate).toLocaleDateString('fr-FR')} → {new Date(p.endDate).toLocaleDateString('fr-FR')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={p.paymentMethod} sx={{ height: 20, fontSize: '0.65rem' }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {p.notes || '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailsDialogOpen(false)} variant="contained">
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
