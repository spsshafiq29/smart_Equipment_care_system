import React, { useMemo, useState } from "react";
import type { EquipmentTypeOption, Lab, StaffAccount } from "../workflowTypes";
import {
  downloadDataUrl,
  downloadSvg,
  exportStickersManifest,
  generateBatchSequence,
  generateSingleSticker,
  type GeneratedSticker,
} from "../utils/qrGenerator";
import type { QrPayloadMode } from "../utils/qrPayload";

interface EquipmentQrGeneratorProps {
  currentUser: StaffAccount | null;
  labs: Lab[];
  equipmentTypes: EquipmentTypeOption[];
  universityName?: string;
  initialLabId?: string;
}

const DEFAULT_EQUIPMENT_PRESETS = [
  "Workstation PC",
  "Oscilloscope",
  "Digital Multimeter",
  "Function Generator",
  "DC Power Supply",
  "Microscope",
  "3D Printer",
  "Soldering Station",
  "Network Switch",
  "Projector",
];

export default function EquipmentQrGenerator({
  currentUser,
  labs,
  equipmentTypes,
  universityName = "Smart Equipment Care System",
  initialLabId,
}: EquipmentQrGeneratorProps) {
  const currentUserId = currentUser?.id || "";
  const isTechnician = currentUser?.role === "technician";

  // 1. Assigned Lab Filter: Exclusively allow technicians to generate QR codes for laboratories they are actively assigned to
  const authorizedLabs = useMemo(() => {
    if (!isTechnician) {
      return [];
    }
    return labs.filter(
      (l) =>
        l.technicianId === currentUserId ||
        (currentUser?.assignedLabs && currentUser.assignedLabs.includes(l.id))
    );
  }, [labs, currentUserId, isTechnician, currentUser?.assignedLabs]);

  // Selected Lab
  const [selectedLabId, setSelectedLabId] = useState<string>(() => {
    if (initialLabId && authorizedLabs.some((l) => l.id === initialLabId)) {
      return initialLabId;
    }
    return authorizedLabs[0]?.id || "";
  });

  // Active generation mode: "single" or "batch"
  const [genMode, setGenMode] = useState<"single" | "batch">("batch");

  // Equipment selection
  const [equipmentType, setEquipmentType] = useState<string>("Workstation PC");
  const [customEquipment, setCustomEquipment] = useState<string>("");

  // Single mode state
  const [singleSerial, setSingleSerial] = useState<string>("PC-01");
  const [singleAssetTag, setSingleAssetTag] = useState<string>("NW-PC-01");

  // Batch sequence mode state
  const [batchPrefix, setBatchPrefix] = useState<string>("PC-");
  const [batchStart, setBatchStart] = useState<number>(1);
  const [batchEnd, setBatchEnd] = useState<number>(30);
  const [padLength, setPadLength] = useState<number>(2);
  const [batchTagPrefix, setBatchTagPrefix] = useState<string>("NW-PC-");

  // Payload configuration
  const [payloadMode, setPayloadMode] = useState<QrPayloadMode>("url");
  const [customDomain, setCustomDomain] = useState<string>("");
  const [showAdvancedPayload, setShowAdvancedPayload] = useState<boolean>(false);

  // Output generated stickers state
  const [stickers, setStickers] = useState<GeneratedSticker[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [previewSticker, setPreviewSticker] = useState<GeneratedSticker | null>(null);
  const [printLayout, setPrintLayout] = useState<"grid2" | "grid3">("grid2");

  const activeLab = useMemo(() => {
    return authorizedLabs.find((l) => l.id === selectedLabId) || authorizedLabs[0] || null;
  }, [authorizedLabs, selectedLabId]);

  const effectiveEquipment = equipmentType === "Others" ? customEquipment.trim() : equipmentType;

  // Single Generation Handler
  async function handleGenerateSingle(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!activeLab) {
      setErrorMsg("Please select an authorized laboratory.");
      return;
    }
    if (!effectiveEquipment) {
      setErrorMsg("Please specify the equipment classification.");
      return;
    }
    if (!singleSerial.trim()) {
      setErrorMsg("Serial Number / Workstation ID is required (e.g. PC-01, OSC-02).");
      return;
    }

    try {
      setIsGenerating(true);
      const sticker = await generateSingleSticker({
        lab: activeLab,
        equipmentType: effectiveEquipment,
        serialNumber: singleSerial.trim(),
        assetTag: singleAssetTag.trim() || undefined,
        payloadMode,
        domain: customDomain.trim() || undefined,
      });

      setStickers([sticker]);
      setPreviewSticker(sticker);
      setSuccessMsg(`Generated 1 high-resolution asset sticker for ${singleSerial.trim()}`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to generate QR sticker.");
    } finally {
      setIsGenerating(false);
    }
  }

  // Batch Sequence Generation Handler
  async function handleGenerateBatch(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!activeLab) {
      setErrorMsg("Please select an authorized laboratory.");
      return;
    }
    if (!effectiveEquipment) {
      setErrorMsg("Please specify the equipment classification.");
      return;
    }
    if (!batchPrefix.trim()) {
      setErrorMsg("Serial Number Prefix is required (e.g. PC-, WS-, BENCH-).");
      return;
    }
    if (batchStart < 1 || batchEnd < batchStart) {
      setErrorMsg("Batch range start must be >= 1 and end must be >= start.");
      return;
    }
    const count = batchEnd - batchStart + 1;
    if (count > 200) {
      setErrorMsg("Maximum batch size is 200 stickers at once.");
      return;
    }

    try {
      setIsGenerating(true);
      const batch = await generateBatchSequence({
        lab: activeLab,
        equipmentType: effectiveEquipment,
        prefix: batchPrefix.trim(),
        startNum: batchStart,
        endNum: batchEnd,
        padLength,
        assetTagPrefix: batchTagPrefix.trim() || undefined,
        payloadMode,
        domain: customDomain.trim() || undefined,
      });

      setStickers(batch);
      setPreviewSticker(batch[0] || null);
      setSuccessMsg(`Successfully generated ${batch.length} physical QR asset stickers for Room ${activeLab.room} (${batchPrefix}${String(batchStart).padStart(padLength, "0")} to ${batchPrefix}${String(batchEnd).padStart(padLength, "0")})`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to generate batch QR stickers.");
    } finally {
      setIsGenerating(false);
    }
  }

  // One-click Print Label Sheet
  function handlePrintSheet() {
    if (stickers.length === 0) return;
    window.print();
  }

  const filteredStickers = useMemo(() => {
    if (!searchFilter.trim()) return stickers;
    const q = searchFilter.toLowerCase();
    return stickers.filter(
      (s) =>
        s.serialNumber.toLowerCase().includes(q) ||
        s.assetTag.toLowerCase().includes(q) ||
        s.equipmentType.toLowerCase().includes(q)
    );
  }, [stickers, searchFilter]);

  // Combined equipment options
  const allEquipmentOptions = useMemo(() => {
    const list = equipmentTypes.map((e) => e.label);
    for (const preset of DEFAULT_EQUIPMENT_PRESETS) {
      if (!list.includes(preset)) list.push(preset);
    }
    return list;
  }, [equipmentTypes]);

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER & CONTEXT ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08] no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
              Technician Portal · Asset Tagging
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              Dual-Mode Deep-Link Ready
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Equipment QR Asset Sticker Generator
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Generate, preview, batch-sequence, and print standardized institutional QR asset stickers. Academic users can scan these stickers with any smartphone camera to instantly submit pre-filled fault reports.
          </p>
        </div>

        {stickers.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintSheet}
              className="px-4 py-2 rounded-lg btn-institutional-primary text-xs font-semibold flex items-center gap-2 shadow-lg"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>Print Label Sheet ({stickers.length})</span>
            </button>
            <button
              onClick={() => exportStickersManifest(stickers)}
              className="px-3 py-2 rounded-lg btn-institutional-secondary text-xs font-medium flex items-center gap-1.5"
              title="Download JSON manifest of all generated stickers"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Manifest</span>
            </button>
          </div>
        )}
      </div>

      {/* ── ASSIGNED LAB FILTER RESTRICTION ── */}
      {!isTechnician ? (
        <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2 no-print">
          <div className="flex items-center gap-2 text-sm font-bold">
            <svg className="w-5 h-5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Technician Portal Restricted Access</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Equipment QR Code generation is exclusively designated for certified <strong>Laboratory Technicians</strong> for their assigned laboratory rooms. Please log in with an assigned Technician account.
          </p>
        </div>
      ) : authorizedLabs.length === 0 ? (
        <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2 no-print">
          <div className="flex items-center gap-2 text-sm font-bold">
            <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>No Assigned Laboratories Detected</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Per SECS laboratory operations protocol, technicians may only generate physical QR equipment stickers for laboratories they are actively assigned to. Your account (<strong>{currentUser?.name || "Technician"}</strong>) is currently not linked to any designated facility. Please contact an institutional administrator to assign your lab coverage.
          </p>
        </div>
      ) : (
        <>
          {/* ── GENERATOR CONTROLS CARD ── */}
          <div className="surface-card rounded-xl p-5 sm:p-6 border border-white/[0.08] shadow-lg space-y-5 no-print">
            {/* Assigned Lab Banner */}
            <div className="p-3.5 rounded-lg bg-[#091122] border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    Your Assigned Laboratory Facility
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <select
                      value={selectedLabId}
                      onChange={(e) => setSelectedLabId(e.target.value)}
                      className="form-input text-xs font-bold rounded px-2.5 py-1 bg-[#0c152a] text-white border-blue-500/40"
                    >
                      {authorizedLabs.map((l) => (
                        <option key={l.id} value={l.id}>
                          Room {l.room} · {l.name} ({l.department})
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Active Coverage
                    </span>
                  </div>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center bg-[#070e1e] p-1 rounded-lg border border-white/5">
                <button
                  type="button"
                  onClick={() => setGenMode("batch")}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    genMode === "batch"
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Batch Sequence Generator
                </button>
                <button
                  type="button"
                  onClick={() => setGenMode("single")}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    genMode === "single"
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Single Device
                </button>
              </div>
            </div>

            {/* Error & Success Messages */}
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form: Single Mode */}
            {genMode === "single" ? (
              <form onSubmit={handleGenerateSingle} className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  {/* Equipment Type */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                      Equipment Classification *
                    </label>
                    <select
                      value={equipmentType}
                      onChange={(e) => setEquipmentType(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-xs form-input bg-[#091122]"
                    >
                      {allEquipmentOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                      <option value="Others">Others (Custom Device)</option>
                    </select>

                    {equipmentType === "Others" && (
                      <input
                        type="text"
                        placeholder="Custom Hardware Classification"
                        value={customEquipment}
                        onChange={(e) => setCustomEquipment(e.target.value)}
                        className="w-full rounded-lg px-3 py-1.5 text-xs form-input mt-2 border-amber-500/40"
                      />
                    )}
                  </div>

                  {/* Serial Number */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                      Workstation / Serial Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PC-14, WS-08, OSC-02"
                      value={singleSerial}
                      onChange={(e) => setSingleSerial(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-xs form-input font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Visible physical identifier in room.</span>
                  </div>

                  {/* Optional Asset Tag */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                      Institutional Asset Tag (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. NW-PC-14, ENG-OSC-02"
                      value={singleAssetTag}
                      onChange={(e) => setSingleAssetTag(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-xs form-input font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">University inventory tag if cataloged.</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedPayload(!showAdvancedPayload)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                  >
                    <span>{showAdvancedPayload ? "Hide" : "Show"} Payload Architecture Settings</span>
                    <span className="text-[10px]">{showAdvancedPayload ? "▲" : "▼"}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="px-5 py-2 rounded-lg btn-institutional-primary text-xs font-semibold flex items-center gap-2"
                  >
                    {isGenerating ? "Generating..." : "Generate Asset Sticker"}
                  </button>
                </div>
              </form>
            ) : (
              /* Form: Batch Sequence Generator */
              <form onSubmit={handleGenerateBatch} className="space-y-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Equipment Type */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                      Equipment Type *
                    </label>
                    <select
                      value={equipmentType}
                      onChange={(e) => setEquipmentType(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-xs form-input bg-[#091122]"
                    >
                      {allEquipmentOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                      <option value="Others">Others (Custom Device)</option>
                    </select>

                    {equipmentType === "Others" && (
                      <input
                        type="text"
                        placeholder="Custom Hardware Classification"
                        value={customEquipment}
                        onChange={(e) => setCustomEquipment(e.target.value)}
                        className="w-full rounded-lg px-3 py-1.5 text-xs form-input mt-2 border-amber-500/40"
                      />
                    )}
                  </div>

                  {/* Prefix */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                      Serial Prefix *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PC-, WS-, BENCH-"
                      value={batchPrefix}
                      onChange={(e) => setBatchPrefix(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-xs form-input font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Prefix added before numerical sequence.</span>
                  </div>

                  {/* Sequence Range */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                      Sequence Range (Start to End) *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={batchStart}
                        onChange={(e) => setBatchStart(parseInt(e.target.value, 10) || 1)}
                        className="w-20 rounded-lg px-3 py-2 text-xs form-input font-mono text-center"
                      />
                      <span className="text-slate-400 text-xs">to</span>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={batchEnd}
                        onChange={(e) => setBatchEnd(parseInt(e.target.value, 10) || 1)}
                        className="w-20 rounded-lg px-3 py-2 text-xs form-input font-mono text-center"
                      />
                      <select
                        value={padLength}
                        onChange={(e) => setPadLength(parseInt(e.target.value, 10))}
                        className="rounded-lg px-2 py-2 text-xs form-input bg-[#091122] font-mono"
                        title="Zero padding"
                      >
                        <option value={1}>1 digit (1..40)</option>
                        <option value={2}>2 digits (01..40)</option>
                        <option value={3}>3 digits (001..040)</option>
                      </select>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Total: {Math.max(0, batchEnd - batchStart + 1)} devices in one run.
                    </span>
                  </div>

                  {/* Asset Tag Prefix */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                      Asset Tag Prefix (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. NW-PC-"
                      value={batchTagPrefix}
                      onChange={(e) => setBatchTagPrefix(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-xs form-input font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Creates matching tags: NW-PC-01..</span>
                  </div>
                </div>

                {/* Batch preview summary */}
                <div className="p-3 rounded-lg bg-[#070e1c] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-300 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>
                      Batch Spec: <strong>{batchEnd - batchStart + 1}</strong> stickers for <strong>Room {activeLab?.room}</strong> ({effectiveEquipment})
                    </span>
                    <span className="text-slate-500 font-mono">
                      [{batchPrefix}{String(batchStart).padStart(padLength, "0")} → {batchPrefix}{String(batchEnd).padStart(padLength, "0")}]
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedPayload(!showAdvancedPayload)}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                    >
                      <span>{showAdvancedPayload ? "Hide" : "Show"} Payload Architecture</span>
                      <span className="text-[10px]">{showAdvancedPayload ? "▲" : "▼"}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="px-5 py-2 rounded-lg btn-institutional-primary text-xs font-semibold flex items-center gap-2 shrink-0"
                    >
                      {isGenerating ? (
                        <span>Generating {batchEnd - batchStart + 1} Stickers...</span>
                      ) : (
                        <>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                          </svg>
                          <span>Generate Batch ({batchEnd - batchStart + 1} Stickers)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Advanced Payload Architecture Section */}
            {showAdvancedPayload && (
              <div className="p-4 rounded-xl bg-[#070e1c] border border-blue-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-300">
                    Dual-Mode QR Payload Specification
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">SECS Architectural Standard</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold uppercase text-slate-300 block mb-1">
                      Encoded Payload Mode
                    </label>
                    <div className="space-y-1.5">
                      <label className="flex items-start gap-2 p-2 rounded bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.04]">
                        <input
                          type="radio"
                          name="payloadMode"
                          checked={payloadMode === "url"}
                          onChange={() => setPayloadMode("url")}
                          className="mt-0.5 text-blue-500"
                        />
                        <div>
                          <span className="font-semibold text-white block">Direct Smartphone Deep-Link (Recommended)</span>
                          <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                            https://&lt;domain&gt;/#report?lab=...&amp;equipment=...&amp;serial=...
                          </span>
                          <span className="text-[10px] text-emerald-400 mt-0.5 block">
                            ✓ Native iPhone &amp; Android camera opens SECS app directly with pre-filled inputs.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 p-2 rounded bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.04]">
                        <input
                          type="radio"
                          name="payloadMode"
                          checked={payloadMode === "json"}
                          onChange={() => setPayloadMode("json")}
                          className="mt-0.5 text-blue-500"
                        />
                        <div>
                          <span className="font-semibold text-white block">Raw JSON Payload</span>
                          <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                            {`{"app":"SECS","labId":"${activeLab?.id || "LAB-302"}","serialNumber":"PC-14",...}`}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            Compatible with SECS in-app webcam &amp; barcode scanners.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase text-slate-300 block mb-1">
                      Custom University Domain (Optional Override)
                    </label>
                    <input
                      type="text"
                      placeholder={typeof window !== "undefined" ? window.location.origin : "https://secs.campus.edu"}
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-xs form-input font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Leave empty to use current application domain ({typeof window !== "undefined" ? window.location.host : "localhost"}).
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── GENERATED STICKERS GALLERY & PRINT SHEET ── */}
          {stickers.length > 0 && (
            <div className="space-y-4">
              {/* Controls bar above gallery */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#091122] border border-white/[0.08] no-print">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-white">
                    Generated Asset Stickers: <span className="text-blue-400 font-mono">({stickers.length})</span>
                  </span>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400 text-[11px]">Print Grid:</span>
                    <button
                      onClick={() => setPrintLayout("grid2")}
                      className={`px-2 py-1 rounded text-xs font-mono font-bold ${
                        printLayout === "grid2"
                          ? "bg-blue-600 text-white"
                          : "bg-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      2 Columns (Standard A4)
                    </button>
                    <button
                      onClick={() => setPrintLayout("grid3")}
                      className={`px-2 py-1 rounded text-xs font-mono font-bold ${
                        printLayout === "grid3"
                          ? "bg-blue-600 text-white"
                          : "bg-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      3 Columns (Compact)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search serial / tag..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="rounded-lg px-3 py-1.5 text-xs form-input w-48"
                  />
                  <button
                    onClick={handlePrintSheet}
                    className="px-3.5 py-1.5 rounded-lg btn-institutional-primary text-xs font-semibold flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    <span>Print Label Sheet</span>
                  </button>
                </div>
              </div>

              {/* ── STICKER CARDS GRID (Dual-Render: Visual on Dashboard & Exact Media Print) ── */}
              <div
                id="printable-sticker-sheet"
                className={`grid ${
                  printLayout === "grid3"
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 print-grid-3"
                    : "grid-cols-1 sm:grid-cols-2"
                } gap-4`}
              >
                {filteredStickers.map((sticker) => (
                  <div
                    key={sticker.id}
                    className="sticker-card-print rounded-xl border border-white/[0.12] bg-[#ffffff] text-[#0f172a] p-4 flex flex-col justify-between shadow-md relative group transition-all"
                    style={{ minHeight: "185px" }}
                  >
                    {/* Header: University System Branding */}
                    <div>
                      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center text-white text-[10px] font-bold">
                            U
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900 block leading-none">
                              {universityName}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tight block">
                              SMART EQUIPMENT CARE SYSTEM (SECS)
                            </span>
                          </div>
                        </div>

                        <span className="badge-black text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                          ROOM {sticker.labRoom}
                        </span>
                      </div>

                      {/* Middle Body: Equipment Info + QR Code */}
                      <div className="flex items-center justify-between gap-3">
                        {/* Technical Metadata */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div>
                            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 block">
                              Device Classification
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {sticker.equipmentType}
                            </h4>
                          </div>

                          <div>
                            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 block">
                              Workstation / Serial No
                            </span>
                            <div className="text-base font-extrabold font-mono text-blue-700 tracking-tight">
                              {sticker.serialNumber}
                            </div>
                          </div>

                          <div>
                            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 block">
                              Official Asset Tag
                            </span>
                            <div className="text-[11px] font-mono font-semibold text-slate-700">
                              {sticker.assetTag}
                            </div>
                          </div>
                        </div>

                        {/* High-Resolution QR Code */}
                        <div className="qr-box p-1.5 rounded-lg border border-slate-200 bg-white flex flex-col items-center shrink-0">
                          <img
                            src={sticker.qrDataUrl}
                            alt={`QR for ${sticker.serialNumber}`}
                            className="w-24 h-24 object-contain"
                          />
                          <span className="text-[8px] font-mono text-slate-500 mt-0.5 uppercase tracking-tighter">
                            Instant Scan
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer: User Instruction & Fast Action */}
                    <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[9px]">
                      <span className="text-slate-600 font-medium">
                        Point phone camera to report faults instantly
                      </span>
                      <span className="text-slate-400 font-mono">
                        SECS-TAG · {sticker.labRoom}
                      </span>
                    </div>

                    {/* Hover Actions Bar (Hidden on print) */}
                    <div className="no-print absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 p-1 rounded-lg backdrop-blur shadow-lg">
                      <button
                        onClick={() => downloadDataUrl(sticker.qrDataUrl, `${sticker.serialNumber}-qr.png`)}
                        className="p-1 rounded text-slate-200 hover:text-white hover:bg-white/10"
                        title="Download PNG"
                      >
                        <span className="text-[10px] font-mono font-bold px-1">PNG</span>
                      </button>
                      <button
                        onClick={() => downloadSvg(sticker.qrSvg, `${sticker.serialNumber}-qr.svg`)}
                        className="p-1 rounded text-slate-200 hover:text-white hover:bg-white/10"
                        title="Download Vector SVG"
                      >
                        <span className="text-[10px] font-mono font-bold px-1">SVG</span>
                      </button>
                      <button
                        onClick={() => setPreviewSticker(sticker)}
                        className="p-1 rounded text-slate-200 hover:text-white hover:bg-white/10"
                        title="Inspect Payload"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STICKER INSPECTION MODAL ── */}
          {previewSticker && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 no-print">
              <div className="surface-card rounded-xl max-w-lg w-full p-6 border border-white/[0.15] shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-400">STICKER PAYLOAD AUDIT</span>
                    <span className="font-mono text-sm font-bold text-white">{previewSticker.serialNumber}</span>
                  </div>
                  <button
                    onClick={() => setPreviewSticker(null)}
                    className="text-slate-400 hover:text-white text-base font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-[#091122] border border-white/5">
                  <img
                    src={previewSticker.qrDataUrl}
                    alt="QR Code"
                    className="w-32 h-32 rounded bg-white p-1 shrink-0"
                  />
                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-mono block">Target Lab</span>
                      <span className="font-bold text-white">Room {previewSticker.labRoom} · {previewSticker.labName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-mono block">Equipment Classification</span>
                      <span className="font-semibold text-slate-200">{previewSticker.equipmentType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-mono block">Serial Number &amp; Tag</span>
                      <span className="font-mono font-bold text-blue-400">{previewSticker.serialNumber}</span>{" "}
                      <span className="text-slate-400 font-mono">({previewSticker.assetTag})</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Direct Deep-Link URL (Scanned by native camera)
                  </label>
                  <div className="p-2.5 rounded-lg bg-[#070e1c] border border-white/5 font-mono text-[11px] text-blue-300 break-all select-all">
                    {previewSticker.payloadUrl}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Raw JSON Payload (Scanned by in-app reader)
                  </label>
                  <pre className="p-2.5 rounded-lg bg-[#070e1c] border border-white/5 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                    {previewSticker.payloadJson}
                  </pre>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => downloadDataUrl(previewSticker.qrDataUrl, `${previewSticker.serialNumber}-qr.png`)}
                    className="px-4 py-2 rounded-lg btn-institutional-secondary text-xs font-semibold"
                  >
                    Download PNG
                  </button>
                  <button
                    onClick={() => downloadSvg(previewSticker.qrSvg, `${previewSticker.serialNumber}-qr.svg`)}
                    className="px-4 py-2 rounded-lg btn-institutional-primary text-xs font-semibold"
                  >
                    Download Vector SVG
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

