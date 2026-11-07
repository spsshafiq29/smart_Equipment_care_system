import { useEffect, useState } from "react";
import { secsApi } from "./services/secsApi";

interface Props {
  onNavigate: (page: "login" | "landing") => void;
}

const ROLES = [
  { value: "student", label: "Student", icon: "🎓" },
  { value: "teacher", label: "Faculty / Lecturer", icon: "👨‍🏫" },
  { value: "researcher", label: "Researcher", icon: "🔬" },
];

export default function RegisterPage({ onNavigate }: Props) {
  const [departments, setDepartments] = useState<string[]>([]);

  const [form, setForm] = useState({
    fullName: "",
    studentId: "",
    email: "",
    department: "",
    role: "student",
    password: "",
    confirmPassword: "",
    agreed: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    secsApi.meta
      .getDepartments()
      .then((deps) => {
        if (deps?.length) setDepartments(deps);
      })
      .catch(() => {});
  }, []);

  function set(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
    setServerError("");
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = "Full name is required.";
    if (!form.studentId.trim()) errs.studentId = "University ID is required.";
    if (!form.email.trim()) {
      errs.email = "University email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ||
               (!form.email.toLowerCase().includes(".edu") && !form.email.toLowerCase().includes(".ac."))) {
      errs.email = "Please enter a valid university email address (e.g. user@uits.edu.bd or user@uitc.edu).";
    }
    if (!form.department) errs.department = "Please select your academic department.";
    if (!form.password) {
      errs.password = "Password is required.";
    } else if (form.password.length < 6) {
      errs.password = "Password must be at least 6 characters.";
    }
    if (!form.confirmPassword) {
      errs.confirmPassword = "Please confirm your password.";
    } else if (form.password !== form.confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }
    if (!form.agreed) errs.agreed = "You must accept the terms of laboratory use.";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await secsApi.auth.register({
        fullName: form.fullName,
        studentId: form.studentId,
        email: form.email,
        department: form.department,
        role: form.role,
        password: form.password,
      });
      setSubmitted(true);
    } catch (err: any) {
      setServerError(err?.message || "Registration failed. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  }

  const strength =
    form.password.length === 0
      ? 0
      : form.password.length < 6
      ? 1
      : form.password.length < 10 || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password)
      ? 2
      : 3;

  const strengthLabel = ["", "Weak", "Medium", "Secure"];
  const strengthColor = ["", "bg-rose-500", "bg-amber-400", "bg-emerald-500"];

  return (
    <div className="min-h-screen flex bg-[#050a18] text-slate-100 selection:bg-blue-500/30">
      {/* ── LEFT BRAND PANEL ── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-white/5 bg-gradient-to-br from-[#070e24] via-[#09132e] to-[#040814]">
        {/* Glows */}
        <div className="absolute top-1/3 -left-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <div>
            <span className="font-display font-extrabold text-xl tracking-tight text-white">SECS</span>
            <span className="text-xs text-blue-400 font-semibold tracking-wide block uppercase">University Care Network</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md my-auto py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Student & Faculty Membership
          </div>

          <h2 className="text-3xl xl:text-4xl font-extrabold font-display text-white tracking-tight leading-[1.2] mb-6">
            Keep Campus Labs <br />
            <span className="gradient-brand">Operational & Verified</span>
          </h2>

          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Create an authenticated university profile to log malfunctioning lab equipment, monitor real-time repair stages, and verify that reported issues receive prompt attention.
          </p>

          <div className="space-y-3.5">
            {[
              { icon: "⚡", title: "Instant Sequential Ticket ID", desc: "Your report gets assigned to the responsible lab tech automatically" },
              { icon: "🛡️", title: "Masked Public Privacy", desc: "Your personal email is masked on the public transparency tracker" },
              { icon: "📧", title: "Live Resolution Notices", desc: "Receive email confirmation the moment your reported equipment is repaired" },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-lg">{f.icon}</span>
                <div>
                  <h4 className="text-xs font-semibold text-white">{f.title}</h4>
                  <p className="text-[11px] text-slate-500 leading-normal">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500 border-t border-white/5 pt-6 flex justify-between">
          <span>© 2026 University Facilities & IT Division</span>
          <span className="text-blue-400">.edu Verification Required</span>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 sm:px-10 lg:px-16 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
              S
            </div>
            <span className="font-display font-extrabold text-lg text-white">Create Account</span>
          </div>

          <div className="glass-card rounded-2xl p-7 sm:p-9 shadow-2xl">
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/20">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold font-display text-white mb-2">Account Provisioned!</h2>
                <p className="text-slate-400 text-xs mb-1">Your SECS account has been successfully registered for:</p>
                <p className="text-blue-400 font-mono text-sm font-semibold mb-6">{form.email}</p>
                <p className="text-slate-500 text-xs mb-8 max-w-sm mx-auto leading-relaxed">
                  You can now log in to the portal with your credentials to submit equipment fault reports and follow resolution progress in real time.
                </p>
                <button
                  onClick={() => onNavigate("login")}
                  className="w-full py-3 rounded-xl btn-primary text-sm font-semibold"
                >
                  Proceed to Login Portal →
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6 pb-4 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">New Registration</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      .edu only
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold font-display text-white mt-1">Create Your Account</h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Register with your official university credentials for verified access.
                  </p>
                </div>

                {serverError && (
                  <div className="mb-5 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2.5">
                    <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth={2} />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                    </svg>
                    <span>{serverError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {/* Role Selector Pills */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                      Academic Designation
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {ROLES.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => set("role", r.value)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center gap-1 ${
                            form.role === r.value
                              ? "bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/15"
                              : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-slate-200"
                          }`}
                        >
                          <span className="text-base">{r.icon}</span>
                          <span className="truncate">{r.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Full Name & Student ID */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Afsana Mimi"
                        value={form.fullName}
                        onChange={(e) => set("fullName", e.target.value)}
                        className={`w-full rounded-xl px-3.5 py-2.5 text-sm glass-input ${
                          errors.fullName ? "border-rose-500" : ""
                        }`}
                      />
                      {errors.fullName && <p className="text-rose-400 text-xs mt-1">{errors.fullName}</p>}
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                        University ID
                      </label>
                      <input
                        type="text"
                        placeholder="0432320005101099"
                        value={form.studentId}
                        onChange={(e) => set("studentId", e.target.value)}
                        className={`w-full rounded-xl px-3.5 py-2.5 text-sm glass-input font-mono ${
                          errors.studentId ? "border-rose-500" : ""
                        }`}
                      />
                      {errors.studentId && <p className="text-rose-400 text-xs mt-1">{errors.studentId}</p>}
                    </div>
                  </div>

                  {/* University Email */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                      University Email (.edu)
                    </label>
                    <input
                      type="email"
                      placeholder="student@uitc.edu"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      className={`w-full rounded-xl px-3.5 py-2.5 text-sm glass-input ${
                        errors.email ? "border-rose-500" : ""
                      }`}
                    />
                    {errors.email && <p className="text-rose-400 text-xs mt-1">{errors.email}</p>}
                  </div>

                  {/* Department */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Department
                    </label>
                    <select
                      value={form.department}
                      onChange={(e) => set("department", e.target.value)}
                      className={`w-full rounded-xl px-3.5 py-2.5 text-sm glass-input bg-[#0b142c] ${
                        errors.department ? "border-rose-500" : ""
                      }`}
                    >
                      <option value="">Select your academic department</option>
                      {departments.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    {errors.department && <p className="text-rose-400 text-xs mt-1">{errors.department}</p>}
                  </div>

                  {/* Password & Confirm Password */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPass ? "text" : "password"}
                          placeholder="Min. 6 chars"
                          value={form.password}
                          onChange={(e) => set("password", e.target.value)}
                          className={`w-full rounded-xl pl-3.5 pr-9 py-2.5 text-sm glass-input ${
                            errors.password ? "border-rose-500" : ""
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                        >
                          {showPass ? "Hide" : "Show"}
                        </button>
                      </div>
                      {errors.password && <p className="text-rose-400 text-xs mt-1">{errors.password}</p>}
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirm ? "text" : "password"}
                          placeholder="Re-enter password"
                          value={form.confirmPassword}
                          onChange={(e) => set("confirmPassword", e.target.value)}
                          className={`w-full rounded-xl pl-3.5 pr-9 py-2.5 text-sm glass-input ${
                            errors.confirmPassword ? "border-rose-500" : ""
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                        >
                          {showConfirm ? "Hide" : "Show"}
                        </button>
                      </div>
                      {errors.confirmPassword && <p className="text-rose-400 text-xs mt-1">{errors.confirmPassword}</p>}
                    </div>
                  </div>

                  {/* Password Strength Indicator */}
                  {form.password && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Password Strength:</span>
                        <span className="font-semibold text-white">{strengthLabel[strength]}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`h-full flex-1 transition-all duration-300 ${
                              strength >= level ? strengthColor[strength] : "bg-white/5"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Terms Checkbox */}
                  <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={form.agreed}
                      onChange={(e) => set("agreed", e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0"
                    />
                    <span className="text-xs text-slate-400 leading-normal">
                      I agree to the University Laboratory Equipment Code of Conduct and acknowledge that problem reports are logged publicly.
                    </span>
                  </label>
                  {errors.agreed && <p className="text-rose-400 text-xs mt-0.5">{errors.agreed}</p>}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-xl btn-primary text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    {loading ? "Registering Profile…" : "Complete Account Registration →"}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-white/5 text-center">
                  <p className="text-xs text-slate-400">
                    Already registered?{" "}
                    <button
                      onClick={() => onNavigate("login")}
                      className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4 ml-1"
                    >
                      Sign in here
                    </button>
                  </p>
                  <button
                    onClick={() => onNavigate("landing")}
                    className="text-xs text-slate-500 hover:text-slate-300 mt-2 transition-colors block mx-auto"
                  >
                    ← Back to main site
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
