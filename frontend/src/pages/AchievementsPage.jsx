import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, CircularProgress, Chip, Divider,
  Grid, Tooltip, Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { achievementsApi, teamsApi } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import Notification from '../components/Notification';

const EMPTY_FORM = { team_id: '', month: '', description: '', metrics: '' };

function MetricsDisplay({ metrics }) {
  if (!metrics) return <Typography color="text.secondary" variant="body2">—</Typography>;
  if (typeof metrics === 'object') {
    return (
      <Stack direction="row" flexWrap="wrap" gap={0.5}>
        {Object.entries(metrics).map(([k, v]) => (
          <Chip key={k} label={`${k}: ${v}`} size="small" variant="outlined" color="primary" />
        ))}
      </Stack>
    );
  }
  return <Typography variant="body2">{metrics}</Typography>;
}

export default function AchievementsPage() {
  const [rows, setRows] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
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
    setForm({
      team_id: row.team_id,
      month: row.month,
      description: row.description,
      metrics: row.metrics ? (typeof row.metrics === 'object' ? JSON.stringify(row.metrics) : row.metrics) : ''
    });
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
      if (!payload.metrics) delete payload.metrics;
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
    } catch {
      showNotif('Delete failed', 'error');
    } finally {
      setConfirmId(null);
    }
  };

  const teamName = (id) => teams.find(t => t.id === id)?.name || id;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmojiEventsIcon sx={{ color: '#e65100' }} />
          <Typography variant="h5" fontWeight={600}>Achievements</Typography>
          <Chip label={`${rows.length} total`} size="small" variant="outlined" sx={{ ml: 1, color: '#e65100', borderColor: '#e65100' }} />
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ bgcolor: '#e65100', '&:hover': { bgcolor: '#bf360c' } }}>
          Add Achievement
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth select label="Filter by Team" value={filters.team_id} onChange={e => setFilters(f => ({ ...f, team_id: e.target.value }))} size="small">
            <MenuItem value="">All Teams</MenuItem>
            {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="Filter by Month (YYYY-MM)" value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value }))} size="small" placeholder="2025-01" />
        </Grid>
        <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
          <Button onClick={() => setFilters({ team_id: '', month: '' })} variant="outlined" size="small">Clear Filters</Button>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead sx={{ bgcolor: '#e65100' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Description</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Team</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Month</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Metrics</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Created</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No achievements found. Record your first one.
                  </TableCell>
                </TableRow>
              ) : rows.map(row => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ maxWidth: 260 }}>
                    <Typography variant="body2">{row.description}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={teamName(row.team_id)} size="small" color="warning" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={row.month} size="small" sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
                  </TableCell>
                  <TableCell><MetricsDisplay metrics={row.metrics} /></TableCell>
                  <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit"><IconButton onClick={() => openEdit(row)} size="small" color="primary"><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton onClick={() => setConfirmId(row.id)} size="small" color="error"><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={600}>{editRow ? 'Edit Achievement' : 'Add Achievement'}</DialogTitle>
        <Divider />
        <DialogContent>
          <TextField fullWidth select label="Team" margin="normal" value={form.team_id} onChange={e => setForm(f => ({ ...f, team_id: e.target.value }))} error={!!formErrors.team_id} helperText={formErrors.team_id} required>
            {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
          </TextField>
          <TextField fullWidth label="Month (YYYY-MM)" margin="normal" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} error={!!formErrors.month} helperText={formErrors.month} placeholder="2025-01" required />
          <TextField fullWidth label="Description" margin="normal" multiline rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} error={!!formErrors.description} helperText={formErrors.description} required />
          <TextField fullWidth label='Metrics (optional, e.g. {"score":95})' margin="normal" value={form.metrics} onChange={e => setForm(f => ({ ...f, metrics: e.target.value }))} />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: '#e65100', '&:hover': { bgcolor: '#bf360c' } }}>
            {saving ? 'Saving...' : editRow ? 'Save Changes' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!confirmId} title="Delete Achievement" message="Are you sure you want to delete this achievement?" onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />
      <Notification {...notif} onClose={() => setNotif(n => ({ ...n, open: false }))} />
    </Box>
  );
}
