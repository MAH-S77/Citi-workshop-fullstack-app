import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, Divider
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid username or password');
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
          <Typography align="center" color="text.secondary" sx={{ mb: 3 }}>Sign in to your account</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField fullWidth label="Username" margin="normal" value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required autoFocus />
            <TextField fullWidth label="Password" type="password" margin="normal" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            <Button fullWidth variant="contained" type="submit" sx={{ mt: 2, py: 1.2, fontWeight: 600 }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <Divider sx={{ my: 2 }} />
            <Typography align="center" variant="body2" color="text.secondary">
              No account? <Link to="/register" style={{ color: '#1976d2', fontWeight: 600 }}>Register</Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
