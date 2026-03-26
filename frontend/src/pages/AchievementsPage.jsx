import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, CircularProgress, Chip, Divider,
  Grid, Tooltip, Avatar, InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { achievementsApi, teamsApi } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import Notification from '../components/Notification';

const EMPTY_FORM = { team_id: '', month: '', description: '' };

export default function AchievementsPage() {
  const [rows, setRows] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ team_id: '', month: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [notif, setNotif] = useState({ open: false, message: '', severity: 'success' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.team_id) params.team_id = filters.team_id;
      if (filters.month) params.month = filters.month;
      const [achRes, teamsRes] = await Promise.all([achievementsApi.list(params), teamsApi.list()]);
      setRows(achRes.data);
      setTeams(teamsRes.data);
    } catch {
      showNotif('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const showNotif = (message, severity = 'success') => setNotif({ open: true, message, severity });

  const openCreate = () => { setEditRow(null); setForm(EMPTY_FORM); setFormErrors({}); setDialogOpen(true); };
  const openEdit = (row) => {
    setEditRow(row);
    setForm({ team_id: row.team_id, month: row.month, description: row.description });
    setFormErrors({});
    setDialogOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.team_id) errs.team_id = 'Team is required';
    if (!form.month.trim()) errs.month = 'Month is required';
    else if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(form.month)) errs.month = 'Format must be YYYY-MM';
    if (!form.description.trim()) errs.description = 'Description is required';
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (editRow) {
        await achievementsApi.update(editRow.id, payload);
        showNotif('Achievement updated successfully');
      } else {
        await achievementsApi.create(payload);
        showNotif('Achievement created successfully');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      const data = err.response?.data;
      showNotif(data?.errors?.join(', ') || data?.error || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await achievementsApi.delete(confirmId);
      showNotif('Achievement deleted');
      load();
    } catch (err) {
      const data = err.response?.data;
      showNotif(data?.error || 'Delete failed', 'error');
    } finally {
      setConfirmId(null);
    }
  };

  const teamName = (id) => teams.find(t => t.id === id)?.name || id;

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return (
      r.description?.toLowerCase().includes(q) ||
      teamName(r.team_id).toLowerCase().includes(q) ||
      r.month?.includes(q)
    );
  });

  const hasActiveFilters = filters.team_id || filters.month;

  return (
    <Box>
      {/* Page header */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderLeft: '4px solid #e65100', borderRadius: 2, bgcolor: 'white', border: '1px solid #fbe9e7' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#fbe9e7', width: 40, height: 40 }}>
              <EmojiEventsIcon sx={{ color: '#e65100' }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>Achievements</Typography>
              <Typography variant="caption" color="text.secondary">
                {rows.length} achievement{rows.length !== 1 ? 's' : ''} recorded
              </Typography>
            </Box>
            <Chip label={`${rows.length}`} size="small" sx={{ bgcolor: '#e65100', color: 'white', fontWeight: 700, ml: 0.5 }} />
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ bgcolor: '#e65100', '&:hover': { bgcolor: '#bf360c' }, borderRadius: 2, fontWeight: 600 }}>
            Add Achievement
          </Button>
        </Box>
      </Paper>

      {/* Search bar */}
      <TextField
        fullWidth
        placeholder="Search by description, team or month..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        size="small"
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>,
          sx: { borderRadius: 2, bgcolor: 'white' }
        }}
      />

      {/* Filters */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <FilterListIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Filters
          </Typography>
          {hasActiveFilters && (
            <Chip label="Clear" size="small" onClick={() => setFilters({ team_id: '', month: '' })}
              onDelete={() => setFilters({ team_id: '', month: '' })}
              sx={{ ml: 'auto', height: 20, fontSize: 11 }} />
          )}
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth select label="Filter by Team" value={filters.team_id}
              onChange={e => setFilters(f => ({ ...f, team_id: e.target.value }))} size="small">
              <MenuItem value="">All Teams</MenuItem>
              {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Filter by Month (YYYY-MM)" value={filters.month}
              onChange={e => setFilters(f => ({ ...f, month: e.target.value }))}
              size="small" placeholder="2025-01" />
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#e65100' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600, width: '45%' }}>Description</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Team</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Month</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Created</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    {search ? `No achievements match "${search}"` : 'No achievements found. Record your first one.'}
                  </TableCell>
                </TableRow>
              ) : filtered.map(row => (
                <TableRow key={row.id} hover sx={{ '&:hover': { bgcolor: '#fff8f6' } }}>
                  <TableCell sx={{ maxWidth: 0 }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{row.description}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={teamName(row.team_id)} size="small" sx={{ bgcolor: '#fbe9e7', color: '#e65100', fontWeight: 600, border: '1px solid #ffccbc' }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={row.month} size="small" sx={{ fontFamily: 'monospace', fontWeight: 700, bgcolor: '#f5f5f5' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(row.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton onClick={() => openEdit(row)} size="small" color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => setConfirmId(row.id)} size="small" color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>{editRow ? 'Edit Achievement' : 'Add Achievement'}</DialogTitle>
        <Divider />
        <DialogContent>
          <TextField fullWidth select label="Team" margin="normal" value={form.team_id}
            onChange={e => setForm(f => ({ ...f, team_id: e.target.value }))}
            error={!!formErrors.team_id} helperText={formErrors.team_id} required>
            {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
          </TextField>
          <TextField fullWidth label="Month (YYYY-MM)" margin="normal" value={form.month}
            onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
            error={!!formErrors.month} helperText={formErrors.month} placeholder="2025-01" required />
          <TextField fullWidth label="Description" margin="normal" multiline rows={4} value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            error={!!formErrors.description} helperText={formErrors.description}
            placeholder="Describe the achievement in detail..." required />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ bgcolor: '#e65100', '&:hover': { bgcolor: '#bf360c' } }}>
            {saving ? 'Saving...' : editRow ? 'Save Changes' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!confirmId} title="Delete Achievement"
        message="Are you sure you want to delete this achievement? This action cannot be undone."
        onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />
      <Notification {...notif} onClose={() => setNotif(n => ({ ...n, open: false }))} />
    </Box>
  );
}
