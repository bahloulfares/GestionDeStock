import {
  Box, Typography, Grid, Card, CardContent, CircularProgress, Alert, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, LinearProgress, Button
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { reportsService } from '../services';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import dayjs from 'dayjs';

export default function ReportsPage() {
  const { data: topProducts, isLoading: tp } = useQuery({ queryKey: ['rpt-top'], queryFn: () => reportsService.topProducts({ limit: 10 }) });
  const { data: stockValue, isLoading: sv } = useQuery({ queryKey: ['rpt-stockval'], queryFn: reportsService.stockValue });
  const { data: alerts, isLoading: al } = useQuery({ queryKey: ['rpt-alerts'], queryFn: reportsService.stockAlerts });
  const { data: salesPeriod, isLoading: sp } = useQuery({
    queryKey: ['rpt-period'],
    queryFn: () => reportsService.salesByPeriod({
      startDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
      endDate: dayjs().format('YYYY-MM-DD'),
      groupBy: 'day',
    }),
  });

  const COLORS = ['#1A56DB', '#7E3AF2', '#0E9F6E', '#FF5A1F', '#3F83F8', '#F59E0B', '#EC4899', '#6B7280', '#10B981', '#EF4444'];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Rapports</Typography>
          <Typography variant="subtitle1">Analyses et statistiques de votre boutique</Typography>
        </Box>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => reportsService.downloadSalesExcel()}>
          Exporter ventes (Excel)
        </Button>
      </Box>

      <Grid container spacing={2.5}>
        {/* Top produits */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>🏆 Top produits vendus</Typography>
              {tp ? <CircularProgress size={24} /> : (topProducts || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>Aucune donnée</Typography>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProducts} margin={{ top: 5, right: 10, left: 0, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="productName" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(val: any) => [val, 'Unités vendues']} />
                    <Bar dataKey="totalQty" radius={[4, 4, 0, 0]}>
                      {(topProducts || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Valeur stock */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>📦 Valeur du stock</Typography>
              {sv ? <CircularProgress size={24} /> : (
                <Box>
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.100' }}>
                    <Typography variant="caption" color="text.secondary">Valeur totale estimée</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800 }} color="primary.main">
                      {Number(stockValue?.totalValue || 0).toFixed(3)} TND
                    </Typography>
                  </Box>
                  <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                    {(stockValue?.byCategory || []).map((cat: any) => (
                      <Box key={cat.categoryName} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{cat.categoryName}</Typography>
                          <Typography variant="body2">{Number(cat.value).toFixed(3)} TND</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, (cat.value / stockValue.totalValue) * 100)}
                          sx={{ borderRadius: 2 }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Ventes 30 derniers jours */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>📈 Évolution des ventes (30 derniers jours)</Typography>
              {sp ? <CircularProgress size={24} /> : (salesPeriod || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>Aucune donnée sur cette période</Typography>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={salesPeriod} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(val: any) => [`${Number(val).toFixed(3)} TND`]} />
                    <Bar dataKey="total" fill="#1A56DB" radius={[4, 4, 0, 0]} name="Total ventes" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Alertes stock */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h6">⚠️ Alertes stock</Typography>
                {(alerts || []).length > 0 && <Chip label={`${alerts.length} produit(s)`} size="small" color="warning" />}
              </Box>
              {al ? <CircularProgress size={24} /> : (alerts || []).length === 0 ? (
                <Alert severity="success">Tous les stocks sont au-dessus du seuil minimum ✅</Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead><TableRow>
                      <TableCell>Produit</TableCell>
                      <TableCell>Référence</TableCell>
                      <TableCell>Catégorie</TableCell>
                      <TableCell align="center">Stock actuel</TableCell>
                      <TableCell align="center">Minimum</TableCell>
                      <TableCell align="center">Manquant</TableCell>
                    </TableRow></TableHead>
                    <TableBody>
                      {(alerts || []).map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{p.name}</Typography></TableCell>
                          <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{p.reference || '—'}</Typography></TableCell>
                          <TableCell><Chip label={p.categoryName || '—'} size="small" variant="outlined" /></TableCell>
                          <TableCell align="center"><Chip label={p.qty} size="small" color={p.qty === 0 ? 'error' : 'warning'} /></TableCell>
                          <TableCell align="center"><Typography variant="body2">{p.minStock}</Typography></TableCell>
                          <TableCell align="center"><Chip label={`-${p.missingQty}`} size="small" color="error" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
