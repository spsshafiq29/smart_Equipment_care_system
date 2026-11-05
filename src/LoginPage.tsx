import { useState } from "react";
import { secsApi } from "./services/secsApi";
import type { PortalRole } from "./workflowTypes";

interface Props {
  onNavigate: (page: "register" | "landing") => void;
  onLogin: (role: PortalRole) => void;
}

const PORTALS: { value: PortalRole; label: string; description: string; demoEmail: string }[] = [
  { value: "admin", label: "Admin", description: "Labs, assignments and accounts", demoEmail: "mahmud.kabir@uitc.edu" },
  { value: "authority", label: "Higher Authority", description: "Approvals and oversight", demoEmail: "samina.haque@uitc.edu" },
  { value: "accounts", label: "Accounts", description: "Payments and confirmation", demoEmail: "nusrat.islam@uitc.edu" },
  { value: "technician", label: "Technician", description: "Assigned labs and repairs", demoEmail: "ashik.rahman@uitc.edu" },
];

export default function LoginPage({ onNavigate, onLogin }: Props) {
  const [portal, setPortal] = useState<PortalRole>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate() {
    const errs: Record<string, string> = {};
    if (!email.trim()) {
      errs.email = "Email is required.";
    } else if (!email.toLowerCase().endsWith(".edu")) {
      errs.email = "Only university .edu email addresses are accepted.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Enter a valid email address.";
    }
    if (!password) errs.password = "Password is required.";
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
      await secsApi.auth.login({
        email: email.trim(),
        password,
        portal,
      });
      onLogin(portal);
    } catch (err: any) {
      setServerError(err?.message || "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemoCredentials(p: typeof PORTALS[0]) {
    setPortal(p.value);
    setEmail(p.demoEmail);
    setPassword("Admin@123"); // matches seed data
    setErrors({});
    setServerError("");
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
            Welcome<br />
            <span className="text-amber-400">Back</span> to<br />
            Your Portal
          </h2>
          <p className="text-white/50 text-sm leading-relaxed mb-6 max-w-sm">
            Sign in to manage equipment reports, track repair status, approve budgets, and maintain university laboratory transparency.
          </p>

          {/* Quick Demo Credentials shortcut */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-2">Fast Fill Demo Accounts</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {PORTALS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => fillDemoCredentials(p)}
                  className="rounded border border-white/10 px-2.5 py-1.5 text-left text-white/60 hover:border-amber-400 hover:text-white transition"
                >
                  <strong className="text-white block">{p.label}</strong>
                  <span className="text-[10px] text-white/30 truncate block">{p.demoEmail.split("@")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SLA tiers teaser */}
          <div className="space-y-3">
            <p className="text-white/30 text-xs uppercase tracking-widest font-semibold">SLA Resolution Tiers</p>
            {[
              { label: "Critical", time: "24 hrs", color: "bg-red-500" },
              { label: "High", time: "3 days", color: "bg-orange-400" },
              { label: "Medium", time: "7 days", color: "bg-amber-400" },
              { label: "Low", time: "14 days", color: "bg-green-500" },
            ].map((tier) => (
              <div key={tier.label} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${tier.color}`} />
                <span className="text-white/60 text-sm flex-1">{tier.label}</span>
                <span className="text-white/30 text-xs">{tier.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-white/30 text-xs">© 2026 University Facilities & IT Division</div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20">
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded bg-amber-400 flex items-center justify-center text-[#050d1f] font-black text-sm">S</div>
          <span style={{ fontFamily: "var(--font-display)" }} className="text-white text-lg">
            SECS
          </span>
        </div>

        <div className="max-w-sm w-full mx-auto lg:mx-0">
          <div className="mb-8">
            <h1 style={{ fontFamily: "var(--font-display)" }} className="text-3xl text-white mb-1">
              Sign in
            </h1>
            <p className="text-white/40 text-sm">
              Choose your staff portal, then sign in with your university <span className="text-amber-400">.edu</span> email
            </p>
          </div>

          {serverError && (
            <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/40">Select portal</label>
              <div className="grid grid-cols-2 gap-2">
                {PORTALS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setPortal(item.value);
                      if (!email) setEmail(item.demoEmail);
                    }}
                    className={`rounded-lg border p-3 text-left transition ${
                      portal === item.value ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-white/[0.02] hover:border-white/20"
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-white/40">University Email</label>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-400 bg-amber-400/10">
                  .edu only
                </span>
              </div>
              <div className="relative">
                <input
                  type="email"
                  placeholder="you@uitc.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((er) => ({ ...er, email: "" }));
                  }}
                  className={`w-full rounded-lg pl-4 pr-10 py-3 text-sm text-white placeholder-white/20 bg-white/5 border focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition ${
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-white/40">Password</label>
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
                  className={`w-full rounded-lg pl-4 pr-10 py-3 text-sm text-white placeholder-white/20 bg-white/5 border focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition ${
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
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative shrink-0">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    remember ? "bg-amber-400 border-amber-400" : "border-white/20 bg-white/5"
                  }`}
                >
                  {remember && (
                    <svg className="w-2.5 h-2.5 text-[#050d1f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs text-white/40">Keep me signed in on this device</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-[#050d1f] bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                "Sign In →"
              )}
            </button>
          </form>

          <p className="text-center text-white/30 text-xs mt-6">
            New to SECS?{" "}
            <button onClick={() => onNavigate("register")} className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
              Create an account
            </button>
          </p>

          <p className="text-center text-white/20 text-xs mt-3">
            <button onClick={() => onNavigate("landing")} className="hover:text-white/40 transition-colors">
              ← Back to main site
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
