import { Snackbar, Alert } from '@mui/material';

export default function Notification({ open, message, severity = 'success', onClose }) {
  return (
    <Snackbar open={open} autoHideDuration={4000} onClose={onClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
      <Alert onClose={onClose} severity={severity} variant="filled">{message}</Alert>
    </Snackbar>
  );
}
