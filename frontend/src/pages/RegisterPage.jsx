import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, MenuItem, Divider
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { value: 'admin',       label: 'Admin — full access' },
  { value: 'manager',     label: 'Manager — manage all records' },
  { value: 'contributor', label: 'Contributor — create & update' },
  { value: 'viewer',      label: 'Viewer — read only' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', role: 'admin' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/login');
    } catch (err) {
      const data = err.response?.data;
      setError(data?.errors?.join(', ') || data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f0f2f5' }}>
      <Card sx={{ width: 420, borderRadius: 3, boxShadow: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
            <EmojiEventsIcon sx={{ color: '#1565c0', fontSize: 32 }} />
            <Typography variant="h5" fontWeight={700} color="primary">Team Tracker</Typography>
          </Box>
          <Typography align="center" color="text.secondary" sx={{ mb: 3 }}>Create your account</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField fullWidth label="Username" margin="normal" value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required autoFocus />
            <TextField fullWidth label="Password" type="password" margin="normal" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required helperText="At least 8 characters" />
            <TextField fullWidth select label="Role" margin="normal" value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </TextField>
            <Button fullWidth variant="contained" type="submit" sx={{ mt: 2, py: 1.2, fontWeight: 600 }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
            <Divider sx={{ my: 2 }} />
            <Typography align="center" variant="body2" color="text.secondary">
              Already have an account? <Link to="/login" style={{ color: '#1976d2', fontWeight: 600 }}>Sign in</Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
