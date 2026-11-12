export interface EquipmentQrPayload {
  app: "SECS";
  labId: string;
  labName?: string;
  room?: string;
  equipmentType: string;
  serialNumber: string;
  assetTag?: string;
  generatedAt?: string;
}

export type QrPayloadMode = "url" | "json";

export interface BuildUrlOptions {
  domain?: string;
  includeHashPrefix?: boolean;
}

/**
 * Builds the direct deep-link URL for native smartphone cameras.
 * When scanned by iPhone/Android camera, it immediately opens the SECS app
 * at the report form with all equipment parameters pre-populated.
 * Format: https://<domain>/#report?lab=<LAB_ID>&equipment=<TYPE>&serial=<SERIAL_NO>&tag=<ASSET_TAG>
 */
export function buildDirectUrlPayload(
  data: {
    labId: string;
    equipmentType: string;
    serialNumber: string;
    assetTag?: string;
  },
  options?: BuildUrlOptions
): string {
  let base = options?.domain?.trim();
  if (!base) {
    if (typeof window !== "undefined" && window.location) {
      base = window.location.origin + window.location.pathname.replace(/\/$/, "");
    } else {
      base = "https://secs.campus.edu";
    }
  }

  // Remove trailing slashes and hash if already included in base
  base = base.replace(/\/+$/, "").replace(/#.*$/, "");

  const params = new URLSearchParams();
  params.set("lab", data.labId);
  params.set("equipment", data.equipmentType);
  params.set("serial", data.serialNumber);
  if (data.assetTag && data.assetTag.trim()) {
    params.set("tag", data.assetTag.trim());
  }

  return `${base}/#report?${params.toString()}`;
}

/**
 * Builds the raw JSON payload specified in the SECS architectural requirements:
 * {
 *   "app": "SECS",
 *   "labId": "LAB-302",
 *   "labName": "Computer Networks Lab",
 *   "equipmentType": "Workstation PC",
 *   "serialNumber": "PC-14",
 *   "assetTag": "NW-PC-14"
 * }
 */
export function buildJsonPayload(data: {
  labId: string;
  labName?: string;
  room?: string;
  equipmentType: string;
  serialNumber: string;
  assetTag?: string;
}): string {
  const payload: EquipmentQrPayload = {
    app: "SECS",
    labId: data.labId,
    labName: data.labName || "",
    room: data.room || "",
    equipmentType: data.equipmentType,
    serialNumber: data.serialNumber,
    assetTag: data.assetTag || data.serialNumber,
    generatedAt: new Date().toISOString(),
  };
  return JSON.stringify(payload, null, 2);
}

export interface ParsedEquipmentData {
  labId: string;
  labName?: string;
  room?: string;
  equipmentType: string;
  serialNumber: string;
  assetTag?: string;
  rawSource: string;
  format: "url" | "json" | "text";
}

/**
 * Universal parser capable of decoding both direct deep-link URLs and raw JSON payloads.
 * Accepts:
 *  1. Direct URLs: https://domain/#report?lab=LAB-302&equipment=Workstation+PC&serial=PC-14&tag=NW-PC-14
 *  2. Search URLs: https://domain/?lab=LAB-302&equipment=Workstation+PC...
 *  3. Hash fragments: #report?lab=... or #requisition?lab=...
 *  4. Raw JSON strings: {"app":"SECS", "labId":"...", ...}
 */
export function parseQrPayload(raw: string): ParsedEquipmentData | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();

  // 1. Attempt JSON parsing
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      const labId = parsed.labId || parsed.lab || parsed.room || "";
      const equipmentType = parsed.equipmentType || parsed.equipment || parsed.item || "";
      const serialNumber = parsed.serialNumber || parsed.serial || parsed.assetTag || parsed.asset_tag || "";
      const assetTag = parsed.assetTag || parsed.asset_tag || parsed.serialNumber || "";

      if (labId || equipmentType || serialNumber) {
        return {
          labId: String(labId),
          labName: parsed.labName ? String(parsed.labName) : undefined,
          room: parsed.room ? String(parsed.room) : undefined,
          equipmentType: String(equipmentType),
          serialNumber: String(serialNumber),
          assetTag: assetTag ? String(assetTag) : undefined,
          rawSource: trimmed,
          format: "json",
        };
      }
    } catch {
      // Continue to URL detection
    }
  }

  // 2. Attempt URL / Deep-Link parsing
  try {
    let searchString = "";

    // Check for hash parameters e.g. #report?lab=...
    if (trimmed.includes("#report?") || trimmed.includes("#requisition?")) {
      const parts = trimmed.split(/#report\?|#requisition\?/);
      if (parts.length > 1) {
        searchString = parts[1].split("#")[0];
      }
    } else if (trimmed.includes("?")) {
      searchString = trimmed.split("?")[1].split("#")[0];
    } else if (trimmed.startsWith("lab=") || trimmed.startsWith("equipment=")) {
      searchString = trimmed;
    }

    if (searchString) {
      const params = new URLSearchParams(searchString);
      const labId = params.get("lab") || params.get("labId") || params.get("room") || "";
      const equipmentType = params.get("equipment") || params.get("equipmentType") || params.get("type") || "";
      const serialNumber = params.get("serial") || params.get("serialNumber") || params.get("id") || "";
      const assetTag = params.get("tag") || params.get("assetTag") || params.get("asset_tag") || serialNumber;
      const labName = params.get("labName") || params.get("name") || "";

      if (labId || equipmentType || serialNumber) {
        return {
          labId,
          labName: labName || undefined,
          equipmentType,
          serialNumber,
          assetTag: assetTag || undefined,
          rawSource: trimmed,
          format: "url",
        };
      }
    }
  } catch {
    // Continue to text parsing
  }

  // 3. Fallback: Parse structured key:value lines
  const lines = trimmed.split("\n");
  const extracted: Record<string, string> = {};
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const val = line.slice(colonIdx + 1).trim();
      extracted[key] = val;
    }
  }

  if (extracted.lab || extracted.serial || extracted.equipment) {
    return {
      labId: extracted.lab || extracted.room || extracted.labid || "",
      equipmentType: extracted.equipment || extracted.equipmenttype || extracted.type || "",
      serialNumber: extracted.serial || extracted.serialnumber || extracted.id || "",
      assetTag: extracted.tag || extracted.assettag || extracted.serial || "",
      rawSource: trimmed,
      format: "text",
    };
  }

  return null;
}

