import { useEffect, useState } from "react";
import { secsApi } from "./services/secsApi";
import type { PortalRole, StaffAccount } from "./workflowTypes";

interface Props {
  onNavigate: (page: "register" | "landing") => void;
  onLogin: (user: StaffAccount) => void;
  initialPortal?: PortalRole;
  initialView?: "login" | "setup-admin" | "forgot-password";
}

const PORTALS: { value: PortalRole; label: string; description: string; icon: string }[] = [
  { value: "admin", label: "Admin", description: "Facilities & access control", icon: "🛡️" },
  { value: "authority", label: "Higher Authority", description: "Budget approvals & oversight", icon: "🏛️" },
  { value: "accounts", label: "Accounts", description: "Disbursements & confirmation", icon: "💳" },
  { value: "technician", label: "Technician", description: "Diagnostics & repair queue", icon: "🔧" },
];

export default function LoginPage({ onNavigate, onLogin, initialPortal, initialView }: Props) {
  const [view, setView] = useState<"login" | "setup-admin" | "forgot-password">(initialView || "login");
  const [portal, setPortal] = useState<PortalRole>(initialPortal || "admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Admin first-time setup state
  const [adminConfigured, setAdminConfigured] = useState<boolean | null>(null);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminDept, setAdminDept] = useState("Facilities & IT Management");

  // Forgot Password state
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Check admin status on load
  useEffect(() => {
    secsApi.auth
      .checkAdminStatus()
      .then((res) => {
        setAdminConfigured(res.adminConfigured);
        if (!res.adminConfigured || initialView === "setup-admin") {
          setView("setup-admin");
        }
      })
      .catch(() => {
        setAdminConfigured(false);
        if (initialView === "setup-admin") {
          setView("setup-admin");
        }
      });
  }, [initialView]);

  function validateLogin() {
    const errs: Record<string, string> = {};
    if (!email.trim()) {
      errs.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Enter a valid email address.";
    }
    if (!password) errs.password = "Password is required.";
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
        email: email.trim(),
        password,
        portal,
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
      setSuccessMessage("Verification code dispatched to your email! Please check your inbox and enter the 6-digit code below.");
      setForgotStep(2);
    } catch (err: any) {
      setServerError(err?.message || "Could not dispatch reset code.");
    } finally {
      setLoading(false);
    }
  }

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
      setEmail(forgotEmail.trim());
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

  return (
    <div className="min-h-screen flex bg-[#050a18] text-slate-100 selection:bg-blue-500/30">
      {/* ── LEFT SHOWCASE PANEL (Desktop) ── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-white/5 bg-gradient-to-br from-[#070e24] via-[#09132e] to-[#040814]">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div>
            <span className="font-display font-extrabold text-xl tracking-tight text-white">SECS</span>
            <span className="text-xs text-blue-400 font-semibold tracking-wide block uppercase">Smart Equipment Care System</span>
          </div>
        </div>

        {/* Core Value Statement */}
        <div className="relative z-10 my-auto py-12 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Enterprise University Portal
          </div>
          
          <h2 className="text-3xl xl:text-4xl font-extrabold font-display text-white tracking-tight leading-[1.2] mb-6">
            Integrated Laboratory <br />
            <span className="gradient-brand">Maintenance & Governance</span>
          </h2>

          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Access role-gated operational workflows, manage technician room assignments, approve budget disbursements, and uphold total financial transparency.
          </p>

          <div className="space-y-4">
            {[
              { title: "Role-Based Integrity", desc: "Granular access for Admins, Higher Authority, Accounts, and Techs" },
              { title: "SLA-Driven Escalations", desc: "Automated 24h, 3d, 7d condition checks with Brevo email notifications" },
              { title: "Public Audit Ledger", desc: "Verifiable transaction records ensuring complete campus accountability" },
            ].map((feature) => (
              <div key={feature.title} className="flex items-start gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white tracking-tight">{feature.title}</h4>
                  <p className="text-[11px] text-slate-500 leading-normal">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 border-t border-white/5 pt-6">
          <span>University IT & Facilities Infrastructure</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Live Neon DB
          </span>
        </div>
      </div>

      {/* ── RIGHT AUTHENTICATION PANEL ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 sm:px-10 lg:px-16 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile brand header */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
              S
            </div>
            <span className="font-display font-extrabold text-lg text-white">SECS Portal</span>
          </div>

          {/* Form Card */}
          <div className="glass-card rounded-2xl p-7 sm:p-9 shadow-2xl relative">
            {/* Top view status label */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                  {view === "setup-admin" ? "Master Deployment Setup" : view === "forgot-password" ? "Security Recovery" : "Staff Access"}
                </span>
                <h1 className="text-2xl font-bold font-display text-white mt-1">
                  {view === "setup-admin"
                    ? "Initialize Admin"
                    : view === "forgot-password"
                    ? "Reset Password"
                    : "Sign In to Portal"}
                </h1>
              </div>

              {view !== "login" && (
                <button
                  type="button"
                  onClick={() => {
                    setView("login");
                    setServerError("");
                    setSuccessMessage("");
                  }}
                  className="text-xs font-semibold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all"
                >
                  ← Back to Login
                </button>
              )}
            </div>

            {/* Admin status notification badge */}
            {adminConfigured === false && view !== "setup-admin" && (
              <div className="mb-6 p-4 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/5 text-amber-300 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-bold text-amber-200">
                    <span className="text-base">👑</span>
                    <span>One-Time Master Setup: Primary Admin Not Initialized</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                    Action Required
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
                  No administrator account exists in the PostgreSQL database. Initialize your master credentials now. This option permanently disappears once completed.
                </p>
                <button
                  type="button"
                  onClick={() => setView("setup-admin")}
                  className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <span>Open One-Time Admin Setup Form →</span>
                </button>
              </div>
            )}

            {/* Server feedback alerts */}
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
                {serverError.includes("already been initialized") && (
                  <button
                    type="button"
                    onClick={() => {
                      setView("login");
                      setServerError("");
                    }}
                    className="px-2.5 py-1 rounded bg-rose-400 hover:bg-rose-300 text-slate-950 font-bold text-[11px] whitespace-nowrap transition-colors shrink-0"
                  >
                    Go to Sign In →
                  </button>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 1: FIRST-TIME ADMIN SETUP                             */}
            {/* ========================================================= */}
            {view === "setup-admin" && (
              <form onSubmit={handleSetupAdmin} className="space-y-4">
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs flex items-start gap-2.5 mb-2">
                  <span className="text-base shrink-0">👑</span>
                  <div className="leading-relaxed">
                    <strong className="block text-amber-300 font-bold">One-Time Master Administrator Setup</strong>
                    Configure the master system credentials below. Once submitted, the account will be stored in your PostgreSQL database, and this setup page will permanently lock and auto-hide.
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
                      errors.adminName ? "border-rose-500 focus:border-rose-500" : ""
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
                      errors.adminEmail ? "border-rose-500 focus:border-rose-500" : ""
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
                      errors.adminPassword ? "border-rose-500 focus:border-rose-500" : ""
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
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Provisioning Admin…
                    </span>
                  ) : (
                    "Initialize Master Admin Account →"
                  )}
                </button>
              </form>
            )}

            {/* ========================================================= */}
            {/* VIEW 2: FORGOT PASSWORD 2-STEP RECOVERY                    */}
            {/* ========================================================= */}
            {view === "forgot-password" && (
              <div>
                {forgotStep === 1 ? (
                  <form onSubmit={handleSendResetCode} className="space-y-4">
                    <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                      Enter the university email linked to your account. We will dispatch a 6-digit verification code via Brevo SMTP to verify your identity.
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
                      {loading ? "Sending Code via Brevo…" : "Send Verification Code 📧"}
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

            {/* ========================================================= */}
            {/* VIEW 3: STANDARD LOGIN                                    */}
            {/* ========================================================= */}
            {view === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Modern Portal Segmented Pills */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                    Select Staff Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PORTALS.map((p) => {
                      const isActive = portal === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => {
                            setPortal(p.value);
                            setErrors({});
                            setServerError("");
                          }}
                          className={`p-2.5 rounded-xl text-left border transition-all duration-150 flex items-center gap-2.5 ${
                            isActive
                              ? "bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/10"
                              : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-slate-200"
                          }`}
                        >
                          <span className="text-lg">{p.icon}</span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold leading-tight truncate">{p.label}</div>
                            <div className="text-[10px] text-slate-500 truncate">{p.value}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Admin Setup Helper Banner (visible when admin role is selected) */}
                {portal === "admin" && (
                  <div className="p-3.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/5 text-xs text-amber-200 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold flex items-center gap-1.5 text-amber-300">
                        <span>👑</span> First-Time Administrator Setup
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        Have not created your master admin account yet?
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setView("setup-admin");
                        setServerError("");
                        setSuccessMessage("");
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-bold text-xs shadow-md whitespace-nowrap transition-all"
                    >
                      Setup Admin →
                    </button>
                  </div>
                )}

                {/* Email Address */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                    University Email
                  </label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors((er) => ({ ...er, email: "" }));
                    }}
                    className={`w-full rounded-xl px-4 py-2.5 text-sm glass-input ${
                      errors.email ? "border-rose-500" : ""
                    }`}
                  />
                  {errors.email && <p className="text-rose-400 text-xs mt-1">{errors.email}</p>}
                </div>

                {/* Password with Forgot Password link */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setView("forgot-password");
                        setForgotEmail(email);
                        setServerError("");
                        setSuccessMessage("");
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors((er) => ({ ...er, password: "" }));
                      }}
                      className={`w-full rounded-xl pl-4 pr-11 py-2.5 text-sm glass-input ${
                        errors.password ? "border-rose-500" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPass ? "Hide" : "Show"}
                    </button>
                  </div>
                  {errors.password && <p className="text-rose-400 text-xs mt-1">{errors.password}</p>}
                </div>

                {/* Keep Signed In */}
                <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-xs text-slate-400">Remember credentials on this browser</span>
                </label>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-xl btn-primary text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Authenticating…
                    </span>
                  ) : (
                    `Sign In as ${PORTALS.find((p) => p.value === portal)?.label || "Staff"} →`
                  )}
                </button>
              </form>
            )}

            {/* Bottom Actions */}
            <div className="mt-7 pt-5 border-t border-white/5 text-center space-y-2.5">
              <p className="text-xs text-slate-400">
                Primary Administrator setting up for the first time?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setView("setup-admin");
                    setServerError("");
                    setSuccessMessage("");
                  }}
                  className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4 ml-1"
                >
                  Create Master Admin Account
                </button>
              </p>
              <p className="text-xs text-slate-400">
                Student or Faculty without staff portal access?{" "}
                <button
                  onClick={() => onNavigate("register")}
                  className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4 ml-1"
                >
                  Register Student Account
                </button>
              </p>
              <div>
                <button
                  onClick={() => onNavigate("landing")}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5 mx-auto"
                >
                  <span>←</span> Return to Public Equipment Tracker
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
