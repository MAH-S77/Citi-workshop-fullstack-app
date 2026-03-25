import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Card, CardContent, TextField, Button, Typography, Alert, MenuItem } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const ROLES = ['viewer', 'contributor', 'manager', 'admin'];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', role: 'viewer' });
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
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'grey.100' }}>
      <Card sx={{ width: 380 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom align="center">Register</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField fullWidth label="Username" margin="normal" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
            <TextField fullWidth label="Password" type="password" margin="normal" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required helperText="At least 8 characters" />
            <TextField fullWidth select label="Role" margin="normal" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }} disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </Button>
            <Typography align="center" sx={{ mt: 2 }}>
              Already have an account? <Link to="/login">Sign in</Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
