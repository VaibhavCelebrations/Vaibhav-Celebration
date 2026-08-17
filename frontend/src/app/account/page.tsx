"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Save, KeyRound, LogOut, ShieldCheck, ShieldAlert, Gift } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/Toast";
import * as authApi from "@/lib/customer-auth-api";
import { friendlyAuthError } from "@/lib/customer-auth-api";
import type { User } from "@/lib/ecom-types";

export default function AccountProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  if (!user) return null;
  // Keying on user.id ensures the form's local state re-initializes whenever
  // a different account loads, without needing an effect to sync props->state.
  return <ProfileForm key={user.id} user={user} logout={logout} refreshUser={refreshUser} />;
}

function ProfileForm({ user, logout, refreshUser }: { user: User; logout: () => Promise<void>; refreshUser: () => Promise<void> }) {
  const { push } = useToast();

  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await authApi.updateProfile({ name: name.trim(), phone: phone.trim() || undefined });
      await refreshUser();
      push("Profile updated successfully", "success");
    } catch (err) {
      push(friendlyAuthError(err), "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      push("Password changed. Please sign in again.", "success");
      setCurrentPassword("");
      setNewPassword("");
      await logout();
    } catch (err) {
      push(friendlyAuthError(err), "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-charcoal">My Profile</h1>
        <p className="text-text-muted text-sm mt-1">Manage your account details, gift registry, and security settings.</p>
      </div>

      <Link
        href="/account/registry"
        className="flex items-center gap-4 bg-surface rounded-2xl border border-border-light p-5 shadow-soft hover:shadow-md hover:border-mocha/40 transition-all"
      >
        <div className="w-12 h-12 rounded-xl bg-mocha/10 flex items-center justify-center shrink-0">
          <Gift size={22} className="text-mocha" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold text-charcoal">Gift Registry</p>
          <p className="text-sm text-text-muted mt-0.5">Create a wishlist, share it with guests, and track gifts for your celebration.</p>
        </div>
        <span className="text-sm font-semibold text-mocha shrink-0">Open →</span>
      </Link>

      {/* Profile Details */}
      <form onSubmit={handleSaveProfile} className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft space-y-4">
        <h3 className="font-display text-lg font-bold text-charcoal">Account Details</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1 block">Full Name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1 block">Email</label>
            <input className={`${inputClass} opacity-60 cursor-not-allowed`} value={user.email} disabled />
          </div>
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1 block">Phone</label>
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Add a phone number" />
          </div>
          <div className="flex items-end">
            <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-lg ${user.emailVerified ? "text-green-700 bg-green-50" : "text-amber-700 bg-amber-50"}`}>
              {user.emailVerified ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
              {user.emailVerified ? "Email verified" : "Email not verified"}
            </div>
          </div>
        </div>
        <button type="submit" disabled={isSavingProfile} className="btn-primary px-8 py-3 text-sm font-semibold gap-2 disabled:opacity-60">
          {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
        </button>
      </form>

      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft space-y-4">
        <h3 className="font-display text-lg font-bold text-charcoal flex items-center gap-2"><KeyRound size={18} className="text-mocha" /> Change Password</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1 block">Current Password</label>
            <input type="password" className={inputClass} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1 block">New Password</label>
            <input type="password" className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
        </div>
        <p className="text-[11px] text-text-light">At least 8 characters, with an uppercase letter, a lowercase letter, and a number.</p>
        <button type="submit" disabled={isChangingPassword} className="btn-outline px-8 py-3 text-sm font-semibold gap-2 disabled:opacity-60">
          {isChangingPassword ? <Loader2 size={16} className="animate-spin" /> : "Update Password"}
        </button>
      </form>

      {/* Sign out */}
      <button onClick={() => void logout()} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-semibold cursor-pointer">
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  );
}
