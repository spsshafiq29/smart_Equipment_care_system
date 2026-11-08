import { useEffect, useState } from "react";
import { secsApi } from "./services/secsApi";
import type { AllRoles, PortalRole, StaffAccount } from "./workflowTypes";

interface Props {
  onNavigate: (page: "register" | "landing") => void;
  onLogin: (user: StaffAccount) => void;
  initialPortal?: PortalRole;
  initialView?: "login" | "register" | "setup-admin" | "forgot-password";
}

const ACADEMIC_ROLES = [
  { value: "student", label: "Student", icon: "🎓", idLabel: "Student ID / Roll No.", placeholder: "e.g. 2024-1-60-012" },
  { value: "teacher", label: "Faculty / Lecturer", icon: "👨‍🏫", idLabel: "Faculty / Staff ID", placeholder: "e.g. FAC-CSE-104" },
  { value: "researcher", label: "Researcher", icon: "🔬", idLabel: "Researcher ID", placeholder: "e.g. RES-LAB-088" },
] as const;

export default function LoginPage({ onNavigate, onLogin, initialView }: Props) {
  const [view, setView] = useState<"login" | "register" | "setup-admin" | "forgot-password">(
    initialView || "login"
  );
  const [universityName, setUniversityName] = useState<string>("");
  const [departments, setDepartments] = useState<string[]>([]);

  // ── Unified Login Form State ──
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);

  // ── Registration Form State ──
  const [regRole, setRegRole] = useState<"student" | "teacher" | "researcher">("student");
  const [regFullName, setRegFullName] = useState("");
  const [regStudentId, setRegStudentId] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regDepartment, setRegDepartment] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regShowPass, setRegShowPass] = useState(false);
  const [regAgreed, setRegAgreed] = useState(false);

  // ── Feedback & Loading State ──
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Admin Setup State ──
  const [adminConfigured, setAdminConfigured] = useState<boolean | null>(null);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminDept, setAdminDept] = useState("Facilities & IT Management");

  // ── Forgot Password State ──
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Load initial settings, departments and admin check
  useEffect(() => {
    secsApi.auth
      .checkAdminStatus()
      .then((res) => {
        setAdminConfigured(res.adminConfigured);
        if (res.adminConfigured) {
          if (view === "setup-admin" || initialView === "setup-admin") {
            setView("login");
          }
        } else if (initialView === "setup-admin") {
          setView("setup-admin");
        }
      })
      .catch(() => {
        setAdminConfigured(false);
        if (initialView === "setup-admin") setView("setup-admin");
      });

    secsApi.settings
      .getUniversityName()
      .then((name) => {
        if (typeof name === "string") setUniversityName(name);
      })
      .catch(() => {});

    secsApi.departments
      .getDepartments()
      .then((deps) => {
        if (Array.isArray(deps) && deps.length) {
          setDepartments(deps);
          if (!regDepartment) setRegDepartment(deps[0]);
        }
      })
      .catch(() => {});
  }, [initialView]);

  // Sync initial view if prop changes
  useEffect(() => {
    if (initialView) {
      setView(initialView);
    }
  }, [initialView]);

  // ── Login Validation & Handler ──
  function validateLogin() {
    const errs: Record<string, string> = {};
    if (!identifier.trim()) {
      errs.identifier = "University email or username is required.";
    }
    if (!password) {
      errs.password = "Password is required.";
    }
    return errs;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    setSuccessMessage("");
    const errs = validateLogin();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await secsApi.auth.login({
        email: identifier.trim(),
        password,
      });
      if (res?.user) {
        onLogin(res.user);
      } else {
        throw new Error("Invalid session credentials.");
      }
    } catch (err: any) {
      setServerError(err?.message || "Authentication failed. Please verify credentials or register.");
    } finally {
      setLoading(false);
    }
  }

  // ── Registration Validation & Handler ──
  function validateRegister() {
    const errs: Record<string, string> = {};
    if (!regFullName.trim()) errs.regFullName = "Full name is required.";
    if (!regStudentId.trim()) {
      const roleObj = ACADEMIC_ROLES.find((r) => r.value === regRole);
      errs.regStudentId = `${roleObj?.idLabel || "University ID"} is required.`;
    }
    if (!regEmail.trim()) {
      errs.regEmail = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      errs.regEmail = "Please enter a valid email address.";
    }
    if (!regDepartment.trim()) {
      errs.regDepartment = "Academic department is required.";
    }
    if (!regPassword) {
      errs.regPassword = "Password is required.";
    } else if (regPassword.length < 6) {
      errs.regPassword = "Password must be at least 6 characters.";
    }
    if (!regConfirmPassword) {
      errs.regConfirmPassword = "Confirm password is required.";
    } else if (regPassword !== regConfirmPassword) {
      errs.regConfirmPassword = "Passwords do not match.";
    }
    if (!regAgreed) {
      errs.regAgreed = "You must agree to the laboratory equipment policy.";
    }
    return errs;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    setSuccessMessage("");
    const errs = validateRegister();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await secsApi.auth.register({
        fullName: regFullName.trim(),
        studentId: regStudentId.trim(),
        email: regEmail.trim(),
        department: regDepartment.trim(),
        role: regRole,
        password: regPassword,
      });

      // Switch to login tab and prefill
      setSuccessMessage(
        `🎉 Account created successfully for ${regEmail.trim()}! Please sign in with your credentials.`
      );
      setIdentifier(regEmail.trim());
      setPassword("");
      setView("login");

      // Reset reg form
      setRegFullName("");
      setRegStudentId("");
      setRegEmail("");
      setRegPassword("");
      setRegConfirmPassword("");
      setRegAgreed(false);
    } catch (err: any) {
      setServerError(err?.message || "Registration failed. Please check your information.");
    } finally {
      setLoading(false);
    }
  }

  // ── One-Time Admin Setup Handler ──
  async function handleSetupAdmin(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    setSuccessMessage("");
    const errs: Record<string, string> = {};
    if (!adminName.trim()) errs.adminName = "Admin username/full name is required.";
    if (!adminEmail.trim()) errs.adminEmail = "University email is required.";
    if (!adminPassword || adminPassword.length < 6) errs.adminPassword = "Password must be at least 6 characters.";

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await secsApi.auth.setupAdmin({
        name: adminName.trim(),
        email: adminEmail.trim(),
        password: adminPassword,
        department: adminDept.trim(),
      });
      setAdminConfigured(true);
      if (res?.user) {
        onLogin(res.user);
      }
    } catch (err: any) {
      setServerError(err?.message || "Failed to initialize Admin account.");
    } finally {
      setLoading(false);
    }
  }

  // ── Forgot Password Step 1: Send Code ──
  async function handleSendResetCode(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    setSuccessMessage("");
    if (!forgotEmail.trim()) {
      setErrors({ forgotEmail: "Please enter your registered email address." });
      return;
    }

    setLoading(true);
    try {
      await secsApi.auth.forgotPassword(forgotEmail.trim());
      setForgotCode("");
      setSuccessMessage(
        "Verification code dispatched to your email! Please check your inbox and enter the 6-digit code below."
      );
      setForgotStep(2);
    } catch (err: any) {
      setServerError(err?.message || "Could not dispatch reset code.");
    } finally {
      setLoading(false);
    }
  }

  // ── Forgot Password Step 2: Confirm Reset ──
  async function handleConfirmResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    setSuccessMessage("");
    const errs: Record<string, string> = {};
    if (!forgotCode.trim()) errs.forgotCode = "Verification code is required.";
    if (!newPassword || newPassword.length < 6) errs.newPassword = "New password must be at least 6 characters.";

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await secsApi.auth.resetPassword({
        email: forgotEmail.trim(),
        code: forgotCode.trim(),
        newPassword,
      });
      setIdentifier(forgotEmail.trim());
      setPassword("");
      setSuccessMessage("Password successfully updated! You can now log in with your new credentials.");
      setView("login");
      setForgotStep(1);
    } catch (err: any) {
      setServerError(err?.message || "Failed to reset password. Please check your verification code.");
    } finally {
      setLoading(false);
    }
  }

  // Password strength calculator
  const passStrength =
    regPassword.length === 0
      ? 0
      : regPassword.length < 6
      ? 1
      : regPassword.length < 10 || !/[A-Z]/.test(regPassword) || !/[0-9]/.test(regPassword)
      ? 2
      : 3;

  const strengthLabels = ["", "Weak", "Medium", "Secure"];
  const strengthColors = ["", "bg-rose-500", "bg-amber-400", "bg-emerald-500"];

  const currentRoleInfo = ACADEMIC_ROLES.find((r) => r.value === regRole) || ACADEMIC_ROLES[0];

  return (
    <div className="min-h-screen flex bg-[#050a18] text-slate-100 selection:bg-blue-500/30">
      {/* ── LEFT SHOWCASE PANEL (Desktop) ── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-white/5 bg-gradient-to-br from-[#070e24] via-[#09132e] to-[#040814]">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div>
            <span className="font-display font-extrabold text-xl tracking-tight text-white">
              {universityName ? `${universityName} · SECS` : "SECS"}
            </span>
            <span className="text-xs text-blue-400 font-semibold tracking-wide block uppercase">
              Smart Equipment Care System
            </span>
          </div>
        </div>

        {/* Core Value Statement */}
        <div className="relative z-10 my-auto py-12 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Unified University Authentication
          </div>

          <h2 className="text-3xl xl:text-4xl font-extrabold font-display text-white tracking-tight leading-[1.2] mb-6">
            Universal Access for <br />
            <span className="gradient-brand">Campus Labs & Operations</span>
          </h2>

          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            A single, intelligent gateway serving students, faculty lecturers, research fellows, lab technicians, accounts officers, and administrative leadership.
          </p>

          <div className="space-y-4">
            {[
              {
                icon: "🔑",
                title: "Unified Single Login",
                desc: "One login form for everyone. Your role and authorized workspace are identified automatically.",
              },
              {
                icon: "🎓",
                title: "Open Academic Registration",
                desc: "Students, teachers, and researchers can create verified accounts to submit and track equipment tickets.",
              },
              {
                icon: "⚡",
                title: "Live Neon Database & Brevo Alerts",
                desc: "Continuous ticket synchronization with automatic email updates on dispatch and resolution.",
              },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
                <span className="text-xl shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <h4 className="text-xs font-semibold text-white tracking-tight">{f.title}</h4>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 border-t border-white/5 pt-6">
          <span>{universityName || "University"} Infrastructure Portal</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> PostgreSQL Active
          </span>
        </div>
      </div>

      {/* ── RIGHT AUTHENTICATION PANEL ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 sm:px-10 lg:px-16 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile brand header */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-base shadow-lg shadow-blue-500/20">
              S
            </div>
            <div>
              <span className="font-display font-extrabold text-lg text-white block leading-tight">
                {universityName ? `${universityName} SECS` : "SECS Portal"}
              </span>
              <span className="text-[10px] text-blue-400 uppercase font-semibold">Equipment Care System</span>
            </div>
          </div>

          {/* Form Card */}
          <div className="glass-card rounded-2xl p-7 sm:p-9 shadow-2xl relative border border-white/10 bg-[#070e24]/90 backdrop-blur-xl">
            {/* ── TOP AUTH MODE TABS (When not in setup-admin or forgot-password) ── */}
            {view !== "setup-admin" && view !== "forgot-password" ? (
              <div className="mb-6">
                <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.04] border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setView("login");
                      setServerError("");
                      setSuccessMessage("");
                      setErrors({});
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      view === "login"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>🔑</span>
                    <span>Sign In</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setView("register");
                      setServerError("");
                      setSuccessMessage("");
                      setErrors({});
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      view === "register"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>📝</span>
                    <span>Create Account</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                    {view === "setup-admin" ? "Master Administrator" : "Security Recovery"}
                  </span>
                  <h1 className="text-xl font-bold font-display text-white mt-0.5">
                    {view === "setup-admin" ? "Initialize Admin Account" : "Reset Password"}
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setView("login");
                    setServerError("");
                    setSuccessMessage("");
                    setErrors({});
                  }}
                  className="text-xs font-semibold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all flex items-center gap-1.5"
                >
                  <span>←</span> Back to Sign In
                </button>
              </div>
            )}

            {/* ── NOTIFICATIONS & ALERTS ── */}
            {successMessage && (
              <div className="mb-5 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2.5">
                <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{successMessage}</span>
              </div>
            )}

            {serverError && (
              <div className="mb-5 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth={2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                  </svg>
                  <span>{serverError}</span>
                </div>
                {serverError.includes("already exists") && view === "register" && (
                  <button
                    type="button"
                    onClick={() => {
                      setView("login");
                      setIdentifier(regEmail);
                      setServerError("");
                    }}
                    className="px-2.5 py-1 rounded bg-rose-400 hover:bg-rose-300 text-slate-950 font-bold text-[11px] whitespace-nowrap transition-colors shrink-0"
                  >
                    Go to Sign In →
                  </button>
                )}
              </div>
            )}

            {/* ── VIEW 1: UNIFIED SINGLE LOGIN FORM ── */}
            {view === "login" && (
              <div>
                <div className="mb-5">
                  <h1 className="text-2xl font-bold font-display text-white">Sign In to Portal</h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Enter your university email or username. Your role will be verified automatically.
                  </p>
                </div>

                {/* Admin first-time setup helper */}
                {adminConfigured === false && (
                  <div className="mb-5 p-3.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/5 text-amber-300 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold flex items-center gap-1.5 text-amber-200">
                        <span>👑</span> Master Admin Not Configured
                      </span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                        Setup
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mb-2.5">
                      First time deployment? Initialize your primary administrator account now.
                    </p>
                    <button
                      type="button"
                      onClick={() => setView("setup-admin")}
                      className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md transition-all text-center"
                    >
                      Initialize Master Admin →
                    </button>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* University Email or Username */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                      University Email or Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                        📧
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. user@university.edu or username"
                        value={identifier}
                        onChange={(e) => {
                          setIdentifier(e.target.value);
                          setErrors((prev) => ({ ...prev, identifier: "" }));
                        }}
                        className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-sm glass-input ${
                          errors.identifier ? "border-rose-500 focus:border-rose-500" : ""
                        }`}
                      />
                    </div>
                    {errors.identifier && <p className="text-rose-400 text-xs mt-1">{errors.identifier}</p>}
                  </div>

                  {/* Password with Show/Hide toggle & Forgot link */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setView("forgot-password");
                          setForgotEmail(identifier);
                          setServerError("");
                          setSuccessMessage("");
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                        🔒
                      </span>
                      <input
                        type={showPass ? "text" : "password"}
                        placeholder="Enter your account password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setErrors((prev) => ({ ...prev, password: "" }));
                        }}
                        className={`w-full rounded-xl pl-10 pr-12 py-2.5 text-sm glass-input ${
                          errors.password ? "border-rose-500 focus:border-rose-500" : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                      >
                        {showPass ? "Hide" : "Show"}
                      </button>
                    </div>
                    {errors.password && <p className="text-rose-400 text-xs mt-1">{errors.password}</p>}
                  </div>

                  {/* Remember credentials checkbox */}
                  <div className="pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="text-xs text-slate-400">Remember credentials on this browser</span>
                    </label>
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-xl btn-primary text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Authenticating Account…
                      </span>
                    ) : (
                      "Sign In to SECS Portal →"
                    )}
                  </button>
                </form>

                {/* Footer Switcher */}
                <div className="mt-7 pt-5 border-t border-white/5 text-center space-y-3">
                  <p className="text-xs text-slate-400">
                    New student, faculty, or researcher?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setView("register");
                        setServerError("");
                        setSuccessMessage("");
                      }}
                      className="text-blue-400 hover:text-blue-300 font-bold underline underline-offset-4 ml-1"
                    >
                      Create an Account
                    </button>
                  </p>

                  <div>
                    <button
                      type="button"
                      onClick={() => onNavigate("landing")}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5 mx-auto"
                    >
                      <span>←</span> Return to Public Equipment Tracker
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── VIEW 2: ACADEMIC & STAFF REGISTRATION FORM ── */}
            {view === "register" && (
              <div>
                <div className="mb-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                      Campus Membership
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Open Registration
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold font-display text-white mt-1">Create Account</h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select your designation below to register for equipment reporting & lab privileges.
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Academic Role Selector Pills */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                      Select Designation
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {ACADEMIC_ROLES.map((r) => {
                        const isSelected = regRole === r.value;
                        return (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => {
                              setRegRole(r.value);
                              setErrors((prev) => ({ ...prev, regStudentId: "" }));
                            }}
                            className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center gap-1 ${
                              isSelected
                                ? "bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/15"
                                : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-slate-200"
                            }`}
                          >
                            <span className="text-lg">{r.icon}</span>
                            <span className="text-[11px] truncate w-full">{r.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Sarah Jenkins or John Doe"
                      value={regFullName}
                      onChange={(e) => {
                        setRegFullName(e.target.value);
                        setErrors((prev) => ({ ...prev, regFullName: "" }));
                      }}
                      className={`w-full rounded-xl px-4 py-2.5 text-sm glass-input ${
                        errors.regFullName ? "border-rose-500" : ""
                      }`}
                    />
                    {errors.regFullName && <p className="text-rose-400 text-xs mt-1">{errors.regFullName}</p>}
                  </div>

                  {/* Dynamic University ID */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                      {currentRoleInfo.idLabel}
                    </label>
                    <input
                      type="text"
                      placeholder={currentRoleInfo.placeholder}
                      value={regStudentId}
                      onChange={(e) => {
                        setRegStudentId(e.target.value);
                        setErrors((prev) => ({ ...prev, regStudentId: "" }));
                      }}
                      className={`w-full rounded-xl px-4 py-2.5 text-sm glass-input ${
                        errors.regStudentId ? "border-rose-500" : ""
                      }`}
                    />
                    {errors.regStudentId && <p className="text-rose-400 text-xs mt-1">{errors.regStudentId}</p>}
                  </div>

                  {/* Official University Email */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. user@university.edu"
                      value={regEmail}
                      onChange={(e) => {
                        setRegEmail(e.target.value);
                        setErrors((prev) => ({ ...prev, regEmail: "" }));
                      }}
                      className={`w-full rounded-xl px-4 py-2.5 text-sm glass-input ${
                        errors.regEmail ? "border-rose-500" : ""
                      }`}
                    />
                    {errors.regEmail && <p className="text-rose-400 text-xs mt-1">{errors.regEmail}</p>}
                  </div>

                  {/* Academic Department */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Academic Department
                    </label>
                    {departments.length > 0 ? (
                      <select
                        value={regDepartment}
                        onChange={(e) => {
                          setRegDepartment(e.target.value);
                          setErrors((prev) => ({ ...prev, regDepartment: "" }));
                        }}
                        className={`w-full rounded-xl px-4 py-2.5 text-sm glass-input bg-[#09132e] ${
                          errors.regDepartment ? "border-rose-500" : ""
                        }`}
                      >
                        <option value="">Select your department</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. Computer Science & Engineering"
                        value={regDepartment}
                        onChange={(e) => {
                          setRegDepartment(e.target.value);
                          setErrors((prev) => ({ ...prev, regDepartment: "" }));
                        }}
                        className={`w-full rounded-xl px-4 py-2.5 text-sm glass-input ${
                          errors.regDepartment ? "border-rose-500" : ""
                        }`}
                      />
                    )}
                    {errors.regDepartment && <p className="text-rose-400 text-xs mt-1">{errors.regDepartment}</p>}
                  </div>

                  {/* Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setRegShowPass(!regShowPass)}
                          className="text-[11px] text-slate-400 hover:text-white"
                        >
                          {regShowPass ? "Hide" : "Show"}
                        </button>
                      </div>
                      <input
                        type={regShowPass ? "text" : "password"}
                        placeholder="Min. 6 chars"
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          setErrors((prev) => ({ ...prev, regPassword: "" }));
                        }}
                        className={`w-full rounded-xl px-4 py-2.5 text-sm glass-input ${
                          errors.regPassword ? "border-rose-500" : ""
                        }`}
                      />
                      {errors.regPassword && <p className="text-rose-400 text-xs mt-1">{errors.regPassword}</p>}
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Confirm
                      </label>
                      <input
                        type={regShowPass ? "text" : "password"}
                        placeholder="Re-enter password"
                        value={regConfirmPassword}
                        onChange={(e) => {
                          setRegConfirmPassword(e.target.value);
                          setErrors((prev) => ({ ...prev, regConfirmPassword: "" }));
                        }}
                        className={`w-full rounded-xl px-4 py-2.5 text-sm glass-input ${
                          errors.regConfirmPassword ? "border-rose-500" : ""
                        }`}
                      />
                      {errors.regConfirmPassword && (
                        <p className="text-rose-400 text-xs mt-1">{errors.regConfirmPassword}</p>
                      )}
                    </div>
                  </div>

                  {/* Password strength meter */}
                  {regPassword.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Password Strength:</span>
                        <span className={`font-semibold ${strengthColors[passStrength].replace("bg-", "text-")}`}>
                          {strengthLabels[passStrength]}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`h-full flex-1 rounded-full transition-all duration-300 ${
                              passStrength >= level ? strengthColors[passStrength] : "bg-transparent"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Laboratory Terms Agreement */}
                  <div className="pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={regAgreed}
                        onChange={(e) => {
                          setRegAgreed(e.target.checked);
                          setErrors((prev) => ({ ...prev, regAgreed: "" }));
                        }}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0 focus:ring-offset-0 mt-0.5"
                      />
                      <span className="text-xs text-slate-400 leading-snug">
                        I agree to university laboratory equipment conduct and verified reporting terms.
                      </span>
                    </label>
                    {errors.regAgreed && <p className="text-rose-400 text-xs mt-1">{errors.regAgreed}</p>}
                  </div>

                  {/* Staff notice */}
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 flex items-start gap-2">
                    <span className="text-sm shrink-0">ℹ️</span>
                    <span>
                      Staff accounts (Technicians, Accounts Office, Higher Authority) are provisioned directly by the System Administrator.
                    </span>
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-xl btn-primary text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Provisioning Account…
                      </span>
                    ) : (
                      `Register as ${currentRoleInfo.label} →`
                    )}
                  </button>
                </form>

                {/* Footer Switcher */}
                <div className="mt-7 pt-5 border-t border-white/5 text-center space-y-3">
                  <p className="text-xs text-slate-400">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setView("login");
                        setServerError("");
                        setSuccessMessage("");
                      }}
                      className="text-blue-400 hover:text-blue-300 font-bold underline underline-offset-4 ml-1"
                    >
                      Sign In Now
                    </button>
                  </p>

                  <div>
                    <button
                      type="button"
                      onClick={() => onNavigate("landing")}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5 mx-auto"
                    >
                      <span>←</span> Return to Public Equipment Tracker
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── VIEW 3: ONE-TIME MASTER ADMIN SETUP ── */}
            {view === "setup-admin" && (
              adminConfigured === true ? (
                <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-4">
                  <div className="text-3xl">🛡️</div>
                  <h3 className="text-base font-bold text-white">System Admin Already Initialized</h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                    The master system administrator account is already active in your PostgreSQL database.
                  </p>
                  <button
                    type="button"
                    onClick={() => setView("login")}
                    className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg"
                  >
                    Go to Sign In →
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSetupAdmin} className="space-y-4">
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs flex items-start gap-2.5 mb-2">
                    <span className="text-base shrink-0">👑</span>
                    <div className="leading-relaxed">
                      <strong className="block text-amber-300 font-bold">One-Time Master Setup</strong>
                      Initialize master system credentials. Once saved in PostgreSQL, this setup panel locks permanently.
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Admin Full Name / Username
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. System Administrator"
                      value={adminName}
                      onChange={(e) => {
                        setAdminName(e.target.value);
                        setErrors((prev) => ({ ...prev, adminName: "" }));
                      }}
                      className={`w-full rounded-xl px-4 py-2.5 text-sm glass-input ${
                        errors.adminName ? "border-rose-500" : ""
                      }`}
                    />
                    {errors.adminName && <p className="text-rose-400 text-xs mt-1">{errors.adminName}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                      University Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="admin@example.com"
                      value={adminEmail}
                      onChange={(e) => {
                        setAdminEmail(e.target.value);
                        setErrors((prev) => ({ ...prev, adminEmail: "" }));
                      }}
                      className={`w-full rounded-xl px-4 py-2.5 text-sm glass-input ${
                        errors.adminEmail ? "border-rose-500" : ""
                      }`}
                    />
                    {errors.adminEmail && <p className="text-rose-400 text-xs mt-1">{errors.adminEmail}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Master Password
                    </label>
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={adminPassword}
                      onChange={(e) => {
                        setAdminPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, adminPassword: "" }));
                      }}
                      className={`w-full rounded-xl px-4 py-2.5 text-sm glass-input ${
                        errors.adminPassword ? "border-rose-500" : ""
                      }`}
                    />
                    {errors.adminPassword && <p className="text-rose-400 text-xs mt-1">{errors.adminPassword}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Department
                    </label>
                    <input
                      type="text"
                      value={adminDept}
                      onChange={(e) => setAdminDept(e.target.value)}
                      className="w-full rounded-xl px-4 py-2.5 text-sm glass-input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-xl btn-primary flex items-center justify-center gap-2 text-sm font-semibold"
                  >
                    {loading ? "Provisioning Master Admin…" : "Initialize Master Admin Account →"}
                  </button>
                </form>
              )
            )}

            {/* ── VIEW 4: FORGOT PASSWORD 2-STEP RECOVERY ── */}
            {view === "forgot-password" && (
              <div>
                {forgotStep === 1 ? (
                  <form onSubmit={handleSendResetCode} className="space-y-4">
                    <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                      Enter your university email address. We will dispatch a 6-digit verification code to verify your identity.
                    </p>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                        University Email
                      </label>
                      <input
                        type="email"
                        placeholder="your.name@example.com"
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          setErrors((prev) => ({ ...prev, forgotEmail: "" }));
                        }}
                        className={`w-full rounded-xl px-4 py-2.5 text-sm glass-input ${
                          errors.forgotEmail ? "border-rose-500" : ""
                        }`}
                      />
                      {errors.forgotEmail && <p className="text-rose-400 text-xs mt-1">{errors.forgotEmail}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl btn-primary flex items-center justify-center gap-2 text-sm font-semibold"
                    >
                      {loading ? "Sending Verification Code…" : "Send Verification Code 📧"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmResetPassword} className="space-y-4">
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                      Code dispatched to: <strong>{forgotEmail}</strong>
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                        6-Digit Verification Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={forgotCode}
                        onChange={(e) => {
                          setForgotCode(e.target.value);
                          setErrors((prev) => ({ ...prev, forgotCode: "" }));
                        }}
                        className={`w-full rounded-xl px-4 py-2.5 text-center font-mono text-lg tracking-widest glass-input ${
                          errors.forgotCode ? "border-rose-500" : ""
                        }`}
                      />
                      {errors.forgotCode && <p className="text-rose-400 text-xs mt-1">{errors.forgotCode}</p>}
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                        New Password
                      </label>
                      <input
                        type="password"
                        placeholder="Minimum 6 characters"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setErrors((prev) => ({ ...prev, newPassword: "" }));
                        }}
                        className={`w-full rounded-xl px-4 py-2.5 text-sm glass-input ${
                          errors.newPassword ? "border-rose-500" : ""
                        }`}
                      />
                      {errors.newPassword && <p className="text-rose-400 text-xs mt-1">{errors.newPassword}</p>}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setForgotStep(1)}
                        className="w-1/3 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-xs font-semibold text-slate-300"
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-2/3 py-2.5 rounded-xl btn-primary text-sm font-semibold"
                      >
                        {loading ? "Updating…" : "Confirm New Password"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
