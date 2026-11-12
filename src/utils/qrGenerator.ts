import QRCode from "qrcode";
import { buildDirectUrlPayload, buildJsonPayload, type QrPayloadMode } from "./qrPayload";
import type { Lab } from "../workflowTypes";

export interface GeneratedSticker {
  id: string;
  labId: string;
  labRoom: string;
  labName: string;
  department?: string;
  equipmentType: string;
  serialNumber: string;
  assetTag: string;
  payloadUrl: string;
  payloadJson: string;
  activePayload: string;
  qrDataUrl: string;
  qrSvg: string;
  createdAt: string;
}

export interface SingleStickerInput {
  lab: Lab;
  equipmentType: string;
  serialNumber: string;
  assetTag?: string;
  payloadMode?: QrPayloadMode;
  domain?: string;
}

export interface BatchSequenceInput {
  lab: Lab;
  equipmentType: string;
  prefix: string; // e.g. "PC-"
  startNum: number; // e.g. 1
  endNum: number; // e.g. 40
  padLength: number; // e.g. 2 -> "01", "02"
  assetTagPrefix?: string; // e.g. "NW-PC-"
  payloadMode?: QrPayloadMode;
  domain?: string;
}

/**
 * Generate a single high-resolution QR sticker data object
 */
export async function generateSingleSticker(input: SingleStickerInput): Promise<GeneratedSticker> {
  const { lab, equipmentType, serialNumber, assetTag, payloadMode = "url", domain } = input;
  const cleanSerial = serialNumber.trim();
  const cleanTag = (assetTag && assetTag.trim()) || cleanSerial;

  const payloadUrl = buildDirectUrlPayload(
    {
      labId: lab.id || lab.room,
      equipmentType,
      serialNumber: cleanSerial,
      assetTag: cleanTag,
    },
    { domain }
  );

  const payloadJson = buildJsonPayload({
    labId: lab.id || lab.room,
    labName: lab.name,
    room: lab.room,
    equipmentType,
    serialNumber: cleanSerial,
    assetTag: cleanTag,
  });

  const activePayload = payloadMode === "json" ? payloadJson : payloadUrl;

  // High-resolution canvas/PNG data URL (400px wide, high error correction level M)
  const qrDataUrl = await QRCode.toDataURL(activePayload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 420,
    color: {
      dark: "#0b1329",
      light: "#ffffff",
    },
  });

  // Vector SVG string for lossless reproduction
  const qrSvg = await QRCode.toString(activePayload, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: {
      dark: "#0b1329",
      light: "#ffffff",
    },
  });

  return {
    id: `${lab.room}-${equipmentType}-${cleanSerial}-${Date.now()}`,
    labId: lab.id,
    labRoom: lab.room,
    labName: lab.name,
    department: lab.department,
    equipmentType,
    serialNumber: cleanSerial,
    assetTag: cleanTag,
    payloadUrl,
    payloadJson,
    activePayload,
    qrDataUrl,
    qrSvg,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Batch sequence generator:
 * Iterates through a numerical range (e.g., PC-01 to PC-40) and produces
 * individual QR stickers in parallel.
 */
export async function generateBatchSequence(input: BatchSequenceInput): Promise<GeneratedSticker[]> {
  const {
    lab,
    equipmentType,
    prefix,
    startNum,
    endNum,
    padLength = 2,
    assetTagPrefix,
    payloadMode = "url",
    domain,
  } = input;

  const min = Math.min(startNum, endNum);
  const max = Math.max(startNum, endNum);
  const total = max - min + 1;

  if (total <= 0 || total > 200) {
    throw new Error("Batch sequence range must be between 1 and 200 devices.");
  }

  const cleanPrefix = prefix.trim();
  const cleanTagPrefix = assetTagPrefix?.trim() || "";

  const tasks: Promise<GeneratedSticker>[] = [];

  for (let i = min; i <= max; i++) {
    const numPadded = String(i).padStart(padLength, "0");
    const serialNumber = `${cleanPrefix}${numPadded}`;
    const assetTag = cleanTagPrefix ? `${cleanTagPrefix}${numPadded}` : serialNumber;

    tasks.push(
      generateSingleSticker({
        lab,
        equipmentType,
        serialNumber,
        assetTag,
        payloadMode,
        domain,
      })
    );
  }

  return Promise.all(tasks);
}

/**
 * Trigger browser file download from a data URL (e.g. PNG)
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Trigger browser file download from an SVG string
 */
export function downloadSvg(svgString: string, filename: string): void {
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export all generated stickers as a single JSON manifest file
 */
export function exportStickersManifest(stickers: GeneratedSticker[], filename = "secs-asset-stickers-manifest.json"): void {
  const data = JSON.stringify(
    {
      university: "Smart Equipment Care System (SECS)",
      exportedAt: new Date().toISOString(),
      count: stickers.length,
      stickers: stickers.map((s) => ({
        labRoom: s.labRoom,
        labName: s.labName,
        equipmentType: s.equipmentType,
        serialNumber: s.serialNumber,
        assetTag: s.assetTag,
        directUrl: s.payloadUrl,
        rawJson: s.payloadJson,
      })),
    },
    null,
    2
  );
  const blob = new Blob([data], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

