"use client";

import { useState } from "react";
import {
  Loader2,
  Save,
  KeyRound,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Mail,
  MessageSquareCheck,
  Edit3,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/Toast";
import * as authApi from "@/lib/customer-auth-api";
import { friendlyAuthError } from "@/lib/customer-auth-api";
import type { User } from "@/lib/ecom-types";
import { OtpVerificationModal } from "@/components/account/OtpVerificationModal";
import { ChangeEmailModal } from "@/components/account/ChangeEmailModal";

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

  // OTP Modal states
  const [isPhoneOtpModalOpen, setIsPhoneOtpModalOpen] = useState(false);
  const [isEmailOtpModalOpen, setIsEmailOtpModalOpen] = useState(false);
  const [isChangeEmailModalOpen, setIsChangeEmailModalOpen] = useState(false);
  const [phoneDevOtp, setPhoneDevOtp] = useState<string | undefined>(undefined);
  const [emailDevOtp, setEmailDevOtp] = useState<string | undefined>(undefined);
  const [isRequestingPhoneOtp, setIsRequestingPhoneOtp] = useState(false);
  const [isRequestingEmailOtp, setIsRequestingEmailOtp] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Determine phone verification state: must be verified in DB AND match the current input value
  const isPhoneVerified = Boolean(
    user.phoneVerified &&
      user.phone &&
      phone.trim() === user.phone.trim()
  );

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

  const handleStartPhoneVerification = async () => {
    const trimmed = phone.trim();
    if (!trimmed || trimmed.length < 6) {
      push("Please enter a valid phone number (at least 6 digits)", "error");
      return;
    }

    setIsRequestingPhoneOtp(true);
    try {
      const res = await authApi.requestPhoneOtp(trimmed);
      setPhoneDevOtp(res.devOtp);
      setIsPhoneOtpModalOpen(true);
      push(res.message || "Verification code sent to WhatsApp", "default");
    } catch (err) {
      push(friendlyAuthError(err), "error");
    } finally {
      setIsRequestingPhoneOtp(false);
    }
  };

  const handleStartEmailVerification = async () => {
    setIsRequestingEmailOtp(true);
    try {
      const res = await authApi.requestEmailOtp();
      setEmailDevOtp(res.devOtp);
      setIsEmailOtpModalOpen(true);
      push(res.message || "Verification code sent to your email", "default");
    } catch (err) {
      push(friendlyAuthError(err), "error");
    } finally {
      setIsRequestingEmailOtp(false);
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

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-charcoal">My Profile</h1>
        <p className="text-text-muted text-sm mt-1">Manage your account details, verification status, and security settings.</p>
      </div>

      {/* Profile Details */}
      <form onSubmit={handleSaveProfile} className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft space-y-5">
        <h3 className="font-display text-lg font-bold text-charcoal">Account Details</h3>

        <div className="grid sm:grid-cols-2 gap-5">
          {/* Full Name */}
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1 block">Full Name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-charcoal block">Email Address</label>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  user.emailVerified
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {user.emailVerified ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                {user.emailVerified ? "Verified" : "Not Verified"}
              </span>
            </div>
            <input
              className={`${inputClass} bg-cream/30 text-charcoal/80 cursor-not-allowed`}
              value={user.email}
              disabled
              title="Click 'Change Email' below to update your email address"
            />
            <div className="flex items-center gap-3 pt-1">
              {!user.emailVerified && (
                <button
                  type="button"
                  onClick={handleStartEmailVerification}
                  disabled={isRequestingEmailOtp}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-mocha hover:text-mocha-dark transition cursor-pointer disabled:opacity-50"
                >
                  {isRequestingEmailOtp ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                  Verify Email
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsChangeEmailModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-charcoal transition cursor-pointer ml-auto"
              >
                <Edit3 size={12} /> Change Email
              </button>
            </div>
          </div>

          {/* WhatsApp Mobile Number */}
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-charcoal block">WhatsApp Mobile Number</label>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  isPhoneVerified
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {isPhoneVerified ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                {isPhoneVerified ? "Verified" : "Not Verified"}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                className={`${inputClass} flex-1`}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210 or +91 87698 95174"
              />
              {!isPhoneVerified && (
                <button
                  type="button"
                  onClick={handleStartPhoneVerification}
                  disabled={isRequestingPhoneOtp || !phone.trim()}
                  className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-3 rounded-xl transition cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isRequestingPhoneOtp ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <MessageSquareCheck size={16} />
                  )}
                  Verify via WhatsApp
                </button>
              )}
            </div>
            {isPhoneVerified ? (
              <p className="text-[11px] text-emerald-700 mt-1">
                Your WhatsApp number is verified for transactional order updates and invoice delivery.
              </p>
            ) : (
              <p className="text-[11px] text-text-light mt-1">
                Verify your mobile number to receive order updates and PDF invoices directly on WhatsApp.
              </p>
            )}
          </div>
        </div>

        <div className="pt-2">
          <button type="submit" disabled={isSavingProfile} className="btn-primary px-8 py-3 text-sm font-semibold gap-2 disabled:opacity-60">
            {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
          </button>
        </div>
      </form>

      {/* Delivery Address */}
      <AddressForm user={user} refreshUser={refreshUser} />

      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft space-y-4">
        <h3 className="font-display text-lg font-bold text-charcoal flex items-center gap-2">
          <KeyRound size={18} className="text-mocha" /> Change Password
        </h3>
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

      {/* Phone OTP Verification Modal */}
      <OtpVerificationModal
        isOpen={isPhoneOtpModalOpen}
        onClose={() => setIsPhoneOtpModalOpen(false)}
        type="phone"
        targetValue={phone.trim()}
        initialDevOtp={phoneDevOtp}
        onSuccess={async () => {
          await refreshUser();
          push("Phone number verified successfully with WhatsApp!", "success");
        }}
      />

      {/* Email OTP Verification Modal (for unverified current email) */}
      <OtpVerificationModal
        isOpen={isEmailOtpModalOpen}
        onClose={() => setIsEmailOtpModalOpen(false)}
        type="email"
        targetValue={user.email}
        initialDevOtp={emailDevOtp}
        onSuccess={async () => {
          await refreshUser();
          push("Email verified successfully!", "success");
        }}
      />

      {/* Change Email Modal (2-step: new email -> OTP verification) */}
      <ChangeEmailModal
        isOpen={isChangeEmailModalOpen}
        onClose={() => setIsChangeEmailModalOpen(false)}
        currentEmail={user.email}
        onSuccess={async (updatedUser) => {
          await refreshUser();
          push(`Email updated to ${updatedUser.email} and verified successfully!`, "success");
        }}
      />
    </div>
  );
}

function AddressForm({ user, refreshUser }: { user: User; refreshUser: () => Promise<void> }) {
  const { push } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [address, setAddress] = useState(
    user.defaultAddress ?? {
      fullName: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
    }
  );

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await authApi.updateProfile({ defaultAddress: address });
      await refreshUser();
      push("Default address updated successfully", "success");
    } catch (err) {
      push(friendlyAuthError(err), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all";

  return (
    <form onSubmit={handleSaveAddress} className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft space-y-4">
      <div>
        <h3 className="font-display text-lg font-bold text-charcoal">Delivery Address</h3>
        <p className="text-text-muted text-[13px] mt-1">This address will be used as the default for your future orders.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-charcoal mb-1 block">Full Name</label>
          <input className={inputClass} value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} required />
        </div>
        <div>
          <label className="text-xs font-semibold text-charcoal mb-1 block">PIN Code</label>
          <input className={inputClass} value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} required />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-charcoal mb-1 block">Address Line 1</label>
          <input className={inputClass} value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} required placeholder="House No, Building, Street" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-charcoal mb-1 block">Address Line 2 (Optional)</label>
          <input className={inputClass} value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} placeholder="Area, Colony, Landmark" />
        </div>
        <div>
          <label className="text-xs font-semibold text-charcoal mb-1 block">City</label>
          <input className={inputClass} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} required />
        </div>
        <div>
          <label className="text-xs font-semibold text-charcoal mb-1 block">State</label>
          <input className={inputClass} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} required />
        </div>
      </div>
      <button type="submit" disabled={isSaving} className="btn-primary px-8 py-3 text-sm font-semibold gap-2 disabled:opacity-60">
        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Address
      </button>
    </form>
  );
}
