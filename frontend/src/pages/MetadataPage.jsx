import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, CircularProgress, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { metadataApi } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import Notification from '../components/Notification';

const CATEGORIES = ['individual', 'team', 'organization'];
const EMPTY_FORM = { category: 'team', key: '', value: '' };

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

  // Flatten grouped data into rows
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
        showNotif('Metadata updated');
      } else {
        await metadataApi.create(form);
        showNotif('Metadata created');
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

  const catColor = { individual: 'primary', team: 'success', organization: 'warning' };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Metadata</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add Metadata</Button>
      </Box>

      <TextField select label="Filter by Category" value={filterCat} onChange={e => setFilterCat(e.target.value)} size="small" sx={{ mb: 2, minWidth: 200 }}>
        <MenuItem value="">All Categories</MenuItem>
        {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
      </TextField>

      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell>Key</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">No metadata found</TableCell></TableRow>
              ) : rows.map(row => (
                <TableRow key={row.id} hover>
                  <TableCell><Chip label={row.category} color={catColor[row.category] || 'default'} size="small" /></TableCell>
                  <TableCell>{row.key}</TableCell>
                  <TableCell>{row.value}</TableCell>
                  <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => openEdit(row)} size="small"><EditIcon /></IconButton>
                    <IconButton onClick={() => setConfirmId(row.id)} size="small" color="error"><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editRow ? 'Edit Metadata' : 'Add Metadata'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth select label="Category" margin="normal" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <TextField fullWidth label="Key" margin="normal" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} error={!!formErrors.key} helperText={formErrors.key} required />
          <TextField fullWidth label="Value" margin="normal" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} error={!!formErrors.value} helperText={formErrors.value} required />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!confirmId} title="Delete Metadata" message="Are you sure you want to delete this metadata entry?" onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />
      <Notification {...notif} onClose={() => setNotif(n => ({ ...n, open: false }))} />
    </Box>
  );
}
