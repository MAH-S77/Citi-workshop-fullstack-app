import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, IconButton, Avatar,
  Menu, MenuItem, Divider, Chip
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LabelIcon from '@mui/icons-material/Label';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 230;

const navItems = [
  { label: 'Dashboard',    path: '/dashboard',    icon: <DashboardIcon />,    color: '#1976d2' },
  { label: 'Individuals',  path: '/individuals',  icon: <PeopleIcon />,       color: '#2e7d32' },
  { label: 'Teams',        path: '/teams',        icon: <GroupsIcon />,       color: '#7b1fa2' },
  { label: 'Achievements', path: '/achievements', icon: <EmojiEventsIcon />,  color: '#e65100' },
  { label: 'Metadata',     path: '/metadata',     icon: <LabelIcon />,        color: '#00838f' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);

  const roleColor = { admin: 'error', manager: 'warning', contributor: 'info', viewer: 'default' };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1, bgcolor: '#1565c0' }}>
        <Toolbar>
          <EmojiEventsIcon sx={{ mr: 1, color: '#ffd54f' }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: 0.5 }}>
            Team Tracker
          </Typography>
          <Chip
            label={user?.role}
            size="small"
            color={roleColor[user?.role] || 'default'}
            sx={{ mr: 2, fontWeight: 600, textTransform: 'capitalize' }}
          />
          <IconButton onClick={e => setAnchorEl(e.currentTarget)} color="inherit">
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'secondary.main', fontWeight: 700 }}>
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem disabled sx={{ opacity: 1 }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>{user?.username}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{user?.role}</Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { logout(); navigate('/login'); }}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" sx={{
        width: DRAWER_WIDTH, flexShrink: 0,
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', bgcolor: '#f8f9fa', borderRight: '1px solid #e0e0e0' }
      }}>
        <Toolbar />
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 1, textTransform: 'uppercase' }}>
            Navigation
          </Typography>
        </Box>
        <List dense>
          {navItems.map(item => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <ListItem key={item.path} disablePadding sx={{ px: 1, mb: 0.5 }}>
                <ListItemButton
                  selected={active}
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    '&.Mui-selected': { bgcolor: `${item.color}18`, color: item.color },
                    '&.Mui-selected:hover': { bgcolor: `${item.color}28` },
                    '&:hover': { bgcolor: `${item.color}10` },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: active ? item.color : 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 700 : 400 }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, bgcolor: '#f5f6fa', minHeight: '100vh' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
