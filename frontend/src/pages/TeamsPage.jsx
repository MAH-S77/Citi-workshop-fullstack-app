import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, CircularProgress, Chip, OutlinedInput,
  Select, InputLabel, FormControl, Divider, Avatar, Stack, Tooltip, Collapse,
  InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import GroupIcon from '@mui/icons-material/Group';
import SearchIcon from '@mui/icons-material/Search';
import { teamsApi, individualsApi } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import Notification from '../components/Notification';

const EMPTY_FORM = { name: '', location: '', leader_id: '', member_ids: [] };

function stringAvatar(name = '') {
  const parts = name.trim().split(' ');
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2);
  return initials.toUpperCase();
}

export default function TeamsPage() {
  const [rows, setRows] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [removeMemberState, setRemoveMemberState] = useState(null);
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
    setForm({
      name: row.name,
      location: row.location,
      leader_id: row.leader?.id || row.leader_id || '',
      member_ids: row.members?.map(m => m?.id).filter(Boolean) || row.member_ids || [],
    });
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
      const payload = { ...form };
      if (editRow) {
        await teamsApi.update(editRow.id, payload);
        showNotif('Team updated successfully');
      } else {
        await teamsApi.create(payload);
        showNotif('Team created successfully');
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

  const handleDeleteTeam = async () => {
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

  const handleRemoveMember = async () => {
    const { teamId, memberId } = removeMemberState;
    const team = rows.find(r => r.id === teamId);
    const currentIds = team.members?.map(m => m.id).filter(Boolean) || team.member_ids || [];
    const newIds = currentIds.filter(id => id !== memberId);
    try {
      await teamsApi.update(teamId, { member_ids: newIds });
      showNotif('Member removed');
      load();
    } catch {
      showNotif('Failed to remove member', 'error');
    } finally {
      setRemoveMemberState(null);
    }
  };

  const indName = (id) => individuals.find(i => i.id === id)?.name || id;

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.location?.toLowerCase().includes(q) ||
      r.leader?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <Box>
      {/* Page header */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderLeft: '4px solid #7b1fa2', borderRadius: 2, bgcolor: 'white', border: '1px solid #e8eaf6' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#f3e5f5', width: 40, height: 40 }}>
              <GroupIcon sx={{ color: '#7b1fa2' }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>Teams</Typography>
              <Typography variant="caption" color="text.secondary">
                {rows.length} team{rows.length !== 1 ? 's' : ''} total
              </Typography>
            </Box>
            <Chip label={`${rows.length}`} size="small" sx={{ bgcolor: '#7b1fa2', color: 'white', fontWeight: 700, ml: 0.5 }} />
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ bgcolor: '#7b1fa2', '&:hover': { bgcolor: '#6a1b9a' }, borderRadius: 2, fontWeight: 600 }}>
            New Team
          </Button>
        </Box>
      </Paper>

      {/* Search bar */}
      <TextField
        fullWidth
        placeholder="Search by team name, location or leader..."
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
            <TableHead sx={{ bgcolor: '#7b1fa2' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Team</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Location</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Leader</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Members</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Created</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    {search ? `No teams match "${search}"` : 'No teams found. Create your first team.'}
                  </TableCell>
                </TableRow>
              ) : filtered.map(row => {
                const members = row.members?.filter(Boolean) || [];
                const isExpanded = expandedRow === row.id;
                return [
                  <TableRow key={row.id} hover sx={{ '&:hover': { bgcolor: '#faf5ff' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 700, bgcolor: '#7b1fa2' }}>
                          {stringAvatar(row.name)}
                        </Avatar>
                        <Typography fontWeight={600} variant="body2">{row.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{row.location}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 26, height: 26, fontSize: 11, bgcolor: '#1976d2' }}>
                          {stringAvatar(row.leader?.name || '')}
                        </Avatar>
                        <Typography variant="body2">{row.leader?.name || row.leader_id}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        onClick={() => setExpandedRow(isExpanded ? null : row.id)}
                        sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#7b1fa2', color: '#7b1fa2' }}
                      >
                        {members.length} member{members.length !== 1 ? 's' : ''}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(row.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Add member">
                        <IconButton size="small" color="success" onClick={() => {
                          setEditRow(row);
                          setForm({
                            name: row.name, location: row.location,
                            leader_id: row.leader?.id || row.leader_id || '',
                            member_ids: members.map(m => m.id),
                          });
                          setFormErrors({});
                          setDialogOpen(true);
                        }}>
                          <PersonAddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit team">
                        <IconButton size="small" color="primary" onClick={() => openEdit(row)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete team">
                        <IconButton size="small" color="error" onClick={() => setConfirmId(row.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>,
                  <TableRow key={`${row.id}-members`}>
                    <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ px: 4, py: 2, bgcolor: '#faf5ff', borderBottom: '1px solid #e8d5f5' }}>
                          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#7b1fa2' }}>
                            Team Members
                          </Typography>
                          {members.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">No members yet.</Typography>
                          ) : (
                            <Stack direction="row" flexWrap="wrap" gap={1}>
                              {members.map(m => m && (
                                <Chip
                                  key={m.id}
                                  avatar={<Avatar sx={{ fontSize: 11 }}>{stringAvatar(m.name || '')}</Avatar>}
                                  label={m.name}
                                  variant="outlined"
                                  onDelete={() => setRemoveMemberState({ teamId: row.id, memberId: m.id, memberName: m.name })}
                                  deleteIcon={<Tooltip title="Remove from team"><PersonRemoveIcon /></Tooltip>}
                                  sx={{ borderColor: '#ce93d8' }}
                                />
                              ))}
                            </Stack>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                ];
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {editRow ? 'Edit Team' : 'Create New Team'}
        </DialogTitle>
        <Divider />
        <DialogContent>
          <TextField fullWidth label="Team Name" margin="normal" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            error={!!formErrors.name} helperText={formErrors.name} required />
          <TextField fullWidth label="Location" margin="normal" value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            error={!!formErrors.location} helperText={formErrors.location} required />
          <TextField fullWidth select label="Team Leader" margin="normal" value={form.leader_id}
            onChange={e => setForm(f => ({ ...f, leader_id: e.target.value }))}
            error={!!formErrors.leader_id} helperText={formErrors.leader_id} required>
            {individuals.map(i => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
          </TextField>
          <FormControl fullWidth margin="normal">
            <InputLabel>Members</InputLabel>
            <Select multiple value={form.member_ids}
              onChange={e => setForm(f => ({ ...f, member_ids: e.target.value }))}
              input={<OutlinedInput label="Members" />}
              renderValue={(selected) => (
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  {selected.map(id => (
                    <Chip key={id} label={indName(id)} size="small" />
                  ))}
                </Stack>
              )}>
              {individuals.map(i => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ bgcolor: '#7b1fa2', '&:hover': { bgcolor: '#6a1b9a' } }}>
            {saving ? 'Saving...' : editRow ? 'Save Changes' : 'Create Team'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!confirmId}
        title="Delete Team"
        message="Are you sure you want to delete this team? This action cannot be undone."
        onConfirm={handleDeleteTeam}
        onCancel={() => setConfirmId(null)}
      />

      <ConfirmDialog
        open={!!removeMemberState}
        title="Remove Member"
        message={`Remove ${removeMemberState?.memberName} from this team?`}
        onConfirm={handleRemoveMember}
        onCancel={() => setRemoveMemberState(null)}
      />

      <Notification {...notif} onClose={() => setNotif(n => ({ ...n, open: false }))} />
    </Box>
  );
}
