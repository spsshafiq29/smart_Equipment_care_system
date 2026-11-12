import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { parseQrPayload, type ParsedEquipmentData } from "../utils/qrPayload";

interface EquipmentQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: ParsedEquipmentData) => void;
}

export default function EquipmentQrScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: EquipmentQrScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "upload" | "paste">("camera");
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string>("");
  const [detectedAsset, setDetectedAsset] = useState<ParsedEquipmentData | null>(null);
  const [pastedCode, setPastedCode] = useState<string>("");
  const [hasPermissionError, setHasPermissionError] = useState<boolean>(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = "secs-html5-qr-reader";

  // Audio feedback chime using Web Audio API
  function playSuccessAudio() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6 note
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {
      // Audio not permitted or supported
    }

    // Optional haptic pulse
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40, 30, 80]);
      }
    } catch {
      // ignore
    }
  }

  // Handle successful decode from any source
  function handleSuccessfulDecode(decodedText: string) {
    const parsed = parseQrPayload(decodedText);
    if (!parsed) {
      setScanError(
        `Scanned payload not recognized as a valid SECS equipment asset: "${decodedText.slice(0, 60)}..."`
      );
      return;
    }

    playSuccessAudio();
    setDetectedAsset(parsed);
    setScanError("");

    // Stop camera before transition
    stopCamera();

    // Trigger parent callback after brief confirmation
    setTimeout(() => {
      onScanSuccess(parsed);
      onClose();
    }, 600);
  }

  // Start Camera Stream
  async function startCamera(cameraId?: string) {
    if (!isOpen || activeTab !== "camera") return;
    setScanError("");
    setHasPermissionError(false);

    try {
      // Initialize scanner instance if needed
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerElementId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }

      const availableCameras = await Html5Qrcode.getCameras().catch(() => []);
      setCameras(availableCameras);

      let targetCam = cameraId || selectedCameraId;
      if (!targetCam && availableCameras.length > 0) {
        // Prefer back / environment camera on mobile
        const backCam = availableCameras.find(
          (c) => c.label.toLowerCase().includes("back") || c.label.toLowerCase().includes("environment")
        );
        targetCam = backCam ? backCam.id : availableCameras[0].id;
        setSelectedCameraId(targetCam);
      }

      const cameraConfig = targetCam
        ? { deviceId: { exact: targetCam } }
        : { facingMode: "environment" };

      await scannerRef.current.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleSuccessfulDecode(decodedText);
        },
        () => {
          // Frame error (no QR in frame) - quiet
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.warn("Camera start error:", err);
      setIsScanning(false);
      setHasPermissionError(true);
      setScanError(
        err?.message ||
          "Unable to access camera. Please allow webcam permissions, or use image upload / code paste."
      );
    }
  }

  // Stop Camera Stream cleanly
  async function stopCamera() {
    if (scannerRef.current) {
      try {
        const state = (scannerRef.current as any).getState?.();
        if (state === 2 || state === 3 || isScanning) {
          await scannerRef.current.stop();
        }
      } catch {
        // ignore
      }
      try {
        await scannerRef.current.clear();
      } catch {
        // ignore
      }
      setIsScanning(false);
    }
  }

  // Lifecycle management
  useEffect(() => {
    if (isOpen && activeTab === "camera") {
      // Small timeout to allow modal DOM container to render
      const timer = setTimeout(() => {
        startCamera();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (!isOpen) {
      setDetectedAsset(null);
      setScanError("");
      setPastedCode("");
      stopCamera();
    }
  }, [isOpen]);

  // Handle Image File Upload Scan
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError("");

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerElementId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }
      const decodedText = await scannerRef.current.scanFile(file, true);
      handleSuccessfulDecode(decodedText);
    } catch (err: any) {
      setScanError(
        "Could not detect a clear SECS QR code in the uploaded image. Please ensure the QR is well-lit and focused."
      );
    }
  }

  // Handle Manual Code / URL Paste
  function handlePasteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pastedCode.trim()) return;
    handleSuccessfulDecode(pastedCode.trim());
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="surface-card rounded-2xl max-w-md w-full border border-blue-500/30 shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 bg-[#0a1122] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <rect x="7" y="7" width="10" height="10" rx="1" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Scan Equipment QR Sticker
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Smart Equipment Care System (SECS)
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="grid grid-cols-3 bg-[#070d1a] border-b border-white/[0.08] p-1 text-xs">
          <button
            onClick={() => {
              setActiveTab("camera");
            }}
            className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "camera"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>Webcam</span>
          </button>

          <button
            onClick={() => {
              stopCamera();
              setActiveTab("upload");
            }}
            className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "upload"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Upload Photo</span>
          </button>

          <button
            onClick={() => {
              stopCamera();
              setActiveTab("paste");
            }}
            className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "paste"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
            <span>Manual Link</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Success Banner if Asset Detected */}
          {detectedAsset && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 space-y-1.5 animate-pulse">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Physical Asset Verified</span>
              </div>
              <div className="text-sm font-bold text-white">
                {detectedAsset.equipmentType} · <span className="font-mono text-emerald-300">{detectedAsset.serialNumber}</span>
              </div>
              <div className="text-xs text-slate-300">
                Facility: <strong>Room {detectedAsset.labId || "Assigned Lab"}</strong>
                {detectedAsset.assetTag && ` · Tag: ${detectedAsset.assetTag}`}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono pt-1">
                Auto-populating requisition form fields...
              </div>
            </div>
          )}

          {/* Error Message */}
          {scanError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {/* TAB 1: LIVE WEBCAM / SMARTPHONE CAMERA */}
          {activeTab === "camera" && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black border border-white/10 aspect-square flex items-center justify-center">
                {/* HTML5 QR Container */}
                <div id={readerElementId} className="w-full h-full" />

                {/* Reticle / HUD Target Overlay (Shown while scanning) */}
                {isScanning && !detectedAsset && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="w-56 h-56 relative border-2 border-blue-500/30 rounded-xl">
                      {/* 4 Corner Markers */}
                      <span className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-blue-400 rounded-tl" />
                      <span className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-blue-400 rounded-tr" />
                      <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-blue-400 rounded-bl" />
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-blue-400 rounded-br" />

                      {/* Animated Laser Scanning Line */}
                      <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_8px_#3b82f6] animate-bounce" />
                    </div>
                  </div>
                )}

                {/* Fallback info when camera stopped or error */}
                {hasPermissionError && (
                  <div className="p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 text-xl">
                      ✕
                    </div>
                    <p className="text-xs text-slate-300">
                      Camera access denied or unavailable. You can upload an image of the QR sticker or paste the deep-link URL directly.
                    </p>
                    <button
                      onClick={() => setActiveTab("upload")}
                      className="px-4 py-2 rounded-lg btn-institutional-secondary text-xs font-semibold"
                    >
                      Switch to Photo Upload
                    </button>
                  </div>
                )}
              </div>

              {/* Camera selection dropdown if multiple cameras detected */}
              {cameras.length > 1 && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400">Active Camera:</span>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      stopCamera().then(() => startCamera(e.target.value));
                    }}
                    className="form-input text-xs rounded px-2.5 py-1 bg-[#091122] border-white/10"
                  >
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label || `Camera ${c.id.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPLOAD QR PHOTO */}
          {activeTab === "upload" && (
            <div className="space-y-3">
              <label className="border-2 border-dashed border-white/15 hover:border-blue-500/40 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group bg-[#091122]">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform mb-3">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-white block mb-1">
                  Choose Photo of Physical Sticker
                </span>
                <span className="text-[11px] text-slate-400">
                  PNG, JPG, or WEBP photo taken with your device
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* TAB 3: MANUAL DEEP-LINK / JSON PASTE */}
          {activeTab === "paste" && (
            <form onSubmit={handlePasteSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                  Paste QR Code URL or JSON Payload
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Paste direct URL (e.g. #report?lab=LAB-302&equipment=Workstation+PC&serial=PC-14) or raw JSON payload..."
                  value={pastedCode}
                  onChange={(e) => setPastedCode(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-xs form-input font-mono resize-none"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Supports URL query parameters, hash fragments, and raw SECS JSON format.
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg btn-institutional-primary text-xs font-semibold"
              >
                Decode &amp; Populate Form
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#080e1c] border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400">
          <span>Align QR sticker inside reticle</span>
          <span className="font-mono text-blue-400">Auto-Detect v4</span>
        </div>
      </div>
    </div>
  );
}

