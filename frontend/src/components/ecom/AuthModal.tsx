"use client";

import { useState } from "react";
import { X, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/auth-context";

type AuthTab = "login" | "signup";

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login, signup } = useAuth();
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [showPassword, setShowPassword] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isAuthModalOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!loginEmail.trim()) newErrors.loginEmail = "Email is required";
    if (!loginPassword.trim()) newErrors.loginPassword = "Password is required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      login(loginEmail, loginPassword);
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!signupName.trim()) newErrors.signupName = "Name is required";
    if (!signupEmail.trim()) newErrors.signupEmail = "Email is required";
    if (!signupPhone.trim()) newErrors.signupPhone = "Phone is required";
    if (!signupPassword.trim()) newErrors.signupPassword = "Password is required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      signup(signupName, signupEmail, signupPhone, signupPassword);
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
              onClick={() => { setActiveTab(tab.key); setErrors({}); }}
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
        <div className="px-8 py-6 max-h-[60vh] overflow-y-auto hide-scrollbar">
          {/* ── Login Form ── */}
          {activeTab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input type="email" placeholder="Enter your email address" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className={inputClass} />
                {errors.loginEmail && <p className={errorClass}>{errors.loginEmail}</p>}
              </div>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="Enter your password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={inputClass} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-charcoal cursor-pointer">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {errors.loginPassword && <p className={errorClass}>{errors.loginPassword}</p>}
              </div>
              <button type="submit" className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider gap-2">
                Login <ArrowRight size={16} />
              </button>
              <p className="text-center text-xs text-text-muted">
                Don&apos;t have an account?{" "}
                <button type="button" onClick={() => setActiveTab("signup")} className="text-mocha font-semibold hover:underline cursor-pointer">Sign Up</button>
              </p>
            </form>
          )}

          {/* ── Signup Form ── */}
          {activeTab === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <input type="text" placeholder="Enter your full name" value={signupName} onChange={(e) => setSignupName(e.target.value)} className={inputClass} />
                {errors.signupName && <p className={errorClass}>{errors.signupName}</p>}
              </div>
              <div>
                <input type="email" placeholder="Enter your email address" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className={inputClass} />
                {errors.signupEmail && <p className={errorClass}>{errors.signupEmail}</p>}
              </div>
              <div>
                <input type="tel" placeholder="Enter your phone number" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} className={inputClass} />
                {errors.signupPhone && <p className={errorClass}>{errors.signupPhone}</p>}
              </div>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="Create a password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className={inputClass} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-charcoal cursor-pointer">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {errors.signupPassword && <p className={errorClass}>{errors.signupPassword}</p>}
              </div>
              <button type="submit" className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider gap-2">
                Create Account <ArrowRight size={16} />
              </button>
              <p className="text-center text-xs text-text-muted">
                Already have an account?{" "}
                <button type="button" onClick={() => setActiveTab("login")} className="text-mocha font-semibold hover:underline cursor-pointer">Login</button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
