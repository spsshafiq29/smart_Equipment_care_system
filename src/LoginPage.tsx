import { useEffect, useState } from "react";
import { secsApi } from "./services/secsApi";
import type { PortalRole } from "./workflowTypes";

interface Props {
  onNavigate: (page: "register" | "landing") => void;
  onLogin: (role: PortalRole) => void;
}

const PORTALS: { value: PortalRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Labs, assignments and accounts" },
  { value: "authority", label: "Higher Authority", description: "Approvals and oversight" },
  { value: "accounts", label: "Accounts", description: "Payments and confirmation" },
  { value: "technician", label: "Technician", description: "Assigned labs and repairs" },
];

export default function LoginPage({ onNavigate, onLogin }: Props) {
  const [view, setView] = useState<"login" | "setup-admin" | "forgot-password">("login");
  const [portal, setPortal] = useState<PortalRole>("admin");
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
  const [generatedCodeHint, setGeneratedCodeHint] = useState("");

  // Check admin status on load
  useEffect(() => {
    secsApi.auth
      .checkAdminStatus()
      .then((res) => {
        setAdminConfigured(res.adminConfigured);
        if (!res.adminConfigured) {
          setView("setup-admin");
        }
      })
      .catch(() => {
        setAdminConfigured(true);
      });
  }, []);

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
      const userRole = (res?.user?.role as PortalRole) || portal;
      onLogin(userRole);
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
      await secsApi.auth.setupAdmin({
        name: adminName.trim(),
        email: adminEmail.trim(),
        password: adminPassword,
        department: adminDept.trim(),
      });
      setAdminConfigured(true);
      onLogin("admin");
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
      const res = await secsApi.auth.forgotPassword(forgotEmail.trim());
      if (res.code) {
        setForgotCode(res.code);
        setGeneratedCodeHint(res.code);
      }
      setSuccessMessage("Verification code generated! Please enter code and your new password.");
      setForgotStep(2);
    } catch (err: any) {
      setServerError(err?.message || "Could not generate reset code.");
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
      setSuccessMessage("Password successfully updated! You can now log in with your new password.");
      setView("login");
      setForgotStep(1);
    } catch (err: any) {
      setServerError(err?.message || "Failed to reset password. Please check your verification code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #050d1f 0%, #0a1628 60%, #0e1f3a 100%)" }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&h=1200&fit=crop&auto=format)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(5,13,31,0.88) 0%, rgba(10,22,40,0.6) 100%)" }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-400 flex items-center justify-center text-[#050d1f] font-black text-lg">S</div>
            <div>
              <div style={{ fontFamily: "var(--font-display)" }} className="text-white text-xl leading-none">
                SECS
              </div>
              <div className="text-amber-400/70 text-[10px] uppercase tracking-widest">Smart Equipment Care System</div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-4xl xl:text-5xl text-white mb-5 leading-tight">
            Campus Equipment
            <br />
            Management Portal
          </h2>
          <p className="text-white/60 text-sm max-w-md leading-relaxed">
            Real-time equipment issue tracking, lab technician coordination, verified budget releases, and public transparency audits across all university faculties.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-white/30 border-t border-white/10 pt-6">
          <span>University of Information Technology</span>
          <span>PERN Cloud Architecture</span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-7/12 xl:w-1/2 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <span className="text-amber-400 text-xs font-semibold uppercase tracking-widest">
                {view === "setup-admin" ? "First-Time Deployment" : view === "forgot-password" ? "Security Recovery" : "Staff Access"}
              </span>
              {view !== "login" && (
                <button
                  onClick={() => {
                    setView("login");
                    setServerError("");
                    setSuccessMessage("");
                  }}
                  className="text-xs text-white/40 hover:text-white transition-colors"
                >
                  ← Back to Login
                </button>
              )}
            </div>
            <h1 style={{ fontFamily: "var(--font-display)" }} className="text-2xl md:text-3xl font-bold text-white mt-1">
              {view === "setup-admin"
                ? "Setup Admin Account"
                : view === "forgot-password"
                ? "Reset Your Password"
                : "Sign In to Portal"}
            </h1>
            <p className="text-white/40 text-xs mt-1">
              {view === "setup-admin"
                ? "Initialize the master administrator credentials for this deployment."
                : view === "forgot-password"
                ? "Enter your university email to securely set up a new password."
                : "Select your role and enter your university credentials to continue."}
            </p>
          </div>

          {/* Setup admin prompt if not configured */}
          {adminConfigured === false && view !== "setup-admin" && (
            <div className="mb-4 p-3 rounded-lg border border-amber-400/30 bg-amber-400/10 flex items-center justify-between text-xs text-amber-300">
              <span>First-time setup: Admin account is not yet configured.</span>
              <button
                onClick={() => setView("setup-admin")}
                className="underline font-bold hover:text-white ml-2"
              >
                Setup Now
              </button>
            </div>
          )}

          {/* Success message banner */}
          {successMessage && (
            <div className="mb-4 p-3 rounded-lg border border-green-500/40 bg-green-500/10 text-green-300 text-xs">
              {successMessage}
            </div>
          )}

          {/* Server error alert */}
          {serverError && (
            <div className="mb-4 p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 text-xs">
              {serverError}
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW 1: FIRST-TIME ADMIN SETUP                             */}
          {/* ========================================================= */}
          {view === "setup-admin" && (
            <form onSubmit={handleSetupAdmin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-white/40 block mb-1">
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
                  className={`w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 bg-white/5 border focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition ${
                    errors.adminName ? "border-red-500" : "border-white/10 focus:border-amber-400/50"
                  }`}
                />
                {errors.adminName && <p className="text-red-400 text-xs mt-1">{errors.adminName}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-white/40 block mb-1">
                  Admin Email Address
                </label>
                <input
                  type="email"
                  placeholder="admin@uitc.edu"
                  value={adminEmail}
                  onChange={(e) => {
                    setAdminEmail(e.target.value);
                    setErrors((prev) => ({ ...prev, adminEmail: "" }));
                  }}
                  className={`w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 bg-white/5 border focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition ${
                    errors.adminEmail ? "border-red-500" : "border-white/10 focus:border-amber-400/50"
                  }`}
                />
                {errors.adminEmail && <p className="text-red-400 text-xs mt-1">{errors.adminEmail}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-white/40 block mb-1">
                  Admin Password
                </label>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Create a strong password (min 6 characters)"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, adminPassword: "" }));
                  }}
                  className={`w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 bg-white/5 border focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition ${
                    errors.adminPassword ? "border-red-500" : "border-white/10 focus:border-amber-400/50"
                  }`}
                />
                {errors.adminPassword && <p className="text-red-400 text-xs mt-1">{errors.adminPassword}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-white/40 block mb-1">
                  Department
                </label>
                <input
                  type="text"
                  placeholder="Facilities & IT Management"
                  value={adminDept}
                  onChange={(e) => setAdminDept(e.target.value)}
                  className="w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-semibold text-[#050d1f] bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all duration-150 disabled:opacity-70 mt-2 flex items-center justify-center gap-2"
              >
                {loading ? "Configuring Admin..." : "Initialize Admin & Enter Dashboard →"}
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* VIEW 2: FORGOT PASSWORD                                    */}
          {/* ========================================================= */}
          {view === "forgot-password" && (
            <div className="space-y-4">
              {forgotStep === 1 ? (
                <form onSubmit={handleSendResetCode} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-white/40 block mb-1">
                      Enter Your Registered Email
                    </label>
                    <input
                      type="email"
                      placeholder="your.email@uitc.edu"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        setErrors((prev) => ({ ...prev, forgotEmail: "" }));
                      }}
                      className={`w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 bg-white/5 border focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition ${
                        errors.forgotEmail ? "border-red-500" : "border-white/10 focus:border-amber-400/50"
                      }`}
                    />
                    {errors.forgotEmail && <p className="text-red-400 text-xs mt-1">{errors.forgotEmail}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-lg font-semibold text-[#050d1f] bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all duration-150 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {loading ? "Generating Code..." : "Send Reset Code →"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmResetPassword} className="space-y-4">
                  {generatedCodeHint && (
                    <div className="p-2.5 rounded bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs flex items-center justify-between">
                      <span>Verification Code: <strong>{generatedCodeHint}</strong></span>
                      <span className="text-[10px] text-white/40">(Valid for 15m)</span>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-white/40 block mb-1">
                      6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 582914"
                      value={forgotCode}
                      onChange={(e) => {
                        setForgotCode(e.target.value);
                        setErrors((prev) => ({ ...prev, forgotCode: "" }));
                      }}
                      className={`w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 bg-white/5 border focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition ${
                        errors.forgotCode ? "border-red-500" : "border-white/10 focus:border-amber-400/50"
                      }`}
                    />
                    {errors.forgotCode && <p className="text-red-400 text-xs mt-1">{errors.forgotCode}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-white/40 block mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter new password (min 6 characters)"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, newPassword: "" }));
                      }}
                      className={`w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 bg-white/5 border focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition ${
                        errors.newPassword ? "border-red-500" : "border-white/10 focus:border-amber-400/50"
                      }`}
                    />
                    {errors.newPassword && <p className="text-red-400 text-xs mt-1">{errors.newPassword}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-lg font-semibold text-[#050d1f] bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all duration-150 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {loading ? "Updating Password..." : "Update Password & Return to Login →"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW 3: STANDARD LOGIN                                     */}
          {/* ========================================================= */}
          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Portal Selector */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-white/40 block mb-2">
                  Select Portal Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PORTALS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setPortal(item.value)}
                      className={`rounded-lg border p-3 text-left transition ${
                        portal === item.value
                          ? "border-amber-400 bg-amber-400/10"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20"
                      }`}
                    >
                      <span className={`block text-sm font-semibold ${portal === item.value ? "text-amber-400" : "text-white/70"}`}>
                        {item.label}
                      </span>
                      <span className="mt-1 block text-[10px] leading-4 text-white/30">{item.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-white/40 block mb-1">
                  Registered University Email
                </label>
                <input
                  type="email"
                  placeholder="your.email@uitc.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((er) => ({ ...er, email: "" }));
                  }}
                  className={`w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 bg-white/5 border focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition ${
                    errors.email ? "border-red-500" : "border-white/10 focus:border-amber-400/50"
                  }`}
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold uppercase tracking-widest text-white/40">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotStep(1);
                      setView("forgot-password");
                      setServerError("");
                      setSuccessMessage("");
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
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
                    className={`w-full rounded-lg pl-4 pr-10 py-2.5 text-sm text-white placeholder-white/20 bg-white/5 border focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition ${
                      errors.password ? "border-red-500" : "border-white/10 focus:border-amber-400/50"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                  >
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-amber-400 focus:ring-0"
                />
                <span className="text-xs text-white/40">Keep me signed in on this device</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-semibold text-[#050d1f] bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all duration-150 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? "Signing in..." : "Sign In →"}
              </button>
            </form>
          )}

          <p className="text-center text-white/30 text-xs mt-6">
            New to SECS?{" "}
            <button onClick={() => onNavigate("register")} className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
              Create an account
            </button>
          </p>

          <p className="text-center text-white/20 text-xs mt-2">
            <button onClick={() => onNavigate("landing")} className="hover:text-white/40 transition-colors">
              ← Back to main site
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
