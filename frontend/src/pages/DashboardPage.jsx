import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, CardActionArea,
  CircularProgress, Chip, Divider, Avatar, Stack
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LabelIcon from '@mui/icons-material/Label';
import { individualsApi, teamsApi, achievementsApi, metadataApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CARDS = [
  { label: 'Individuals', path: '/individuals', icon: PeopleIcon,      color: '#2e7d32', bg: '#e8f5e9' },
  { label: 'Teams',       path: '/teams',       icon: GroupsIcon,      color: '#7b1fa2', bg: '#f3e5f5' },
  { label: 'Achievements',path: '/achievements',icon: EmojiEventsIcon, color: '#e65100', bg: '#fbe9e7' },
  { label: 'Metadata',    path: '/metadata',    icon: LabelIcon,       color: '#00838f', bg: '#e0f7fa' },
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

  const countFor = (label) => counts[label.toLowerCase()];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {greeting()}, {user?.username} 👋
        </Typography>
        <Typography color="text.secondary">
          Here's an overview of your organisation data.
        </Typography>
        <Chip label={user?.role} size="small" sx={{ mt: 1, textTransform: 'capitalize', fontWeight: 600 }} />
      </Box>

      {/* Summary cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {CARDS.map(card => {
          const Icon = card.icon;
          const count = countFor(card.label);
          return (
            <Grid item xs={12} sm={6} md={3} key={card.label}>
              <Card elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <CardActionArea onClick={() => navigate(card.path)}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}>
                          {card.label}
                        </Typography>
                        <Typography variant="h3" fontWeight={800} sx={{ color: card.color, lineHeight: 1 }}>
                          {count === null ? <CircularProgress size={28} sx={{ color: card.color }} /> : count}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          total records
                        </Typography>
                      </Box>
                      <Avatar sx={{ bgcolor: card.bg, width: 52, height: 52 }}>
                        <Icon sx={{ color: card.color, fontSize: 28 }} />
                      </Avatar>
                    </Box>
                  </CardContent>
                  <Box sx={{ height: 4, bgcolor: card.color }} />
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Divider sx={{ mb: 3 }} />

      {/* Quick info */}
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Quick Access</Typography>
      <Grid container spacing={2}>
        {CARDS.map(card => {
          const Icon = card.icon;
          return (
            <Grid item xs={12} sm={6} key={card.label}>
              <Card elevation={1} sx={{ borderRadius: 2, cursor: 'pointer', border: `1px solid ${card.color}30` }}
                onClick={() => navigate(card.path)}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
                  <Avatar sx={{ bgcolor: card.bg }}>
                    <Icon sx={{ color: card.color }} />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography fontWeight={600}>{card.label}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      View, create, edit and delete {card.label.toLowerCase()}
                    </Typography>
                  </Box>
                  <Stack direction="row" alignItems="center">
                    <Chip
                      label={countFor(card.label) === null ? '...' : countFor(card.label)}
                      size="small"
                      sx={{ bgcolor: card.bg, color: card.color, fontWeight: 700 }}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
