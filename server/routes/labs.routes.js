import { memoryDb } from '../db/pool.js';

export function labRoutes(router) {
  // GET /api/v1/labs
  router.get('/api/v1/labs', (req, res) => {
    const list = memoryDb.tables.labs.map((lab) => {
      const openIssues = memoryDb.tables.issues.filter(
        (i) => (i.lab_id === lab.id || i.lab_name?.includes(lab.room)) && i.status !== 'Resolved' && !i.status.includes('Rejected')
      ).length;
      const tech = memoryDb.tables.users.find((u) => u.id === lab.technician_id);
      return {
        ...lab,
        technicianName: tech ? tech.name : 'Awaiting assignment',
        openIssues,
      };
    });
    res.json({ data: list, total: list.length });
  });

  // POST /api/v1/labs
  router.post('/api/v1/labs', (req, res) => {
    const { room, name, department, technicianId } = req.body || {};
    if (!room || !name) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Room code and lab name are required' } });
    }

    const newLab = {
      id: `lab-${Date.now()}`,
      room: room.trim(),
      name: name.trim(),
      department: department || 'Engineering',
      technician_id: technicianId || null,
      created_at: new Date().toISOString(),
    };

    memoryDb.tables.labs.push(newLab);
    res.status(201).json({ message: 'Lab created successfully', lab: newLab });
  });

  // PATCH /api/v1/labs/:id
  router.patch('/api/v1/labs/:id', (req, res) => {
    const { id } = req.params;
    const lab = memoryDb.tables.labs.find((l) => l.id === id);
    if (!lab) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Lab not found' } });
    }

    const { technicianId } = req.body || {};
    lab.technician_id = technicianId || null;
    res.json({ message: 'Lab technician assignment updated', lab });
  });

  // DELETE /api/v1/labs/:id
  router.delete('/api/v1/labs/:id', (req, res) => {
    const { id } = req.params;
    const idx = memoryDb.tables.labs.findIndex((l) => l.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Lab not found' } });
    }
    memoryDb.tables.labs.splice(idx, 1);
    res.json({ message: 'Lab removed successfully' });
  });
}

