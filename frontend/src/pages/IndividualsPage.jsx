import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, CircularProgress, Chip, Avatar, Divider,
  InputAdornment, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import { individualsApi } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import Notification from '../components/Notification';

const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contractor'];
const EMPTY_FORM = { name: '', location: '', employment_type: 'full-time' };

const employmentColor = { 'full-time': 'success', 'part-time': 'warning', 'contractor': 'info' };
const employmentBg = { 'full-time': '#e8f5e9', 'part-time': '#fff8e1', 'contractor': '#e3f2fd' };
const employmentFg = { 'full-time': '#2e7d32', 'part-time': '#f57f17', 'contractor': '#0277bd' };

function initials(name = '') {
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
}

const avatarColors = ['#1976d2', '#7b1fa2', '#2e7d32', '#e65100', '#00838f', '#c62828', '#4527a0'];
function avatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function IndividualsPage() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
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
      const r = await individualsApi.list();
      setRows(r.data);
    } catch {
      showNotif('Failed to load individuals', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showNotif = (message, severity = 'success') => setNotif({ open: true, message, severity });

  const openCreate = () => { setEditRow(null); setForm(EMPTY_FORM); setFormErrors({}); setDialogOpen(true); };
  const openEdit = (row) => { setEditRow(row); setForm({ name: row.name, location: row.location, employment_type: row.employment_type }); setFormErrors({}); setDialogOpen(true); };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.location.trim()) errs.location = 'Location is required';
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      if (editRow) {
        await individualsApi.update(editRow.id, form);
        showNotif('Individual updated successfully');
      } else {
        await individualsApi.create(form);
        showNotif('Individual created successfully');
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
      await individualsApi.delete(confirmId);
      showNotif('Individual deleted');
      load();
    } catch (err) {
      const data = err.response?.data;
      showNotif(data?.error || 'Delete failed', 'error');
    } finally {
      setConfirmId(null);
    }
  };

  const filtered = rows.filter(r =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.location?.toLowerCase().includes(search.toLowerCase())
  );

  const counts = EMPLOYMENT_TYPES.reduce((acc, t) => ({ ...acc, [t]: rows.filter(r => r.employment_type === t).length }), {});

  return (
    <Box>
      {/* Page header */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderLeft: '4px solid #2e7d32', borderRadius: 2, bgcolor: 'white', border: '1px solid #e8f5e9' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#e8f5e9', width: 40, height: 40 }}>
              <PeopleIcon sx={{ color: '#2e7d32' }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>Individuals</Typography>
              <Typography variant="caption" color="text.secondary">
                {rows.length} person{rows.length !== 1 ? 's' : ''} in the organisation
              </Typography>
            </Box>
            <Chip label={`${rows.length}`} size="small" sx={{ bgcolor: '#2e7d32', color: 'white', fontWeight: 700, ml: 0.5 }} />
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' }, borderRadius: 2, fontWeight: 600 }}>
            Add Individual
          </Button>
        </Box>
        {/* Summary chips */}
        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          {EMPLOYMENT_TYPES.map(t => (
            <Chip key={t} label={`${t}: ${counts[t]}`} size="small"
              sx={{ bgcolor: employmentBg[t], color: employmentFg[t], fontWeight: 600, border: 'none' }} />
          ))}
        </Box>
      </Paper>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search by name or location..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        size="small"
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>,
          sx: { borderRadius: 2, bgcolor: 'white' }
        }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#2e7d32' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Location</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Employment Type</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Created</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    {search ? `No results for "${search}"` : 'No individuals found. Add your first one.'}
                  </TableCell>
                </TableRow>
              ) : filtered.map(row => (
                <TableRow key={row.id} hover sx={{ '&:hover': { bgcolor: '#f1f8f1' } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 34, height: 34, fontSize: 12, fontWeight: 700, bgcolor: avatarColor(row.name) }}>
                        {initials(row.name)}
                      </Avatar>
                      <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{row.location}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={row.employment_type} color={employmentColor[row.employment_type] || 'default'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(row.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
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
        <DialogTitle fontWeight={700}>{editRow ? 'Edit Individual' : 'Add Individual'}</DialogTitle>
        <Divider />
        <DialogContent>
          <TextField fullWidth label="Full Name" margin="normal" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            error={!!formErrors.name} helperText={formErrors.name} required />
          <TextField fullWidth label="Location" margin="normal" value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            error={!!formErrors.location} helperText={formErrors.location} required />
          <TextField fullWidth select label="Employment Type" margin="normal" value={form.employment_type}
            onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))}>
            {EMPLOYMENT_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}>
            {saving ? 'Saving...' : editRow ? 'Save Changes' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!confirmId} title="Delete Individual"
        message="Are you sure you want to delete this individual? This action cannot be undone."
        onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />
      <Notification {...notif} onClose={() => setNotif(n => ({ ...n, open: false }))} />
    </Box>
  );
}
