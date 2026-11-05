import { memoryDb, query } from '../db/pool.js';
import { hashPassword } from '../middleware/auth.js';
import { sendHigherAuthorityAccountEmail, sendStaffAccountEmail } from '../services/email.service.js';

export function userRoutes(router) {
  // GET /api/v1/users
  router.get('/api/v1/users', (req, res) => {
    const safeUsers = memoryDb.tables.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      is_active: u.is_active,
    }));
    res.json({ data: safeUsers, total: safeUsers.length });
  });

  // POST /api/v1/users
  router.post('/api/v1/users', async (req, res) => {
    const { name, email, role, labId, department, password } = req.body || {};
    if (!name?.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Staff member name is required' } });
    }
    if (!email?.trim() || !email.toLowerCase().endsWith('.edu')) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'A valid university .edu email is required' } });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const existing = memoryDb.tables.users.find((u) => u.email.toLowerCase() === trimmedEmail);
    if (existing) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'An account with this email already exists' } });
    }

    // Determine initial password (provided or generated)
    const initialPassword = password?.trim() || `Univ#${Math.floor(1000 + Math.random() * 9000)}!`;
    const assignedRole = role || 'technician';
    const assignedDept = department || (assignedRole === 'authority' ? 'Academic Affairs' : 'Facilities & Operations');

    const newUser = {
      id: `${assignedRole}-${Date.now()}`,
      name: name.trim(),
      email: trimmedEmail,
      password_hash: hashPassword(initialPassword),
      role: assignedRole,
      department: assignedDept,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    memoryDb.tables.users.push(newUser);

    // Save to PostgreSQL if available
    try {
      await query(
        `INSERT INTO users (id, name, email, password_hash, role, department, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, is_active = true`,
        [newUser.id, newUser.name, newUser.email, newUser.password_hash, newUser.role, newUser.department]
      );
    } catch {
      // ignore
    }

    let assignedLabName = '';
    if (newUser.role === 'technician' && labId) {
      const lab = memoryDb.tables.labs.find((l) => l.id === labId);
      if (lab) {
        lab.technician_id = newUser.id;
        assignedLabName = `${lab.room} · ${lab.name}`;
      }
    }

    // Send credentials via email according to role
    if (assignedRole === 'authority') {
      // Admin creating Higher Authority
      sendHigherAuthorityAccountEmail({
        to: trimmedEmail,
        name: newUser.name,
        email: trimmedEmail,
        password: initialPassword,
        department: assignedDept,
      }).catch((err) => console.warn('[USERS] Higher Authority email delivery notice:', err.message));
    } else {
      // Higher Authority / Admin creating Staff / Technician / Accounts
      sendStaffAccountEmail({
        to: trimmedEmail,
        name: newUser.name,
        email: trimmedEmail,
        password: initialPassword,
        role: assignedRole,
        department: assignedDept,
        labName: assignedLabName || undefined,
      }).catch((err) => console.warn('[USERS] Staff account email delivery notice:', err.message));
    }

    const { password_hash, ...safeUser } = newUser;
    res.status(201).json({
      message: 'Staff account created successfully. Credentials dispatched to university email.',
      user: safeUser,
      generatedPassword: initialPassword,
    });
  });

  // DELETE /api/v1/users/:id
  router.delete('/api/v1/users/:id', (req, res) => {
    const { id } = req.params;
    if (id === 'admin-1') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Primary System Admin account cannot be removed' } });
    }

    const idx = memoryDb.tables.users.findIndex((u) => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const removed = memoryDb.tables.users.splice(idx, 1)[0];
    if (removed.role === 'technician') {
      for (const lab of memoryDb.tables.labs) {
        if (lab.technician_id === id) lab.technician_id = null;
      }
    }

    res.json({ message: 'User account removed' });
  });
}

