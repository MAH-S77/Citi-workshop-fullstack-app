import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, CircularProgress, Chip, Divider, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LabelIcon from '@mui/icons-material/Label';
import { metadataApi } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import Notification from '../components/Notification';

const CATEGORIES = ['individual', 'team', 'organization'];
const EMPTY_FORM = { category: 'team', key: '', value: '' };
const catColor = { individual: 'primary', team: 'success', organization: 'warning' };
const catIcon = { individual: '👤', team: '👥', organization: '🏢' };

export default function MetadataPage() {
  const [grouped, setGrouped] = useState({});
  const [filterCat, setFilterCat] = useState('');
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
      const r = await metadataApi.list();
      setGrouped(r.data);
    } catch {
      showNotif('Failed to load metadata', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showNotif = (message, severity = 'success') => setNotif({ open: true, message, severity });

  const allRows = Object.entries(grouped).flatMap(([cat, items]) => items.map(i => ({ ...i, category: cat })));
  const rows = filterCat ? allRows.filter(r => r.category === filterCat) : allRows;

  const openCreate = () => { setEditRow(null); setForm(EMPTY_FORM); setFormErrors({}); setDialogOpen(true); };
  const openEdit = (row) => { setEditRow(row); setForm({ category: row.category, key: row.key, value: row.value }); setFormErrors({}); setDialogOpen(true); };

  const validate = () => {
    const errs = {};
    if (!form.key.trim()) errs.key = 'Key is required';
    if (!form.value.trim()) errs.value = 'Value is required';
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      if (editRow) {
        await metadataApi.update(editRow.id, form);
        showNotif('Metadata updated successfully');
      } else {
        await metadataApi.create(form);
        showNotif('Metadata created successfully');
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
      await metadataApi.delete(confirmId);
      showNotif('Metadata deleted');
      load();
    } catch {
      showNotif('Delete failed', 'error');
    } finally {
      setConfirmId(null);
    }
  };

  const counts = CATEGORIES.reduce((acc, c) => ({ ...acc, [c]: (grouped[c] || []).length }), {});

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LabelIcon sx={{ color: '#00838f' }} />
          <Typography variant="h5" fontWeight={600}>Metadata</Typography>
          <Chip label={`${allRows.length} total`} size="small" variant="outlined" sx={{ ml: 1, color: '#00838f', borderColor: '#00838f' }} />
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ bgcolor: '#00838f', '&:hover': { bgcolor: '#006064' } }}>
          Add Metadata
        </Button>
      </Box>

      {/* Category summary chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip
          label="All"
          onClick={() => setFilterCat('')}
          color={filterCat === '' ? 'default' : 'default'}
          variant={filterCat === '' ? 'filled' : 'outlined'}
          size="small"
          sx={{ fontWeight: filterCat === '' ? 700 : 400 }}
        />
        {CATEGORIES.map(c => (
          <Chip
            key={c}
            label={`${catIcon[c]} ${c} (${counts[c]})`}
            onClick={() => setFilterCat(filterCat === c ? '' : c)}
            color={catColor[c]}
            variant={filterCat === c ? 'filled' : 'outlined'}
            size="small"
            sx={{ fontWeight: filterCat === c ? 700 : 400, cursor: 'pointer' }}
          />
        ))}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead sx={{ bgcolor: '#00838f' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Key</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Value</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Created</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No metadata found. Add your first entry.
                  </TableCell>
                </TableRow>
              ) : rows.map(row => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Chip label={`${catIcon[row.category]} ${row.category}`} color={catColor[row.category] || 'default'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontWeight={600}>{row.key}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={row.value} size="small" variant="outlined" />
                  </TableCell>
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
        <DialogTitle fontWeight={600}>{editRow ? 'Edit Metadata' : 'Add Metadata'}</DialogTitle>
        <Divider />
        <DialogContent>
          <TextField fullWidth select label="Category" margin="normal" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <MenuItem key={c} value={c}>{catIcon[c]} {c}</MenuItem>)}
          </TextField>
          <TextField fullWidth label="Key" margin="normal" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} error={!!formErrors.key} helperText={formErrors.key} placeholder="e.g. department" required />
          <TextField fullWidth label="Value" margin="normal" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} error={!!formErrors.value} helperText={formErrors.value} placeholder="e.g. Engineering" required />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: '#00838f', '&:hover': { bgcolor: '#006064' } }}>
            {saving ? 'Saving...' : editRow ? 'Save Changes' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!confirmId} title="Delete Metadata" message="Are you sure you want to delete this metadata entry?" onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />
      <Notification {...notif} onClose={() => setNotif(n => ({ ...n, open: false }))} />
    </Box>
  );
}
