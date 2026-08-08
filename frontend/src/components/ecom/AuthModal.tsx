"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { friendlyAuthError } from "@/lib/customer-auth-api";

type AuthTab = "login" | "signup";

const PASSWORD_HINT = "At least 8 characters, with an uppercase letter, a lowercase letter, and a number.";

function isStrongPassword(pw: string): boolean {
  return pw.length >= 8 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw);
}

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login, signup } = useAuth();
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Signup form
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isAuthModalOpen) return null;

  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setErrors({});
    setFormError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!loginEmail.trim()) newErrors.loginEmail = "Email is required";
    if (!loginPassword.trim()) newErrors.loginPassword = "Password is required";
    setErrors(newErrors);
    setFormError("");
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await login(loginEmail.trim(), loginPassword, rememberMe);
      setLoginEmail("");
      setLoginPassword("");
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!signupName.trim()) newErrors.signupName = "Name is required";
    if (!signupEmail.trim()) newErrors.signupEmail = "Email is required";
    if (signupPassword && !isStrongPassword(signupPassword)) newErrors.signupPassword = PASSWORD_HINT;
    if (!signupPassword.trim()) newErrors.signupPassword = "Password is required";
    if (signupPassword !== signupConfirmPassword) newErrors.signupConfirmPassword = "Passwords do not match";
    setErrors(newErrors);
    setFormError("");
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await signup(signupName.trim(), signupEmail.trim(), signupPhone.trim(), signupPassword);
      setSignupName("");
      setSignupEmail("");
      setSignupPhone("");
      setSignupPassword("");
      setSignupConfirmPassword("");
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs: { key: AuthTab; label: string }[] = [
    { key: "login", label: "Login" },
    { key: "signup", label: "Sign Up" },
  ];

  const inputClass = "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm font-sans placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all";
  const errorClass = "text-red-500 text-xs mt-1";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4"
      onClick={closeAuthModal}
    >
      <div
        className="relative w-full max-w-md bg-surface rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-cream hover:bg-blush flex items-center justify-center text-charcoal z-10 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <h2 className="font-display text-2xl font-bold text-charcoal">
            {activeTab === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-text-muted text-sm mt-1">
            {activeTab === "login"
              ? "Sign in to your Vaibhav Celebrations account"
              : "Join us to track your celebrations"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex px-8 gap-1 bg-cream/50 mx-8 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                activeTab === tab.key
                  ? "bg-mocha text-white shadow-md"
                  : "text-text-muted hover:text-charcoal"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="px-8 py-6 max-h-[65vh] overflow-y-auto hide-scrollbar">
          {formError && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {formError}
            </div>
          )}

          {/* ── Login Form ── */}
          {activeTab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input type="email" placeholder="Enter your email address" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className={inputClass} disabled={isSubmitting} autoComplete="email" />
                {errors.loginEmail && <p className={errorClass}>{errors.loginEmail}</p>}
              </div>
              <div>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="Enter your password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={inputClass} disabled={isSubmitting} autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-charcoal cursor-pointer">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.loginPassword && <p className={errorClass}>{errors.loginPassword}</p>}
              </div>
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 text-mocha border-border-light rounded focus:ring-mocha focus:ring-2 accent-mocha" />
                  <span className="text-xs text-charcoal font-medium">Stay signed in</span>
                </label>
                <Link href="/forgot-password" onClick={closeAuthModal} className="text-xs text-mocha font-semibold hover:underline">
                  Forgot password?
                </Link>
              </div>
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <>Login <ArrowRight size={16} /></>}
              </button>
              <p className="text-center text-xs text-text-muted">
                Don&apos;t have an account?{" "}
                <button type="button" onClick={() => switchTab("signup")} className="text-mocha font-semibold hover:underline cursor-pointer">Sign Up</button>
              </p>
            </form>
          )}

          {/* ── Signup Form ── */}
          {activeTab === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <input type="text" placeholder="Enter your full name" value={signupName} onChange={(e) => setSignupName(e.target.value)} className={inputClass} disabled={isSubmitting} autoComplete="name" />
                {errors.signupName && <p className={errorClass}>{errors.signupName}</p>}
              </div>
              <div>
                <input type="email" placeholder="Enter your email address" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className={inputClass} disabled={isSubmitting} autoComplete="email" />
                {errors.signupEmail && <p className={errorClass}>{errors.signupEmail}</p>}
              </div>
              <div>
                <input type="tel" placeholder="Phone number (optional)" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} className={inputClass} disabled={isSubmitting} autoComplete="tel" />
                {errors.signupPhone && <p className={errorClass}>{errors.signupPhone}</p>}
              </div>
              <div>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="Create a password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className={inputClass} disabled={isSubmitting} autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-charcoal cursor-pointer">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.signupPassword ? (
                  <p className={errorClass}>{errors.signupPassword}</p>
                ) : (
                  <p className="text-text-light text-[11px] mt-1">{PASSWORD_HINT}</p>
                )}
              </div>
              <div>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="Confirm password" value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)} className={inputClass} disabled={isSubmitting} autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-charcoal cursor-pointer">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.signupConfirmPassword && (
                  <p className={errorClass}>{errors.signupConfirmPassword}</p>
                )}
              </div>
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <>Create Account <ArrowRight size={16} /></>}
              </button>
              <p className="text-center text-xs text-text-muted">
                Already have an account?{" "}
                <button type="button" onClick={() => switchTab("login")} className="text-mocha font-semibold hover:underline cursor-pointer">Login</button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
