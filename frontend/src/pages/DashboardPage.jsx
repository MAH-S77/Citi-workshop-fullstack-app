import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, CardActionArea,
  CircularProgress, Chip, Avatar, Divider
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LabelIcon from '@mui/icons-material/Label';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { individualsApi, teamsApi, achievementsApi, metadataApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CARDS = [
  { label: 'Individuals',  path: '/individuals',  icon: PeopleIcon,      color: '#2e7d32', bg: '#e8f5e9', desc: 'People in the organisation' },
  { label: 'Teams',        path: '/teams',        icon: GroupsIcon,      color: '#7b1fa2', bg: '#f3e5f5', desc: 'Groups with assigned leaders' },
  { label: 'Achievements', path: '/achievements', icon: EmojiEventsIcon, color: '#e65100', bg: '#fbe9e7', desc: 'Monthly team accomplishments' },
  { label: 'Metadata',     path: '/metadata',     icon: LabelIcon,       color: '#00838f', bg: '#e0f7fa', desc: 'Reference data by category' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ individuals: null, teams: null, achievements: null, metadata: null });

  useEffect(() => {
    Promise.all([
      individualsApi.list(),
      teamsApi.list(),
      achievementsApi.list({}),
      metadataApi.list(),
    ]).then(([ind, teams, ach, meta]) => {
      const metaTotal = Object.values(meta.data || {}).reduce((s, arr) => s + (arr?.length || 0), 0);
      setCounts({
        individuals: ind.data?.length ?? 0,
        teams: teams.data?.length ?? 0,
        achievements: ach.data?.length ?? 0,
        metadata: metaTotal,
      });
    }).catch(() => {});
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const total = Object.values(counts).reduce((s, v) => s + (v || 0), 0);

  return (
    <Box>
      {/* Welcome header */}
      <Box sx={{ mb: 4, p: 3, bgcolor: 'white', borderRadius: 3, boxShadow: 1, borderLeft: '4px solid #1565c0' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>{greeting()}, {user?.username} 👋</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Welcome to your organisation dashboard
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon color="primary" />
            <Typography variant="body2" color="text.secondary">
              {total === 0 ? '...' : `${total} total records`}
            </Typography>
            <Chip label={user?.role} size="small" color="primary" sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
          </Box>
        </Box>
      </Box>

      {/* Summary cards */}
      <Typography variant="subtitle1" fontWeight={700} color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 }}>
        Overview
      </Typography>
      <Grid container spacing={3}>
        {CARDS.map(card => {
          const Icon = card.icon;
          const count = counts[card.label.toLowerCase()];
          return (
            <Grid item xs={12} sm={6} md={3} key={card.label}>
              <Card elevation={2} sx={{ borderRadius: 3, overflow: 'hidden', transition: 'transform 0.15s, box-shadow 0.15s', '&:hover': { transform: 'translateY(-3px)', boxShadow: 6 } }}>
                <CardActionArea onClick={() => navigate(card.path)} sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Avatar sx={{ bgcolor: card.bg, width: 48, height: 48 }}>
                        <Icon sx={{ color: card.color, fontSize: 26 }} />
                      </Avatar>
                      <Typography variant="h3" fontWeight={800} sx={{ color: card.color, lineHeight: 1 }}>
                        {count === null ? <CircularProgress size={24} sx={{ color: card.color }} /> : count}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle1" fontWeight={700}>{card.label}</Typography>
                    <Typography variant="body2" color="text.secondary">{card.desc}</Typography>
                  </CardContent>
                  <Box sx={{ height: 3, bgcolor: card.color }} />
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Permissions info */}
      <Box sx={{ p: 3, bgcolor: 'white', borderRadius: 3, boxShadow: 1 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Your Permissions</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {(user?.permissions || []).map(p => (
            <Chip key={p} label={p} size="small" color="primary" variant="outlined" sx={{ textTransform: 'capitalize' }} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
