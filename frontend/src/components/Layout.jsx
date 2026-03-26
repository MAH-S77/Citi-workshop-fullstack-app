import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, IconButton, Avatar,
  Menu, MenuItem, Divider, Chip, Tooltip
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LabelIcon from '@mui/icons-material/Label';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 240;

const navItems = [
  { label: 'Dashboard',    path: '/dashboard',    icon: <DashboardIcon />,    color: '#1976d2', bg: '#e3f2fd' },
  { label: 'Individuals',  path: '/individuals',  icon: <PeopleIcon />,       color: '#2e7d32', bg: '#e8f5e9' },
  { label: 'Teams',        path: '/teams',        icon: <GroupsIcon />,       color: '#7b1fa2', bg: '#f3e5f5' },
  { label: 'Achievements', path: '/achievements', icon: <EmojiEventsIcon />,  color: '#e65100', bg: '#fbe9e7' },
  { label: 'Metadata',     path: '/metadata',     icon: <LabelIcon />,        color: '#00838f', bg: '#e0f7fa' },
];

const roleColor = { admin: '#d32f2f', manager: '#e65100', contributor: '#0277bd', viewer: '#555' };
const roleBg    = { admin: '#ffebee', manager: '#fbe9e7', contributor: '#e3f2fd', viewer: '#f5f5f5' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" elevation={0} sx={{
        zIndex: (t) => t.zIndex.drawer + 1,
        bgcolor: '#1565c0',
        borderBottom: '1px solid #0d47a1'
      }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <EmojiEventsIcon sx={{ color: '#ffd54f', fontSize: 26 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.5, color: 'white' }}>
              Team Tracker
            </Typography>
          </Box>
          <Chip
            label={user?.role}
            size="small"
            sx={{
              mr: 2,
              fontWeight: 700,
              textTransform: 'capitalize',
              bgcolor: roleBg[user?.role] || '#f5f5f5',
              color: roleColor[user?.role] || '#333',
              border: 'none'
            }}
          />
          <Tooltip title={user?.username}>
            <IconButton onClick={e => setAnchorEl(e.currentTarget)} sx={{ p: 0.5 }}>
              <Avatar sx={{ width: 34, height: 34, bgcolor: '#ffd54f', color: '#1565c0', fontWeight: 800, fontSize: 15 }}>
                {user?.username?.[0]?.toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
            PaperProps={{ elevation: 3, sx: { minWidth: 180, borderRadius: 2, mt: 1 } }}>
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>{user?.username}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{user?.role}</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => { logout(); navigate('/login'); }} sx={{ gap: 1, color: 'error.main', mt: 0.5 }}>
              <LogoutIcon fontSize="small" />
              <Typography variant="body2">Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" sx={{
        width: DRAWER_WIDTH, flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: '#ffffff',
          borderRight: '1px solid #e8eaf6',
          display: 'flex',
          flexDirection: 'column',
        }
      }}>
        <Toolbar />
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <Typography variant="caption" color="text.disabled" fontWeight={700}
            sx={{ letterSpacing: 1.5, textTransform: 'uppercase', fontSize: 10 }}>
            Main Menu
          </Typography>
        </Box>
        <List dense sx={{ px: 1, flexGrow: 1 }}>
          {navItems.map(item => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={active}
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    borderLeft: active ? `3px solid ${item.color}` : '3px solid transparent',
                    pl: active ? '13px' : '16px',
                    '&.Mui-selected': { bgcolor: item.bg, color: item.color },
                    '&.Mui-selected:hover': { bgcolor: item.bg },
                    '&:hover': { bgcolor: item.bg, borderLeft: `3px solid ${item.color}`, pl: '13px' },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: active ? item.color : 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 700 : 400, color: active ? item.color : 'text.primary' }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {/* Bottom user section */}
        <Box sx={{ p: 2, borderTop: '1px solid #e8eaf6', bgcolor: '#f8f9fa' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#1565c0', fontWeight: 700, fontSize: 13 }}>
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>{user?.username}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                {user?.role}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, bgcolor: '#f5f6fa', minHeight: '100vh' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
