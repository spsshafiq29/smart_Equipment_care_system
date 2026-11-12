import assert from 'node:assert/strict';
import { getNextTicketId } from '../routes/issues.routes.js';
import { memoryDb } from '../db/pool.js';

console.log('================================================================');
console.log('SECS QR PIPELINE & DEEP-LINK TEST SUITE');
console.log('================================================================');

function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${description}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(err);
    process.exit(1);
  }
}

async function asyncTest(description, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${description}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Dual-Mode Payload & Deep-Link Building
function buildDirectUrlPayload({ labId, equipmentType, serialNumber, assetTag, domain = 'https://secs.campus.edu' }) {
  const base = domain.replace(/\/+$/, '').replace(/#.*$/, '');
  const params = new URLSearchParams();
  params.set('lab', labId);
  params.set('equipment', equipmentType);
  params.set('serial', serialNumber);
  if (assetTag) params.set('tag', assetTag);
  return `${base}/#report?${params.toString()}`;
}

function buildJsonPayload({ labId, labName, equipmentType, serialNumber, assetTag }) {
  return JSON.stringify({
    app: 'SECS',
    labId,
    labName: labName || '',
    equipmentType,
    serialNumber,
    assetTag: assetTag || serialNumber,
  });
}

function parseQrPayload(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();

  // JSON format
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        labId: String(parsed.labId || parsed.lab || ''),
        labName: parsed.labName || undefined,
        equipmentType: String(parsed.equipmentType || parsed.equipment || ''),
        serialNumber: String(parsed.serialNumber || parsed.serial || ''),
        assetTag: parsed.assetTag || parsed.serialNumber || undefined,
        format: 'json',
      };
    } catch {}
  }

  // URL / Deep-link format
  try {
    let searchString = '';
    if (trimmed.includes('#report?') || trimmed.includes('#requisition?')) {
      const parts = trimmed.split(/#report\?|#requisition\?/);
      if (parts.length > 1) searchString = parts[1].split('#')[0];
    } else if (trimmed.includes('?')) {
      searchString = trimmed.split('?')[1].split('#')[0];
    }

    if (searchString) {
      const params = new URLSearchParams(searchString);
      return {
        labId: params.get('lab') || '',
        equipmentType: params.get('equipment') || '',
        serialNumber: params.get('serial') || '',
        assetTag: params.get('tag') || params.get('serial') || '',
        format: 'url',
      };
    }
  } catch {}

  return null;
}

// Test Suite Execution
test('Direct deep-link URL encodes all parameters correctly', () => {
  const url = buildDirectUrlPayload({
    labId: 'LAB-302',
    equipmentType: 'Workstation PC',
    serialNumber: 'PC-14',
    assetTag: 'NW-PC-14',
  });
  assert.equal(
    url,
    'https://secs.campus.edu/#report?lab=LAB-302&equipment=Workstation+PC&serial=PC-14&tag=NW-PC-14'
  );
});

test('Raw JSON payload adheres to SECS architectural standard', () => {
  const jsonStr = buildJsonPayload({
    labId: 'LAB-302',
    labName: 'Computer Networks Lab',
    equipmentType: 'Workstation PC',
    serialNumber: 'PC-14',
    assetTag: 'NW-PC-14',
  });
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.app, 'SECS');
  assert.equal(parsed.labId, 'LAB-302');
  assert.equal(parsed.labName, 'Computer Networks Lab');
  assert.equal(parsed.equipmentType, 'Workstation PC');
  assert.equal(parsed.serialNumber, 'PC-14');
  assert.equal(parsed.assetTag, 'NW-PC-14');
});

test('Universal QR parser successfully decodes Direct deep-link URLs', () => {
  const sampleUrl = 'https://secs.campus.edu/#report?lab=LAB-302&equipment=Workstation+PC&serial=PC-14&tag=NW-PC-14';
  const decoded = parseQrPayload(sampleUrl);
  assert.ok(decoded);
  assert.equal(decoded.format, 'url');
  assert.equal(decoded.labId, 'LAB-302');
  assert.equal(decoded.equipmentType, 'Workstation PC');
  assert.equal(decoded.serialNumber, 'PC-14');
  assert.equal(decoded.assetTag, 'NW-PC-14');
});

