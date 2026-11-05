import { useEffect, useState } from "react";
import { secsApi } from "./services/secsApi";

interface Props {
  onNavigate: (page: "login" | "landing") => void;
}

const ROLES = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher / Lecturer" },
  { value: "researcher", label: "Researcher" },
];

function EduBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-400 bg-amber-400/10">
      .edu required
    </span>
  );
}

export default function RegisterPage({ onNavigate }: Props) {
  const [departments, setDepartments] = useState<string[]>([
    "Computer Science & Engineering",
    "Electrical & Electronic Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Physics",
    "Chemistry",
    "Biology & Biotechnology",
    "Business Administration",
    "Other",
  ]);

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
    if (!form.studentId.trim()) errs.studentId = "ID number is required.";
    if (!form.email.trim()) {
      errs.email = "Email is required.";
    } else if (!form.email.toLowerCase().endsWith(".edu")) {
      errs.email = "Only university .edu email addresses are accepted.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Enter a valid email address.";
    }
    if (!form.department) errs.department = "Select your department.";
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
    if (!form.agreed) errs.agreed = "You must accept the terms to proceed.";
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
      setServerError(err?.message || "Registration failed. Please check inputs.");
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

  const strengthLabel = ["", "Weak", "Fair", "Strong"];
  const strengthColor = ["", "bg-red-500", "bg-amber-400", "bg-green-500"];

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #050d1f 0%, #0a1628 60%, #0e1f3a 100%)" }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=1200&fit=crop&auto=format)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(5,13,31,0.85) 0%, rgba(10,22,40,0.7) 100%)" }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
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
            Join the<br />
            <span className="text-amber-400">Smart Campus</span><br />
            Network
          </h2>
          <p className="text-white/50 text-sm leading-relaxed mb-10 max-w-sm">
            Register with your university email to report equipment issues, track repair progress, and keep labs running smoothly.
          </p>

          <div className="space-y-4">
            {[
              { icon: "🔬", text: "Report broken lab equipment in seconds" },
              { icon: "📡", text: "Track issue status in real time" },
              { icon: "🔔", text: "Get instant notifications on repairs" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-white/60 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-white/30 text-xs">© 2026 University Facilities & IT Division</div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20 overflow-y-auto">
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded bg-amber-400 flex items-center justify-center text-[#050d1f] font-black text-sm">S</div>
          <span style={{ fontFamily: "var(--font-display)" }} className="text-white text-lg">
            SECS
          </span>
        </div>

        <div className="max-w-md w-full mx-auto lg:mx-0">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto mb-5">
                <svg className="w-9 h-9 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl text-white mb-2">
                Account Created!
              </h2>
              <p className="text-white/50 text-sm mb-1">Your SECS account has been registered for</p>
              <p className="text-amber-400 font-medium mb-6">{form.email}</p>
              <p className="text-white/40 text-xs mb-8">
                You can now log in to the portal with your university credentials to submit reports and follow resolution progress.
              </p>
              <button
                onClick={() => onNavigate("login")}
                className="w-full py-3 rounded-lg font-semibold text-[#050d1f] bg-amber-400 hover:bg-amber-300 transition-colors duration-200"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 style={{ fontFamily: "var(--font-display)" }} className="text-3xl text-white mb-1">
                  Create your account
                </h1>
                <p className="text-white/40 text-sm">
                  Register with your university <span className="text-amber-400">.edu</span> email address
                </p>
              </div>

              {serverError && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Role selector */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">I am a</label>
                  <div className="flex gap-2">
                    {ROLES.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => set("role", r.value)}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                          form.role === r.value
                            ? "bg-amber-400/20 border-amber-400 text-amber-400"
                            : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    placeholder="Abir Talukdar"
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 bg-white/5 border focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition ${
                      errors.fullName ? "border-red-500" : "border-white/10 focus:border-amber-400/50"
                    }`}
                  />
                  {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Student / Staff ID */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-1.5">
                      Student / Staff ID
                    </label>
                    <input
                      type="text"
                      placeholder="0432320005101078"
                      value={form.studentId}
                      onChange={(e) => set("studentId", e.target.value)}
                      className={`w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 bg-white/5 border focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition ${
                        errors.studentId ? "border-red-500" : "border-white/10 focus:border-amber-400/50"
                      }`}
                    />
                    {errors.studentId && <p className="text-red-400 text-xs mt-1">{errors.studentId}</p>}
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-1.5">Department</label>
                    <select
                      value={form.department}
                      onChange={(e) => set("department", e.target.value)}
                      className={`w-full rounded-lg px-4 py-2.5 text-sm text-white bg-[#0a1628] border focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition ${
                        errors.department ? "border-red-500" : "border-white/10 focus:border-amber-400/50"
                      }`}
                    >
                      <option value="">Select dept.</option>
                      {departments.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    {errors.department && <p className="text-red-400 text-xs mt-1">{errors.department}</p>}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-white/40">University Email</label>
                    <EduBadge />
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="a.talukdar@uitc.edu"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      className={`w-full rounded-lg pl-4 pr-10 py-2.5 text-sm text-white placeholder-white/20 bg-white/5 border focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition ${
                        errors.email ? "border-red-500" : "border-white/10 focus:border-amber-400/50"
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </span>
                  </div>
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      className={`w-full rounded-lg pl-4 pr-10 py-2.5 text-sm text-white placeholder-white/20 bg-white/5 border focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition ${
                        errors.password ? "border-red-500" : "border-white/10 focus:border-amber-400/50"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                    >
                      {showPass ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 flex gap-1">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                              i <= strength ? strengthColor[strength] : "bg-white/10"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-white/40">{strengthLabel[strength]}</span>
                    </div>
                  )}
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={form.confirmPassword}
                      onChange={(e) => set("confirmPassword", e.target.value)}
                      className={`w-full rounded-lg pl-4 pr-10 py-2.5 text-sm text-white placeholder-white/20 bg-white/5 border focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition ${
                        errors.confirmPassword ? "border-red-500" : "border-white/10 focus:border-amber-400/50"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                    >
                      {showConfirm ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>

                {/* Terms */}
                <div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="relative mt-0.5 shrink-0">
                      <input type="checkbox" checked={form.agreed} onChange={(e) => set("agreed", e.target.checked)} className="sr-only" />
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          form.agreed ? "bg-amber-400 border-amber-400" : "border-white/20 bg-white/5"
                        }`}
                      >
                        {form.agreed && (
                          <svg className="w-2.5 h-2.5 text-[#050d1f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-white/40 leading-relaxed">
                      I agree to the university's{" "}
                      <a href="#" className="text-amber-400 hover:underline">
                        Terms of Use
                      </a>{" "}
                      and{" "}
                      <a href="#" className="text-amber-400 hover:underline">
                        Privacy Policy
                      </a>
                    </span>
                  </label>
                  {errors.agreed && <p className="text-red-400 text-xs mt-1">{errors.agreed}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg font-semibold text-[#050d1f] bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all duration-150 mt-2 disabled:opacity-50"
                >
                  {loading ? "Creating Account..." : "Create Account →"}
                </button>
              </form>

              <p className="text-center text-white/30 text-xs mt-6">
                Already have an account?{" "}
                <button onClick={() => onNavigate("login")} className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
