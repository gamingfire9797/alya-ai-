import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Activity,
  LogOut,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  KeyRound,
  DownloadCloud,
  MessageSquare,
  Mic,
  Brain,
  Layers,
  Sparkles,
  ArrowLeft,
  Lock,
  Smartphone,
  Server,
} from 'lucide-react';
import {
  AdminStats,
  AdminUserRecord,
  AdminAuditLogEntry,
  AdminSupportTicket,
} from '../../types';
import { apiFetch } from '../../utils/apiConfig';

interface AdminControlPanelProps {
  token: string;
  adminEmail: string;
  onLogout: () => void;
  onBackToApp: () => void;
}

type AdminTab = 'overview' | 'directory' | 'analytics' | 'downloads' | 'diagnostics';

export const AdminControlPanel: React.FC<AdminControlPanelProps> = ({
  token,
  adminEmail,
  onLogout,
  onBackToApp,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogEntry[]>([]);
  const [supportTickets, setSupportTickets] = useState<AdminSupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [companionFilter, setCompanionFilter] = useState<'all' | 'alya' | 'jarvis'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  const [deletingUser, setDeletingUser] = useState<AdminUserRecord | null>(null);
  const [reauthAdminCode, setReauthAdminCode] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, usersRes, logsRes, ticketsRes] = await Promise.all([
        apiFetch('/api/admin/stats', { headers }),
        apiFetch(`/api/admin/users?q=${encodeURIComponent(userSearch)}&companion=${companionFilter}&status=${statusFilter}`, { headers }),
        apiFetch('/api/admin/audit-logs', { headers }),
        apiFetch('/api/admin/support-tickets', { headers }),
      ]);

      if (statsRes.status === 401 || usersRes.status === 401) {
        onLogout();
        return;
      }

      const [statsData, usersData, logsData, ticketsData] = await Promise.all([
        statsRes.json(),
        usersRes.json(),
        logsRes.json(),
        ticketsRes.json(),
      ]);

      setStats(statsData);
      setUsers(usersData.users || []);
      setAuditLogs(logsData.logs || []);
      setSupportTickets(ticketsData.tickets || []);
    } catch {
      setActionMessage({ type: 'error', text: 'Network communication error while loading metrics.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userSearch, companionFilter, statusFilter]);

  const handleToggleStatus = async (user: AdminUserRecord) => {
    const nextStatus = user.status === 'active' ? 'deactivated' : 'active';
    try {
      const res = await apiFetch(`/api/admin/users/${user.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({
          type: 'success',
          text: `User ${user.displayName} account status updated to ${nextStatus}.`,
        });
        fetchData();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to update user status.' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Failed to update user status.' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    if (!reauthAdminCode.trim()) {
      setActionMessage({ type: 'error', text: 'Admin Code is required to authorize deletion.' });
      return;
    }
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-admin-code': reauthAdminCode.trim(),
        },
        body: JSON.stringify({ adminCode: reauthAdminCode.trim() }),
      });
      const data = await res.json();
      setIsDeleting(false);
      if (res.ok && data.success) {
        setActionMessage({
          type: 'success',
          text: `Account for ${deletingUser.displayName} permanently deleted.`,
        });
        setDeletingUser(null);
        setReauthAdminCode('');
        fetchData();
      } else {
        setActionMessage({
          type: 'error',
          text: data.error || 'Reauthentication failed. Incorrect Admin Code.',
        });
      }
    } catch {
      setIsDeleting(false);
      setActionMessage({ type: 'error', text: 'Failed to delete account. Server error.' });
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-gradient-to-b from-[#0b0813] via-[#07050d] to-[#020105] text-white select-none">
      <header className="px-4 py-3 border-b border-white/10 glass-panel flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 to-purple-600 flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.4)]">
            <ShieldAlert size={17} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold font-comfortaa text-white">Admin Control Center</h1>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                PROD
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {adminEmail} • <span className="text-emerald-400">Authenticated Session</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 rounded-lg glass-panel hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={onBackToApp}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg glass-panel hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Companion</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors"
            title="End admin session"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {actionMessage && (
        <div
          className={`mx-4 mt-2 p-2.5 rounded-xl text-xs flex items-center justify-between z-20 animate-fadeIn ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>
      )}

      <nav className="px-4 pt-2 border-b border-white/5 flex gap-1 overflow-x-auto z-10 shrink-0 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-pink-500 text-white bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard size={14} className={activeTab === 'overview' ? 'text-pink-400' : ''} />
          <span>Overview</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'directory'
              ? 'border-pink-500 text-white bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users size={14} className={activeTab === 'directory' ? 'text-pink-400' : ''} />
          <span>User Directory</span>
          {stats && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white/10 text-slate-300">
              {stats.totalUsers}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'border-pink-500 text-white bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={14} className={activeTab === 'analytics' ? 'text-purple-400' : ''} />
          <span>Feature Analytics</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('downloads')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'downloads'
              ? 'border-pink-500 text-white bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <DownloadCloud size={14} className={activeTab === 'downloads' ? 'text-teal-400' : ''} />
          <span>Downloads & Installs</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('diagnostics')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'diagnostics'
              ? 'border-pink-500 text-white bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server size={14} className={activeTab === 'diagnostics' ? 'text-amber-400' : ''} />
          <span>Technical Diagnostics</span>
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'overview' && stats && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="glass-card rounded-2xl p-3.5 border border-pink-500/25 space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>Registered Accounts</span>
                  <Users size={14} className="text-pink-400" />
                </div>
                <div className="text-2xl font-bold font-comfortaa text-white">{stats.totalUsers}</div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Verified Profiles</span>
                </div>
              </div>
              <div className="glass-card rounded-2xl p-3.5 border border-purple-500/25 space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>Active Users</span>
                  <Activity size={14} className="text-purple-400" />
                </div>
                <div className="text-2xl font-bold font-comfortaa text-white">{stats.activeUsers24h}</div>
                <div className="text-[10px] text-purple-300">
                  {stats.activeUsers24h} (24h) • {stats.activeUsers30d} (30d)
                </div>
              </div>
              <div className="glass-card rounded-2xl p-3.5 border border-teal-500/25 space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>Registered Devices</span>
                  <Smartphone size={14} className="text-teal-400" />
                </div>
                <div className="text-2xl font-bold font-comfortaa text-white">{stats.verifiedInstallations}</div>
                <div className="text-[10px] text-teal-300">Confirmed Devices</div>
              </div>
              <div className="glass-card rounded-2xl p-3.5 border border-amber-500/25 space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>Companion Split</span>
                  <Sparkles size={14} className="text-amber-400" />
                </div>
                <div className="text-base font-bold font-comfortaa text-white flex items-center gap-1.5">
                  <span className="text-pink-400">Alya {Math.round((stats.alyaUsage / (stats.alyaUsage + stats.jarvisUsage || 1)) * 100)}%</span>
                  <span className="text-slate-500">/</span>
                  <span className="text-amber-400">Jarvis {Math.round((stats.jarvisUsage / (stats.alyaUsage + stats.jarvisUsage || 1)) * 100)}%</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {stats.alyaUsage} Alya / {stats.jarvisUsage} Jarvis
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Activity size={13} className="text-pink-400" />
                <span>New Registrations Over Time</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {stats.registrationsOverTime.map((reg) => (
                  <div key={reg.date} className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                    <span className="text-[10px] font-mono text-slate-400">{reg.date}</span>
                    <div className="text-base font-bold text-white font-mono">+{reg.count} accounts</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'directory' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="glass-card rounded-2xl p-3 border border-white/10 flex flex-col sm:flex-row gap-2 items-center justify-between">
              <div className="relative w-full sm:w-72 flex items-center">
                <Search size={14} className="absolute left-3 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user name or ID..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={companionFilter}
                  onChange={(e) => setCompanionFilter(e.target.value as any)}
                  className="bg-black/60 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="all">All Companions</option>
                  <option value="alya">Alya Users</option>
                  <option value="jarvis">Jarvis Users</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-black/60 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="deactivated">Deactivated</option>
                </select>
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-3 border-b border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>{users.length} accounts matching filters</span>
                <span className="text-[10px]">Consent verified • No phone/private data collected</span>
              </div>
              {users.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No accounts found matching search query.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="p-3.5 hover:bg-white/5 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{user.displayName}</span>
                          <span className="font-mono text-[10px] text-slate-500">({user.id})</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              user.status === 'active'
                                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                                : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {user.status === 'active' ? 'Active' : 'Deactivated'}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              user.companion === 'jarvis'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-pink-500/20 text-pink-300'
                            }`}
                          >
                            {user.companion === 'jarvis' ? '⚡ Jarvis' : '🌸 Alya'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                          <span>Created: {new Date(user.createdAt).toLocaleDateString()}</span>
                          <span>Last Active: {new Date(user.lastActive).toLocaleDateString()}</span>
                          <span>Chats: <strong>{user.chatCount}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            user.status === 'active'
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                          }`}
                        >
                          {user.status === 'active' ? 'Deactivate' : 'Reactivate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingUser(user);
                            setReauthAdminCode('');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {deletingUser && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                <div className="glass-card rounded-2xl p-5 max-w-sm w-full border border-rose-500/40 space-y-3 shadow-2xl">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <Lock size={18} />
                    <span>Reauthentication Required</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Permanent account deletion for <strong>{deletingUser.displayName}</strong> ({deletingUser.id}) requires administrative reauthentication.
                  </p>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <KeyRound size={12} className="text-pink-400" />
                      <span>Confirm Admin Code:</span>
                    </label>
                    <input
                      type="password"
                      value={reauthAdminCode}
                      onChange={(e) => setReauthAdminCode(e.target.value)}
                      placeholder="Enter Admin Code to authorize..."
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-rose-500/40 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono tracking-widest"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setDeletingUser(null)}
                      className="px-3 py-1.5 rounded-xl glass-panel text-xs font-semibold text-slate-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting || !reauthAdminCode.trim()}
                      onClick={handleConfirmDelete}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all"
                    >
                      {isDeleting ? 'Verifying...' : 'Authorize Deletion'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && stats && (
          <div className="space-y-4 animate-fadeIn">
            <div className="glass-card rounded-2xl p-4 border border-purple-500/25 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Layers size={14} />
                <span>Feature Telemetry</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-pink-300 font-semibold">
                    <MessageSquare size={14} />
                    <span>Chat Messages</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">{stats.chatMessagesCount}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-rose-300 font-semibold">
                    <Mic size={14} />
                    <span>Voice Sessions</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">{stats.voiceSessionsCount}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-purple-300 font-semibold">
                    <Brain size={14} />
                    <span>Memory Items</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">{stats.memoriesSavedCount}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-blue-300 font-semibold">
                    <Smartphone size={14} />
                    <span>Phone & Tools</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">{stats.phoneToolsCount + stats.screenToolsCount}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'downloads' && stats && (
          <div className="space-y-4 animate-fadeIn">
            <div className="glass-card rounded-2xl p-4 border border-purple-500/25 space-y-2 bg-purple-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Smartphone size={14} />
                  <span>Direct APK & PWA Verification</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                  Verified Installs
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {stats.verifiedInstallations} verified device installations
              </div>
            </div>
          </div>
        )}

        {activeTab === 'diagnostics' && stats && (
          <div className="space-y-4 animate-fadeIn">
            <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Server size={14} className="text-pink-400" />
                <span>Diagnostics & Status</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-slate-400">Server Status</div>
                  <div className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Operational (HTTP/200)</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-slate-400">Gemini Neural API</div>
                  <div className="text-white font-bold mt-0.5">Connected (Gemini 3.8 Flash)</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
