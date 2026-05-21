import {
  Box, Grid, Card, CardContent, Typography, CircularProgress,
  Divider, LinearProgress, Chip, Avatar, List, ListItem, ListItemAvatar,
  ListItemText, Alert,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Inventory2 as StockIcon,
  Warning as WarningIcon,
  MonetizationOn as RevenueIcon,
  PointOfSale as SaleIcon,
  AccountBalance as ValueIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services';
import dayjs from 'dayjs';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}

function KpiCard({ title, value, subtitle, icon, color, trend }: KpiCardProps) {
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 0.5 }}>{title}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.25 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
            )}
          </Box>
          <Box sx={{
            width: 48, height: 48, borderRadius: 2,
            backgroundColor: `${color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Box sx={{ color }}>{icon}</Box>
          </Box>
        </Box>
        {trend && (
          <Box sx={{ mt: 1.5 }}>
            <Chip label={trend} size="small" sx={{ bgcolor: `${color}18`, color, fontWeight: 600, fontSize: '0.7rem' }} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.get,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Erreur de chargement du tableau de bord</Alert>;
  }

  const formatCurrency = (val: number) => `${Number(val || 0).toFixed(3)} TND`;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Tableau de bord</Typography>
        <Typography variant="subtitle1">
          Mis à jour {dayjs().format('DD MMM YYYY à HH:mm')}
        </Typography>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={4}>
          <KpiCard
            title="CA Aujourd'hui"
            value={formatCurrency(data?.todayRevenue)}
            icon={<TrendingUpIcon />}
            color="#1A56DB"
            trend="Ventes du jour"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <KpiCard
            title="CA du mois"
            value={formatCurrency(data?.monthRevenue)}
            icon={<RevenueIcon />}
            color="#0E9F6E"
            trend="Mois en cours"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <KpiCard
            title="Valeur du stock"
            value={formatCurrency(data?.stockValue)}
            icon={<ValueIcon />}
            color="#7E3AF2"
            subtitle="Prix d'achat"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <KpiCard
            title="Produits actifs"
            value={data?.totalProducts || 0}
            icon={<StockIcon />}
            color="#3F83F8"
            subtitle="Références en catalogue"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <KpiCard
            title="Stocks critiques"
            value={data?.lowStockCount || 0}
            icon={<WarningIcon />}
            color="#FF5A1F"
            trend={data?.lowStockCount > 0 ? 'Action requise' : 'Tout va bien'}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {/* Ventes récentes */}
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Ventes récentes</Typography>
              {data?.recentSales?.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  Aucune vente récente
                </Typography>
              ) : (
                <List disablePadding>
                  {data?.recentSales?.map((sale: any, idx: number) => (
                    <Box key={sale.id}>
                      <ListItem disablePadding sx={{ py: 1.5 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.50', color: 'primary.main', fontSize: '0.75rem', fontWeight: 700 }}>
                            <SaleIcon fontSize="small" />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" fontWeight={600}>
                                Vente #{sale.id.slice(-6).toUpperCase()}
                              </Typography>
                              <Typography variant="body2" fontWeight={700} color="success.main">
                                {formatCurrency(sale.total)}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
                              <Typography variant="caption" color="text.secondary">
                                {sale.creatorEmail}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {dayjs(sale.date).format('DD/MM HH:mm')}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {idx < data.recentSales.length - 1 && <Divider />}
                    </Box>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Alertes stock */}
        <Grid item xs={12} lg={5}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                <Typography variant="h6">Alertes stock faible</Typography>
                {data?.lowStockAlerts?.length > 0 && (
                  <Chip label={data.lowStockAlerts.length} size="small" color="warning" sx={{ ml: 'auto' }} />
                )}
              </Box>
              {data?.lowStockAlerts?.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="success.main" fontWeight={600}>
                    ✅ Tous les stocks sont suffisants
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
                  {data?.lowStockAlerts?.map((product: any) => {
                    const pct = Math.min(100, (product.qty / product.minStock) * 100);
                    return (
                      <Box key={product.id} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8rem' }}>
                            {product.name}
                          </Typography>
                          <Chip
                            label={`${product.qty}/${product.minStock}`}
                            size="small"
                            color={product.qty === 0 ? 'error' : 'warning'}
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          color={product.qty === 0 ? 'error' : 'warning'}
                          sx={{ borderRadius: 2 }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