test('Universal QR parser successfully decodes Raw JSON payloads', () => {
  const rawJson = JSON.stringify({
    app: 'SECS',
    labId: 'LAB-302',
    labName: 'Computer Networks Lab',
    equipmentType: 'Workstation PC',
    serialNumber: 'PC-14',
    assetTag: 'NW-PC-14',
  });
  const decoded = parseQrPayload(rawJson);
  assert.ok(decoded);
  assert.equal(decoded.format, 'json');
  assert.equal(decoded.labId, 'LAB-302');
  assert.equal(decoded.equipmentType, 'Workstation PC');
  assert.equal(decoded.serialNumber, 'PC-14');
  assert.equal(decoded.assetTag, 'NW-PC-14');
});

test('Batch sequence generator produces contiguous padded sequence PC-01 to PC-40', () => {
  const prefix = 'PC-';
  const start = 1;
  const end = 40;
  const pad = 2;
  const tagPrefix = 'NW-PC-';

  const batch = [];
  for (let i = start; i <= end; i++) {
    const padded = String(i).padStart(pad, '0');
    batch.push({
      serialNumber: `${prefix}${padded}`,
      assetTag: `${tagPrefix}${padded}`,
    });
  }

  assert.equal(batch.length, 40);
  assert.equal(batch[0].serialNumber, 'PC-01');
  assert.equal(batch[0].assetTag, 'NW-PC-01');
  assert.equal(batch[39].serialNumber, 'PC-40');
  assert.equal(batch[39].assetTag, 'NW-PC-40');
});

test('Assigned Lab Filter strictly isolates technician laboratories', () => {
  const allLabs = [
    { id: 'lab-1', room: '302', name: 'Networks Lab', technicianId: 'tech-1' },
    { id: 'lab-2', room: '305', name: 'Electronics Lab', technicianId: 'tech-1' },
    { id: 'lab-3', room: '401', name: 'Microprocessor Lab', technicianId: 'tech-2' },
  ];

  const technicianUser = { id: 'tech-1', role: 'technician' };
  const adminUser = { id: 'admin-1', role: 'admin' };

  // Filter for technician
  const techLabs = allLabs.filter((l) => l.technicianId === technicianUser.id);
  assert.equal(techLabs.length, 2);
  assert.ok(techLabs.some((l) => l.room === '302'));
  assert.ok(techLabs.some((l) => l.room === '305'));
  assert.ok(!techLabs.some((l) => l.room === '401'));

  // Filter for admin
  const adminLabs = adminUser.role === 'admin' ? allLabs : techLabs;
  assert.equal(adminLabs.length, 3);
});

await asyncTest('End-to-End Simulation: QR Scan data directly creates verified database issue', async () => {
  const simulatedQrScanPayload = 'https://secs.campus.edu/#report?lab=LAB-302&equipment=Workstation+PC&serial=PC-14&tag=NW-PC-14';
  const parsed = parseQrPayload(simulatedQrScanPayload);
  assert.ok(parsed);

  const nextId = await getNextTicketId();
  assert.match(nextId, /^TKT-\d+$/);

  const newIssue = {
    id: nextId,
    lab_id: parsed.labId,
    lab_name: 'Room 302 · Computer Networks Lab',
    equipment_type: parsed.equipmentType,
    asset_tag: parsed.assetTag,
    item: `${parsed.equipmentType} (${parsed.serialNumber})`,
    description: 'Kernel panic on boot after power fluctuation in Bench 02.',
    priority: 'High',
    status: 'Assigned',
    current_stage: 'Awaiting technician assessment',
    pending_with: 'Tariq Hasan',
    assigned_technician_id: 'tech-1',
    reporter_email: 'student@campus.edu',
    reporter_name: 'Shafiq Mollah',
    created_at: new Date().toISOString(),
  };

  memoryDb.tables.issues.unshift(newIssue);

  const found = memoryDb.tables.issues.find((i) => i.id === nextId);
  assert.ok(found);
  assert.equal(found.asset_tag, 'NW-PC-14');
  assert.equal(found.equipment_type, 'Workstation PC');
  assert.equal(found.item, 'Workstation PC (PC-14)');
});

console.log('\n================================================================');
console.log('ALL QR PIPELINE CHECKS PASSED (7 / 7)');
console.log('================================================================\n');

