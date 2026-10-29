import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Avatar,
  Badge, Tooltip, useTheme, useMediaQuery, Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory2 as ProductsIcon,
  Category as CategoryIcon,
  LocalShipping as SuppliersIcon,
  ShoppingCart as PurchasesIcon,
  PointOfSale as SalesIcon,
  BarChart as ReportsIcon,
  Warehouse as InventoryIcon,
  People as UsersIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Store as StoreIcon,
  Warning as WarningIcon,
  AssignmentReturn as ReturnsIcon,
  AdminPanelSettings as SuperAdminIcon,
  CardMembership as SubscriptionIcon,
} from '@mui/icons-material';
import { Alert, Button } from '@mui/material';
import { authStore } from '../../store/auth.store';
import { authService, tenantSubscriptionService } from '../../services';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services';

const DRAWER_WIDTH = 256;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  badge?: number;
}

interface AppLayoutProps {
  onLogout: () => void;
}

export default function AppLayout({ onLogout }: AppLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = authStore.getUser();
  const isSuperAdmin = authStore.isSuperAdmin();
  const isAdmin = authStore.isAdmin();

  const { data: dashData } = useQuery({
    queryKey: ['dashboard-mini'],
    queryFn: dashboardService.get,
    enabled: !isSuperAdmin,
    refetchInterval: 60000,
  });

  const { data: subData } = useQuery({
    queryKey: ['my-subscription-mini'],
    queryFn: tenantSubscriptionService.getMySubscription,
    enabled: !isSuperAdmin && !!user?.tenantId,
    refetchInterval: 120000,
  });

  const navItems: NavItem[] = [
    // Menu Super-Admin
    ...(isSuperAdmin
      ? [
          { label: 'Gestion Plateforme & Clients', path: '/super-admin', icon: <SuperAdminIcon /> },
        ]
      : []),
    // Menu Boutique Standard
    ...(!isSuperAdmin
      ? [
          { label: 'Tableau de bord', path: '/', icon: <DashboardIcon /> },
          { label: 'Produits', path: '/products', icon: <ProductsIcon />, badge: dashData?.lowStockCount || 0 },
          { label: 'Catégories', path: '/categories', icon: <CategoryIcon />, adminOnly: true },
          { label: 'Fournisseurs', path: '/suppliers', icon: <SuppliersIcon />, adminOnly: true },
          { label: 'Achats', path: '/purchases', icon: <PurchasesIcon />, adminOnly: true },
          { label: 'Ventes', path: '/sales', icon: <SalesIcon /> },
          { label: 'Retours', path: '/returns', icon: <ReturnsIcon /> },
          { label: 'Rapports', path: '/reports', icon: <ReportsIcon />, adminOnly: true },
          { label: 'Inventaire', path: '/inventory', icon: <InventoryIcon />, adminOnly: true },
          { label: 'Utilisateurs', path: '/users', icon: <UsersIcon />, adminOnly: true },
          { label: 'Mon Abonnement', path: '/my-subscription', icon: <SubscriptionIcon />, adminOnly: true },
        ].filter(item => !item.adminOnly || isAdmin)
      : []),
  ];

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) await authService.logout(refreshToken).catch(() => {});
    authStore.clear();
    onLogout();
    navigate('/login');
  };

  const DrawerContent = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'white' }}>
      {/* Logo */}
      <Box sx={{
        p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5,
        borderBottom: '1px solid', borderColor: 'divider',
      }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: 2,
          background: 'linear-gradient(135deg, #1A56DB 0%, #7E3AF2 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <StoreIcon sx={{ color: 'white', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
            StockTN
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            Gestion de stocks
          </Typography>
        </Box>
      </Box>

      {/* Alerte stock critique */}
      {dashData?.lowStockCount > 0 && (
        <Box sx={{ mx: 2, mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon sx={{ color: 'warning.main', fontSize: 18 }} />
          <Typography variant="caption" sx={{ color: 'warning.dark', fontWeight: 600 }}>
            {dashData.lowStockCount} produit(s) en stock faible
          </Typography>
        </Box>
      )}

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1.5, py: 1.5, overflowY: 'auto' }}>
        {navItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                sx={{
                  borderRadius: 2,
                  py: 1,
                  px: 1.5,
                  backgroundColor: isActive ? 'primary.main' : 'transparent',
                  '&:hover': {
                    backgroundColor: isActive ? 'primary.main' : 'action.hover',
                  },
                  transition: 'all 0.15s ease',
                }}
              >
                <ListItemIcon sx={{
                  minWidth: 36,
                  color: isActive ? 'white' : 'text.secondary',
                }}>
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="warning" max={99}>
                      {item.icon}
                    </Badge>
                  ) : item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography sx={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'white' : 'text.primary',
                    }}>
                      {item.label}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* User info */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.875rem', fontWeight: 700 }}>
            {user?.email?.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </Typography>
            <Chip
              label={
                isSuperAdmin
                  ? 'Super-Admin'
                  : isAdmin
                  ? 'Administrateur'
                  : 'Employé'
              }
              size="small"
              color={isSuperAdmin ? 'secondary' : isAdmin ? 'primary' : 'default'}
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
          </Box>
          <Tooltip title="Déconnexion">
            <IconButton onClick={handleLogout} size="small" sx={{ color: 'text.secondary' }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* AppBar mobile */}
      {isMobile && (
        <AppBar position="fixed" elevation={0} sx={{ bgcolor: 'white', color: 'text.primary', zIndex: theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ ml: 1, fontWeight: 700 }}>StockTN</Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
          >
            <DrawerContent />
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
                position: 'fixed',
                height: '100vh',
                overflowX: 'hidden',
              },
            }}
            open
          >
            <DrawerContent />
          </Drawer>
        )}
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          mt: { xs: '56px', md: 0 },
          p: { xs: 2, md: 3 },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        {/* Bannière d'alerte Abonnement pour les Boutiques */}
        {!isSuperAdmin && subData && (
          <>
            {subData.isExpired ? (
              <Alert
                severity="error"
                sx={{ mb: 3, borderRadius: 2 }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => navigate('/my-subscription')}
                    sx={{ fontWeight: 700 }}
                  >
                    Renouveler (+216 22 000 000)
                  </Button>
                }
              >
                <strong>Abonnement Expiré :</strong> Votre accès en création/modification est suspendu. Veuillez contacter l'administrateur pour renouveler votre licence.
              </Alert>
            ) : subData.isExpiringSoon ? (
              <Alert
                severity="warning"
                sx={{ mb: 3, borderRadius: 2 }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => navigate('/my-subscription')}
                    sx={{ fontWeight: 700 }}
                  >
                    Payer mon abonnement
                  </Button>
                }
              >
                <strong>Alerte Fin de Licence :</strong> Votre abonnement expire dans <strong>{subData.daysLeft} jours</strong> (le {new Date(subData.expiresAt).toLocaleDateString('fr-FR')}).
              </Alert>
            ) : subData.status === 'TRIAL' ? (
              <Alert
                severity="info"
                sx={{ mb: 3, borderRadius: 2 }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => navigate('/my-subscription')}
                  >
                    Voir l'offre
                  </Button>
                }
              >
                Période d'essai gratuite StockTN — Il vous reste <strong>{subData.daysLeft} jours</strong> d'utilisation sans frais.
              </Alert>
            ) : null}
          </>
        )}

        <Outlet />
      </Box>
    </Box>
  );
}
