import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Bell,
  Lock,
  Phone,
  MapPin,
  Heart,
  Save,
  Check,
  Building2,
  Calendar,
  CreditCard,
  KeyRound
} from 'lucide-react';
import { api } from '../services/api';

export default function ProfileSettingsView({ user, onProfileUpdated }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'security', 'preferences'
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Editable Profile Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [bio, setBio] = useState('');

  // Password Fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await api.getProfile();
      setProfile(data);
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
      setAddress(data.address || '');
      setEmergencyContact(data.emergency_contact || '');
      setBio(data.bio || '');

      if (data.settings) {
        setSettings(data.settings);
      } else {
        const s = await api.getUserSettings();
        setSettings(s);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load profile details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setErrorMsg('');
    try {
      const updated = await api.updateProfile({
        full_name: fullName,
        phone,
        address,
        emergency_contact: emergencyContact,
        bio,
      });
      setProfile(updated);
      setSuccessMsg('Personal profile details updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);

      // Update local storage user if full name changed
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      savedUser.full_name = fullName;
      localStorage.setItem('user', JSON.stringify(savedUser));
      if (onProfileUpdated) onProfileUpdated(savedUser);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match');
      return;
    }
    setChangingPassword(true);
    setErrorMsg('');
    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg('Account password changed successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleToggleSetting = async (key) => {
    const updatedVal = !settings[key];
    const newSettings = { ...settings, [key]: updatedVal };
    setSettings(newSettings);
    try {
      await api.updateUserSettings({ [key]: updatedVal });
      setSuccessMsg('Notification preferences updated!');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      // Revert
      setSettings(settings);
      setErrorMsg(err.message || 'Failed to update preference');
    }
  };

  if (loading) {
    return (
      <div className="view-container" style={{ textAlign: 'center', padding: '60px' }}>
        Loading user profile...
      </div>
    );
  }

  return (
    <div className="view-container">
      {/* Top Banner */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <User className="text-primary" size={28} />
          Profile & Account Settings
        </h1>
        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Manage your personal employee profile, login credentials, and notification alert preferences.
        </p>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={18} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger" style={{ marginBottom: '18px' }}>
          {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
        <button
          id="tab-profile-details"
          className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={16} /> Personal Information
        </button>
        <button
          id="tab-profile-security"
          className={`btn ${activeTab === 'security' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('security')}
        >
          <Lock size={16} /> Password & Security
        </button>
        <button
          id="tab-profile-preferences"
          className={`btn ${activeTab === 'preferences' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('preferences')}
        >
          <Bell size={16} /> Notification Preferences
        </button>
      </div>

      {/* TAB 1: PERSONAL INFORMATION */}
      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          {/* Edit Form */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 16px 0' }}>
              Edit Personal Profile
            </h3>
            <form onSubmit={handleUpdateProfile}>
              <div style={{ marginBottom: '14px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Full Legal Name *
                </label>
                <input
                  id="input-profile-fullname"
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Contact Phone Number
                </label>
                <input
                  id="input-profile-phone"
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Residential Address
                </label>
                <input
                  id="input-profile-address"
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g. HSR Layout Sector 2, Bengaluru, Karnataka"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Emergency Contact Details
                </label>
                <input
                  id="input-profile-emergency"
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g. +91 98765 00003 (Father/Spouse)"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Professional Bio
                </label>
                <textarea
                  id="textarea-profile-bio"
                  className="input"
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Short bio describing your role, skills, and background..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <button
                id="btn-save-profile"
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={savingProfile}
              >
                <Save size={16} /> {savingProfile ? 'Saving Changes...' : 'Save Profile Details'}
              </button>
            </form>
          </div>

          {/* Read-Only Organizational Snapshot */}
          <div className="card" style={{ padding: '24px', background: 'var(--bg-main)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px 0', color: 'var(--text-main)' }}>
              Employment Identity
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Username & System ID
                </span>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                  @{profile?.username} (ID: #{profile?.id})
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Corporate Email
                </span>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                  {profile?.email}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Department & Designation
                </span>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                  {profile?.designation} • {profile?.department}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Access Role
                </span>
                <div style={{ marginTop: '2px' }}>
                  <span className="badge badge-indigo">{profile?.role}</span>
                </div>
              </div>

              {profile?.joining_date && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Date of Joining
                  </span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                    {profile?.joining_date}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PASSWORD & SECURITY */}
      {activeTab === 'security' && (
        <div className="card" style={{ maxWidth: '520px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <KeyRound size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                Change Password
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Secure your WorkSphere account with a strong password
              </span>
            </div>
          </div>

          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: '14px' }}>
              <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Current Password *
              </label>
              <input
                id="input-current-password"
                type="password"
                className="input"
                style={{ width: '100%' }}
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                New Password (Minimum 6 characters) *
              </label>
              <input
                id="input-new-password"
                type="password"
                className="input"
                style={{ width: '100%' }}
                placeholder="Create new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Confirm New Password *
              </label>
              <input
                id="input-confirm-password"
                type="password"
                className="input"
                style={{ width: '100%' }}
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              id="btn-submit-change-password"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={changingPassword}
            >
              <Lock size={16} /> {changingPassword ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: NOTIFICATION PREFERENCES */}
      {activeTab === 'preferences' && settings && (
        <div className="card" style={{ maxWidth: '640px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px 0' }}>
            Alert & Notification Preferences
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 20px 0' }}>
            Choose which notifications you wish to receive across email and in-app channels.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              {
                key: 'email_notifications',
                title: 'Email Notifications',
                desc: 'Receive important payroll, exit status, and announcement digests via email.',
              },
              {
                key: 'in_app_notifications',
                title: 'In-App Alerts',
                desc: 'Show real-time badge counters and alert drop-downs in the WorkSphere topbar.',
              },
              {
                key: 'leave_alerts',
                title: 'Leave & Attendance Alerts',
                desc: 'Instant alerts on leave request approvals, rejections, and shift schedule changes.',
              },
              {
                key: 'task_alerts',
                title: 'Task Assignment Alerts',
                desc: 'Receive alerts when HR or team leads assign new tasks or milestones.',
              },
              {
                key: 'announcement_alerts',
                title: 'Company Announcement Broadcasts',
                desc: 'Get notified immediately whenever management posts executive announcements.',
              },
            ].map((pref) => {
              const isEnabled = settings[pref.key];
              return (
                <div
                  key={pref.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: isEnabled ? 'rgba(79, 70, 229, 0.02)' : 'var(--bg-main)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--text-main)' }}>
                      {pref.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {pref.desc}
                    </div>
                  </div>

                  <button
                    id={`toggle-${pref.key}`}
                    type="button"
                    className={`btn ${isEnabled ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                    onClick={() => handleToggleSetting(pref.key)}
                  >
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
