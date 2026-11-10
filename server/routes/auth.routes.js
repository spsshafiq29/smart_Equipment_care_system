import { memoryDb, query } from '../db/pool.js';
import { generateToken, hashPassword } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../services/email.service.js';

export function authRoutes(router) {
  // GET /api/v1/auth/admin-status - checks if primary admin has been set up
  router.get('/api/v1/auth/admin-status', async (req, res) => {
    let pgChecked = false;
    let pgAdminExists = false;
    try {
      // Check Postgres if available
      const dbRes = await query("SELECT id FROM users WHERE role = 'admin' AND is_active = true LIMIT 1");
      if (dbRes && Array.isArray(dbRes.rows)) {
        pgChecked = true;
        pgAdminExists = dbRes.rows.length > 0;
      }
    } catch {
      // ignore
    }

    if (pgChecked) {
      return res.json({ adminConfigured: pgAdminExists });
    }

    const memAdmin = memoryDb.tables.users.some((u) => u.role === 'admin' && u.is_active);
    res.json({ adminConfigured: Boolean(memAdmin) });
  });

  // POST /api/v1/auth/setup-admin - initial setup of the primary admin account
  router.post('/api/v1/auth/setup-admin', async (req, res) => {
    // Check if an admin is already configured
    let adminExists = false;
    let pgChecked = false;
    try {
      const dbRes = await query("SELECT id FROM users WHERE role = 'admin' AND is_active = true LIMIT 1");
      if (dbRes && Array.isArray(dbRes.rows)) {
        pgChecked = true;
        adminExists = dbRes.rows.length > 0;
      }
    } catch {
      // ignore
    }
    if (!pgChecked) {
      adminExists = memoryDb.tables.users.some((u) => u.role === 'admin' && u.is_active);
    }

    if (adminExists) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'System Admin account has already been initialized.' },
      });
    }

    const { name, email, password, department } = req.body || {};
    if (!name?.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Admin username/full name is required' } });
    }
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'A valid email address is required' } });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters' } });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const passwordHash = hashPassword(password);
    const adminUser = {
      id: 'admin-1',
      name: name.trim(),
      email: trimmedEmail,
      password_hash: passwordHash,
      role: 'admin',
      department: department?.trim() || 'Facilities & IT Management',
      student_id: null,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // Save to memory store
    memoryDb.tables.users = memoryDb.tables.users.filter((u) => u.id !== 'admin-1' && u.email !== trimmedEmail);
    memoryDb.tables.users.push(adminUser);

    // Save to PostgreSQL if connected
    try {
      await query(
        `INSERT INTO users (id, name, email, password_hash, role, department, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, is_active = true`,
        [adminUser.id, adminUser.name, adminUser.email, adminUser.password_hash, adminUser.role, adminUser.department, true]
      );
    } catch {
      // ignore
    }

    const token = generateToken(adminUser);
    const { password_hash, ...safeUser } = adminUser;

    res.status(201).json({
      message: 'System Admin account successfully initialized.',
      accessToken: token,
      user: safeUser,
    });
  });

  // POST /api/v1/auth/login
  router.post('/api/v1/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email is required' } });
    }
    if (!password) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Password is required' } });
    }

    const trimmed = email.trim().toLowerCase();
    let user = null;

    // First try PostgreSQL (support email, username/name, or student_id)
    try {
      const dbRes = await query(
        'SELECT * FROM users WHERE (LOWER(email) = $1 OR LOWER(name) = $1 OR LOWER(student_id) = $1) AND is_active = true',
        [trimmed]
      );
      if (dbRes && dbRes.rows && dbRes.rows.length > 0) {
        user = dbRes.rows[0];
      }
    } catch {
      // ignore
    }

    // Fall back to memoryDb
    if (!user) {
      user = memoryDb.tables.users.find(
        (u) =>
          (u.email.toLowerCase() === trimmed ||
            (u.name && u.name.toLowerCase() === trimmed) ||
            (u.student_id && u.student_id.toLowerCase() === trimmed)) &&
          u.is_active
      );
    }

    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials or user not found' } });
    }

    const inputHash = hashPassword(password);
    if (user.password_hash !== inputHash) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } });
    }

    const token = generateToken(user);
    res.json({
      accessToken: token,
      expiresIn: 86400,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        studentId: user.student_id,
      },
    });
  });

  // POST /api/v1/auth/register
  router.post('/api/v1/auth/register', async (req, res) => {
    const { fullName, studentId, email, department, role, password } = req.body || {};

    if (!fullName?.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Full name is required' } });
    }
    const isValidEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!email?.trim() || !isValidEmail) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'A valid email address is required' } });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters' } });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedStudentId = studentId?.trim() || null;

    // Strict Check: Exactly 1 account per email across entire system
    let existing = null;
    try {
      const dbRes = await query('SELECT id, email, role FROM users WHERE LOWER(TRIM(email)) = $1', [trimmedEmail]);
      if (dbRes && dbRes.rows && dbRes.rows.length > 0) existing = dbRes.rows[0];
    } catch (err) {
      console.error('[Register Email Check Error]:', err);
    }
    if (!existing) {
      existing = memoryDb.tables.users.find((u) => (u.email || '').trim().toLowerCase() === trimmedEmail);
    }
    if (existing) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'An account with this email address already exists. Only one account per email is permitted.',
        },
      });
    }

    // Check duplicate student / university ID if provided
    if (trimmedStudentId) {
      let existingId = null;
      try {
        const sRes = await query('SELECT id FROM users WHERE student_id = $1', [trimmedStudentId]);
        if (sRes && sRes.rows && sRes.rows.length > 0) existingId = sRes.rows[0];
      } catch (err) {
        console.error('[Register Student ID Check Error]:', err);
      }
      if (!existingId) {
        existingId = memoryDb.tables.users.find((u) => u.student_id === trimmedStudentId);
      }
      if (existingId) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'An account with this University / Student ID already exists.',
          },
        });
      }
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      name: fullName.trim(),
      email: trimmedEmail,
      password_hash: hashPassword(password),
      role: role || 'student',
      department: department || 'General Engineering',
      student_id: trimmedStudentId,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    memoryDb.tables.users.push(newUser);

    try {
      await query(
        `INSERT INTO users (id, name, email, password_hash, role, department, student_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [newUser.id, newUser.name, newUser.email, newUser.password_hash, newUser.role, newUser.department, newUser.student_id, true]
      );
    } catch (err) {
      // Remove from memory if DB rejected
      memoryDb.tables.users = memoryDb.tables.users.filter((u) => u.id !== newUser.id);
      if (err.code === '23505') {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'An account with this email address or Student ID already exists.',
          },
        });
      }
      console.error('[PostgreSQL User Insert Error]:', err);
      return res.status(500).json({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database registration error. Please try again.',
        },
      });
    }

    const token = generateToken(newUser);

    res.status(201).json({
      message: 'Account created successfully.',
      userId: newUser.id,
      accessToken: token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
      },
    });
  });

  // POST /api/v1/auth/forgot-password - generate reset verification code
  router.post('/api/v1/auth/forgot-password', async (req, res) => {
    const { email } = req.body || {};
    if (!email?.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email is required' } });
    }

    const trimmed = email.trim().toLowerCase();
    let user = null;

    try {
      const dbRes = await query('SELECT id, email, name FROM users WHERE LOWER(email) = $1 AND is_active = true', [trimmed]);
      if (dbRes && dbRes.rows && dbRes.rows.length > 0) user = dbRes.rows[0];
    } catch {
      // ignore
    }
    if (!user) {
      user = memoryDb.tables.users.find((u) => u.email.toLowerCase() === trimmed && u.is_active);
    }

    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No registered account found with this email' } });
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const record = {
      email: trimmed,
      token: resetCode,
      expires_at: expiresAt,
      used: false,
      created_at: new Date().toISOString(),
    };

    memoryDb.tables.password_resets.push(record);

    try {
      await query(
        `INSERT INTO password_resets (email, token, expires_at, used) VALUES ($1, $2, $3, false)`,
        [trimmed, resetCode, expiresAt]
      );
    } catch {
      // ignore
    }

    // Dispatch professional password reset email via Brevo REST API
    let emailStatus = 'dispatched';
    let emailError = null;
    try {
      const emailResult = await sendPasswordResetEmail({
        to: trimmed,
        name: user.name || 'Campus Member',
        code: resetCode,
        expiresMinutes: 15,
      });
      if (!emailResult || !emailResult.success) {
        emailStatus = 'failed';
        emailError = emailResult?.error || 'Email dispatch failed';
      }
    } catch (err) {
      emailStatus = 'failed';
      emailError = err?.message || 'Email dispatch exception';
      console.warn('[AUTH] Error sending password reset email:', err.message);
    }

    res.json({
      success: true,
      message: 'Password reset code has been sent to your university email. Valid for 15 minutes.',
      emailStatus,
      emailError,
    });
  });

  // POST /api/v1/auth/reset-password - apply new password
  router.post('/api/v1/auth/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body || {};
    if (!email?.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email is required' } });
    }
    if (!code?.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Reset code is required' } });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 6 characters' } });
    }

    const trimmed = email.trim().toLowerCase();
    const trimmedCode = code.trim();

    // Check validity
    let valid = false;
    try {
      const dbRes = await query(
        `SELECT id FROM password_resets 
         WHERE LOWER(email) = $1 AND token = $2 AND used = false AND expires_at > CURRENT_TIMESTAMP 
         ORDER BY id DESC LIMIT 1`,
        [trimmed, trimmedCode]
      );
      if (dbRes && dbRes.rows && dbRes.rows.length > 0) valid = true;
    } catch {
      // ignore
    }

    if (!valid) {
      const memRecord = memoryDb.tables.password_resets
        .slice()
        .reverse()
        .find((r) => r.email === trimmed && r.token === trimmedCode && !r.used && new Date(r.expires_at) > new Date());
      if (memRecord) {
        valid = true;
        memRecord.used = true;
      }
    }

    if (!valid) {
      return res.status(400).json({
        error: { code: 'INVALID_CODE', message: 'Invalid or expired password reset verification code' },
      });
    }

    const newHash = hashPassword(newPassword);

    // Update in memory
    const memUser = memoryDb.tables.users.find((u) => u.email.toLowerCase() === trimmed);
    if (memUser) {
      memUser.password_hash = newHash;
    }

    // Update in PostgreSQL
    try {
      await query('UPDATE users SET password_hash = $1 WHERE LOWER(email) = $2', [newHash, trimmed]);
      await query('UPDATE password_resets SET used = true WHERE LOWER(email) = $1 AND token = $2', [trimmed, trimmedCode]);
    } catch {
      // ignore
    }

    res.json({
      success: true,
      message: 'Password successfully updated. You can now log in with your new password.',
    });
  });

  // GET /api/v1/auth/me
  router.get('/api/v1/auth/me', (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    const { password_hash, ...safeUser } = req.user;
    res.json(safeUser);
  });

  // POST /api/v1/auth/logout
  router.post('/api/v1/auth/logout', (req, res) => {
    res.json({ message: 'Signed out successfully' });
  });
}
