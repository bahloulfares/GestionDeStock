import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as ActiveIcon,
  Warning as ExpiringIcon,
  Error as ExpiredIcon,
  Phone as PhoneIcon,
  WhatsApp as WhatsAppIcon,
  AccountBalance as BankIcon,
  ReceiptLong as ReceiptIcon,
  VerifiedUser as ShieldIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { tenantSubscriptionService } from '../services';

export default function MySubscriptionPage() {
  const { data: sub, isLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: tenantSubscriptionService.getMySubscription,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isExpired = sub?.isExpired;
  const isTrial = sub?.status === 'TRIAL';
  const isExpiringSoon = sub?.isExpiringSoon;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', mb: 0.5 }}>
          Mon Abonnement StockTN
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Consultez l'état de votre licence et les modalités de renouvellement.
        </Typography>
      </Box>

      {/* Bannière principale de Statut */}
      {isExpired ? (
        <Alert severity="error" icon={<ExpiredIcon fontSize="large" />} sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Votre abonnement a expiré
          </Typography>
          <Typography variant="body2">
            La création de nouvelles ventes et de nouveaux produits est momentanément suspendue. Vos données existantes restent conservées en toute sécurité. Veuillez nous contacter pour réactiver immédiatement votre accès.
          </Typography>
        </Alert>
      ) : isExpiringSoon ? (
        <Alert severity="warning" icon={<ExpiringIcon fontSize="large" />} sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Attention : Votre abonnement expire dans {sub?.daysLeft} jours !
          </Typography>
          <Typography variant="body2">
            Pensez à renouveler dès maintenant votre licence pour continuer à utiliser votre caisse et vos stocks sans interruption.
          </Typography>
        </Alert>
      ) : isTrial ? (
        <Alert severity="info" icon={<ShieldIcon fontSize="large" />} sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Période d'essai gratuite en cours ({sub?.daysLeft} jours restants)
          </Typography>
          <Typography variant="body2">
            Profitez de toutes les fonctionnalités de StockTN sans restriction. Contactez-nous à tout moment pour passer à un abonnement mensuel ou annuel.
          </Typography>
        </Alert>
      ) : (
        <Alert severity="success" icon={<ActiveIcon fontSize="large" />} sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Votre licence est active et à jour
          </Typography>
          <Typography variant="body2">
            Votre compte dispose d'un accès complet jusqu'au {new Date(sub?.expiresAt).toLocaleDateString('fr-FR')} ({sub?.daysLeft} jours restants).
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Détails Abonnement */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: 3, height: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1E293B' }}>
                Détails de la licence
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Boutique</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{sub?.shopName}</Typography>
                </Box>
                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Formule</Typography>
                  <Chip
                    label={sub?.plan === 'YEARLY' ? 'Abonnement Annuel' : sub?.plan === 'MONTHLY' ? 'Abonnement Mensuel' : 'Essai Gratuit'}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                </Box>
                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Statut du compte</Typography>
                  <Chip
                    label={isExpired ? 'Expiré' : isTrial ? 'Essai Gratuit' : 'Actif'}
                    color={isExpired ? 'error' : isTrial ? 'warning' : 'success'}
                    size="small"
                  />
                </Box>
                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Date d'expiration</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('fr-FR') : '—'}
                  </Typography>
                </Box>
                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Temps restant</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isExpired ? '#E02424' : '#0E9F6E' }}>
                    {sub?.daysLeft} jours
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Modalités de Renouvellement & Contact Propriétaire */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: 3, height: '100%', bgcolor: '#F8FAFC', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#1E293B' }}>
                Renouveler mon abonnement
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Pour prolonger votre abonnement d'un mois ou d'un an, contactez directement l'équipe StockTN par téléphone ou virement :
              </Typography>

              <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <PhoneIcon sx={{ color: '#1A56DB' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Téléphone & WhatsApp Support</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>+216 22 000 000</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <WhatsAppIcon sx={{ color: '#0E9F6E' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Assistance Rapide</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>WhatsApp Disponible 7j/7</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <BankIcon sx={{ color: '#7E3AF2' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Moyens de paiement acceptés</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Espèces • D17 (Poste) • Virement bancaire
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              <Box sx={{ p: 2, bgcolor: '#EEF2FF', borderRadius: 2, border: '1px dashed #6366F1' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#3730A3', mb: 0.5 }}>
                  Tarifs indicatifs
                </Typography>
                <Typography variant="body2" sx={{ color: '#4338CA' }}>
                  • <strong>Mensuel</strong> : 40 DT / mois<br />
                  • <strong>Annuel</strong> : 400 DT / an (2 mois offerts)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Historique des Paiements */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1E293B' }}>
                Historique de vos règlements
              </Typography>

              {sub?.recentPayments?.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Aucun paiement enregistré pour l'instant (compte en période d'essai gratuit).
                </Typography>
              ) : (
                <List disablePadding>
                  {sub?.recentPayments?.map((p: any) => (
                    <ListItem
                      key={p.id}
                      sx={{
                        px: 2,
                        py: 1.5,
                        mb: 1,
                        bgcolor: '#F8FAFC',
                        borderRadius: 2,
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <ListItemIcon>
                        <ReceiptIcon sx={{ color: '#10B981' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            Paiement validé : {p.amount.toFixed(3)} DT (+{p.durationMonths} mois)
                          </Typography>
                        }
                        secondary={`Période : du ${new Date(p.startDate).toLocaleDateString('fr-FR')} au ${new Date(p.endDate).toLocaleDateString('fr-FR')} • Mode : ${p.paymentMethod}`}
                      />
                      <Chip label="Payé" color="success" size="small" variant="outlined" />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
