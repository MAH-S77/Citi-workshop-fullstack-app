import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, CircularProgress, Chip, OutlinedInput, Select, InputLabel, FormControl, FormHelperText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { teamsApi, individualsApi } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import Notification from '../components/Notification';

const EMPTY_FORM = { name: '', location: '', leader_id: '', member_ids: [] };

export default function TeamsPage() {
  const [rows, setRows] = useState([]);
  const [individuals, setIndividuals] = useState([]);
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
      const [teamsRes, indsRes] = await Promise.all([teamsApi.list(), individualsApi.list()]);
      setRows(teamsRes.data);
      setIndividuals(indsRes.data);
    } catch {
      showNotif('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showNotif = (message, severity = 'success') => setNotif({ open: true, message, severity });

  const openCreate = () => { setEditRow(null); setForm(EMPTY_FORM); setFormErrors({}); setDialogOpen(true); };
  const openEdit = (row) => {
    setEditRow(row);
    setForm({ name: row.name, location: row.location, leader_id: row.leader_id || row.leader?.id || '', member_ids: (row.member_ids || row.members?.map(m => m?.id).filter(Boolean) || []) });
    setFormErrors({});
    setDialogOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.location.trim()) errs.location = 'Location is required';
    if (!form.leader_id) errs.leader_id = 'Leader is required';
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      if (editRow) {
        await teamsApi.update(editRow.id, form);
        showNotif('Team updated');
      } else {
        await teamsApi.create(form);
        showNotif('Team created');
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
      await teamsApi.delete(confirmId);
      showNotif('Team deleted');
      load();
    } catch {
      showNotif('Delete failed', 'error');
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Teams</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add Team</Button>
      </Box>

      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Leader</TableCell>
                <TableCell>Members</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">No teams found</TableCell></TableRow>
              ) : rows.map(row => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.location}</TableCell>
                  <TableCell>{row.leader?.name || row.leader_id}</TableCell>
                  <TableCell><Chip label={`${row.members?.length || 0} members`} size="small" /></TableCell>
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
        <DialogTitle>{editRow ? 'Edit Team' : 'Add Team'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Team Name" margin="normal" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} error={!!formErrors.name} helperText={formErrors.name} required />
          <TextField fullWidth label="Location" margin="normal" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} error={!!formErrors.location} helperText={formErrors.location} required />
          <TextField fullWidth select label="Team Leader" margin="normal" value={form.leader_id} onChange={e => setForm(f => ({ ...f, leader_id: e.target.value }))} error={!!formErrors.leader_id} helperText={formErrors.leader_id} required>
            {individuals.map(i => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
          </TextField>
          <FormControl fullWidth margin="normal">
            <InputLabel>Members</InputLabel>
            <Select multiple value={form.member_ids} onChange={e => setForm(f => ({ ...f, member_ids: e.target.value }))} input={<OutlinedInput label="Members" />} renderValue={(selected) => selected.map(id => individuals.find(i => i.id === id)?.name || id).join(', ')}>
              {individuals.map(i => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!confirmId} title="Delete Team" message="Are you sure you want to delete this team?" onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />
      <Notification {...notif} onClose={() => setNotif(n => ({ ...n, open: false }))} />
    </Box>
  );
}
