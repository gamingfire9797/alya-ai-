import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'admin_store.json');

export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  accessCodeHash: string;
  accessCodeSalt: string;
  role: 'super_admin';
  failedAttempts: number;
  lockedUntil: number;
  lastLogin: string | null;
}

export interface AdminSession {
  token: string;
  adminEmail: string;
  createdAt: number;
  expiresAt: number;
  ip: string;
  userAgent: string;
}

export interface UserSession {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  ip: string;
  userAgent?: string;
}

export interface UserRecord {
  id: string;
  displayName: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  googleSub?: string;
  hasCompletedProfile?: boolean;
  hasCompletedOnboarding?: boolean;
  hasCompletedKeySetup?: boolean;
  createdAt: string;
  lastActive: string;
  appVersion: string;
  platform: string;
  devicesCount: number;
  companion: 'alya' | 'jarvis';
  status: 'active' | 'deactivated';
  chatCount: number;
  voiceSessions: number;
  memoriesCount: number;
  supportTicketsCount: number;
}

export interface DeviceRecord {
  deviceId: string;
  userId: string;
  registeredAt: string;
  lastActive: string;
  appVersion: string;
  platform: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: string;
  target: string;
  ip: string;
  status: 'success' | 'failure';
  details: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  companion: 'alya' | 'jarvis';
  submittedAt: string;
  reason: string;
  messages: Array<{ role: string; text: string; timestamp: string }>;
  status: 'open' | 'reviewed' | 'resolved';
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface ErrorLogItem {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  count: number;
}

export interface AdminStoreData {
  admins: AdminUser[];
  sessions: Record<string, AdminSession>;
  userSessions?: Record<string, UserSession>;
  users: UserRecord[];
  devices: DeviceRecord[];
  auditLogs: AuditLogEntry[];
  supportTickets: SupportTicket[];
  errors: ErrorLogItem[];
  analytics: {
    chatMessagesTotal: number;
    voiceSessionsTotal: number;
    memoriesSavedTotal: number;
    phoneToolsTotal: number;
    screenToolsTotal: number;
    alyaUsageTotal: number;
    jarvisUsageTotal: number;
  };
}

function hashSecret(secret: string, salt: string): string {
  return crypto.scryptSync(secret, salt, 64).toString('hex');
}

function verifySecret(secret: string, salt: string, expectedHash: string): boolean {
  try {
    const computed = crypto.scryptSync(secret, salt, 64);
    const expectedBuf = Buffer.from(expectedHash, 'hex');
    if (computed.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(computed, expectedBuf);
  } catch {
    return false;
  }
}

function createInitialStore(): AdminStoreData {
  const adminSalt = crypto.randomBytes(16).toString('hex');
  const codeSalt = crypto.randomBytes(16).toString('hex');
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || 'AlyaAdmin#2026';
  const initialCode = process.env.ADMIN_ACCESS_CODE || 'ALYA-SECURE-9925';

  const defaultAdmin: AdminUser = {
    id: 'admin_root',
    email: 'admin@alya.ai',
    passwordHash: hashSecret(initialPassword, adminSalt),
    salt: adminSalt,
    accessCodeHash: hashSecret(initialCode, codeSalt),
    accessCodeSalt: codeSalt,
    role: 'super_admin',
    failedAttempts: 0,
    lockedUntil: 0,
    lastLogin: null,
  };

  const now = new Date().toISOString();
  const seedUsers: UserRecord[] = [
    {
      id: 'usr_gamingfire_8091',
      displayName: 'Gamingfire',
      createdAt: now,
      lastActive: now,
      appVersion: '2.5.0',
      platform: 'Android WebAPK / Chrome 124',
      devicesCount: 1,
      companion: 'alya',
      status: 'active',
      chatCount: 142,
      voiceSessions: 19,
      memoriesCount: 4,
      supportTicketsCount: 0,
    },
  ];

  return {
    admins: [defaultAdmin],
    sessions: {},
    users: seedUsers,
    devices: [],
    auditLogs: [],
    supportTickets: [],
    errors: [],
    analytics: {
      chatMessagesTotal: 142,
      voiceSessionsTotal: 19,
      memoriesSavedTotal: 4,
      phoneToolsTotal: 5,
      screenToolsTotal: 2,
      alyaUsageTotal: 120,
      jarvisUsageTotal: 41,
    },
  };
}

class AdminStoreManager {
  private data: AdminStoreData;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): AdminStoreData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('AdminStore read error, initializing defaults:', err);
    }
    const initial = createInitialStore();
    this.saveData(initial);
    return initial;
  }

  private saveData(dataToSave?: AdminStoreData): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = dataToSave || this.data;
      fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write AdminStore file:', err);
    }
  }

  authenticateWithCode(adminCode: string, ip: string, userAgent: string): { success: boolean; token?: string; error?: string; lockedSeconds?: number } {
    const admin = this.data.admins[0];
    const now = Date.now();
    if (!admin) {
      return { success: false, error: 'Authentication failed. Administrative account not initialized.' };
    }

    if (admin.lockedUntil && admin.lockedUntil > now) {
      const remainingSeconds = Math.ceil((admin.lockedUntil - now) / 1000);
      this.recordAudit(admin.email, 'ADMIN_CODE_LOGIN_LOCKED', 'AuthGateway', ip, 'failure', `Account locked. ${remainingSeconds}s remaining.`);
      return {
        success: false,
        error: `Security lockout active due to multiple failed attempts. Please retry in ${remainingSeconds} seconds.`,
        lockedSeconds: remainingSeconds,
      };
    }

    const envCode = process.env.ADMIN_CODE || process.env.ADMIN_ACCESS_CODE;
    let isCodeValid = false;

    if (envCode && typeof envCode === 'string' && envCode.trim().length > 0) {
      try {
        const inputBuf = Buffer.from(adminCode.trim());
        const expectedBuf = Buffer.from(envCode.trim());
        isCodeValid = inputBuf.length === expectedBuf.length && crypto.timingSafeEqual(inputBuf, expectedBuf);
      } catch {
        isCodeValid = false;
      }
    } else {
      isCodeValid = verifySecret(adminCode.trim(), admin.accessCodeSalt, admin.accessCodeHash);
    }

    if (!isCodeValid) {
      admin.failedAttempts = (admin.failedAttempts || 0) + 1;
      let lockoutMsg = '';
      if (admin.failedAttempts >= 5) {
        admin.lockedUntil = now + 15 * 60 * 1000;
        admin.failedAttempts = 0;
        lockoutMsg = ' Maximum failed attempts exceeded. Security lockout applied for 15 minutes.';
      }
      this.saveData();
      this.recordAudit(
        admin.email,
        'ADMIN_CODE_LOGIN_FAILED',
        'AuthGateway',
        ip,
        'failure',
        `Incorrect Admin Code attempt.${lockoutMsg}`
      );
      return {
        success: false,
        error: `Authentication failed. Invalid Admin Code.${lockoutMsg}`,
      };
    }

    admin.failedAttempts = 0;
    admin.lockedUntil = 0;
    admin.lastLogin = new Date().toISOString();
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = now + 8 * 60 * 60 * 1000;

    this.data.sessions[sessionToken] = {
      token: sessionToken,
      adminEmail: admin.email,
      createdAt: now,
      expiresAt: sessionExpiresAt,
      ip,
      userAgent: (userAgent || '').slice(0, 150),
    };
    this.saveData();
    this.recordAudit(admin.email, 'ADMIN_CODE_LOGIN_SUCCESS', 'AuthGateway', ip, 'success', 'Administrator authenticated successfully via secure Admin Code.');
    return {
      success: true,
      token: sessionToken,
    };
  }

  verifyAdminCode(adminCode: string): boolean {
    const admin = this.data.admins[0];
    if (!admin) return false;
    const envCode = process.env.ADMIN_CODE || process.env.ADMIN_ACCESS_CODE;
    if (envCode && typeof envCode === 'string' && envCode.trim().length > 0) {
      try {
        const inputBuf = Buffer.from(adminCode.trim());
        const expectedBuf = Buffer.from(envCode.trim());
        return inputBuf.length === expectedBuf.length && crypto.timingSafeEqual(inputBuf, expectedBuf);
      } catch {
        return false;
      }
    }
    return verifySecret(adminCode.trim(), admin.accessCodeSalt, admin.accessCodeHash);
  }

  authenticate(email: string, password: string, accessCode: string, ip: string, userAgent: string): { success: boolean; token?: string; error?: string; lockedSeconds?: number } {
    const admin = this.data.admins.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
    const now = Date.now();
    if (!admin) {
      this.recordAudit('unknown', 'ADMIN_LOGIN_ATTEMPT', email, ip, 'failure', 'Invalid admin email address');
      return { success: false, error: 'Invalid admin credentials or access code.' };
    }
    if (admin.lockedUntil && admin.lockedUntil > now) {
      const remainingSeconds = Math.ceil((admin.lockedUntil - now) / 1000);
      this.recordAudit(admin.email, 'ADMIN_LOGIN_LOCKED', email, ip, 'failure', `Account locked. ${remainingSeconds}s remaining.`);
      return {
        success: false,
        error: `Too many failed attempts. Security lockout active for ${remainingSeconds} seconds.`,
        lockedSeconds: remainingSeconds,
      };
    }
    const isPasswordValid = verifySecret(password, admin.salt, admin.passwordHash);
    const isCodeValid = verifySecret(accessCode.trim(), admin.accessCodeSalt, admin.accessCodeHash);
    if (!isPasswordValid || !isCodeValid) {
      admin.failedAttempts = (admin.failedAttempts || 0) + 1;
      let lockoutMsg = '';
      if (admin.failedAttempts >= 5) {
        admin.lockedUntil = now + 15 * 60 * 1000;
        admin.failedAttempts = 0;
        lockoutMsg = ' Maximum failed attempts reached; account locked for 15 minutes.';
      }
      this.saveData();
      this.recordAudit(
        admin.email,
        'ADMIN_LOGIN_FAILED',
        email,
        ip,
        'failure',
        `Password valid: ${isPasswordValid}, Code valid: ${isCodeValid}.${lockoutMsg}`
      );
      return {
        success: false,
        error: `Invalid credentials or access code.${lockoutMsg}`,
      };
    }

    admin.failedAttempts = 0;
    admin.lockedUntil = 0;
    admin.lastLogin = new Date().toISOString();
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = now + 8 * 60 * 60 * 1000;
    this.data.sessions[sessionToken] = {
      token: sessionToken,
      adminEmail: admin.email,
      createdAt: now,
      expiresAt: sessionExpiresAt,
      ip,
      userAgent: (userAgent || '').slice(0, 150),
    };
    this.saveData();
    this.recordAudit(admin.email, 'ADMIN_LOGIN_SUCCESS', 'AdminSession', ip, 'success', 'Administrator authenticated successfully via 2-step verification.');
    return {
      success: true,
      token: sessionToken,
    };
  }

  verifySession(token: string): AdminSession | null {
    if (!token) return null;
    const session = this.data.sessions[token];
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      delete this.data.sessions[token];
      this.saveData();
      return null;
    }
    return session;
  }

  revokeSession(token: string): boolean {
    if (this.data.sessions[token]) {
      const email = this.data.sessions[token].adminEmail;
      delete this.data.sessions[token];
      this.saveData();
      this.recordAudit(email, 'ADMIN_LOGOUT', 'AdminSession', 'unknown', 'success', 'Session destroyed.');
      return true;
    }
    return false;
  }

  recordAudit(adminEmail: string, action: string, target: string, ip: string, status: 'success' | 'failure', details: string) {
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      adminEmail,
      action,
      target,
      ip: ip || '127.0.0.1',
      status,
      details,
    };
    this.data.auditLogs.unshift(entry);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.saveData();
  }

  getAuditLogs(limit = 100): AuditLogEntry[] {
    return this.data.auditLogs.slice(0, limit);
  }

  registerDevice(payload: {
    userId?: string;
    deviceId?: string;
    displayName?: string;
    appVersion?: string;
    platform?: string;
    companion?: 'alya' | 'jarvis';
  }): { userId: string; deviceId: string; isNew: boolean } {
    const now = new Date().toISOString();
    const userId = payload.userId || `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const deviceId = payload.deviceId || `dev_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const companion = payload.companion === 'jarvis' ? 'jarvis' : 'alya';
    const appVersion = payload.appVersion || '2.5.0';
    const platform = payload.platform || 'Android WebAPK / Browser';
    const displayName = payload.displayName || 'Gamingfire';

    let user = this.data.users.find((u) => u.id === userId);
    let isNew = false;
    if (!user) {
      user = {
        id: userId,
        displayName,
        createdAt: now,
        lastActive: now,
        appVersion,
        platform,
        devicesCount: 1,
        companion,
        status: 'active',
        chatCount: 0,
        voiceSessions: 0,
        memoriesCount: 0,
        supportTicketsCount: 0,
      };
      this.data.users.unshift(user);
      isNew = true;
    } else {
      user.lastActive = now;
      user.appVersion = appVersion;
      user.platform = platform;
      user.companion = companion;
      if (payload.displayName) user.displayName = payload.displayName;
    }

    const existingDevice = this.data.devices.find((d) => d.deviceId === deviceId);
    if (existingDevice) {
      existingDevice.userId = userId;
      existingDevice.lastActive = now;
      existingDevice.appVersion = appVersion;
      existingDevice.platform = platform;
    } else {
      this.data.devices.unshift({
        deviceId,
        userId,
        registeredAt: now,
        lastActive: now,
        appVersion,
        platform,
      });
    }
    user.devicesCount = this.data.devices.filter((d) => d.userId === userId).length;

    this.saveData();
    return { userId, deviceId, isNew };
  }

  recordEvent(payload: {
    eventType: 'chat_sent' | 'voice_start' | 'voice_end' | 'companion_switched' | 'memory_added' | 'phone_tools_opened' | 'app_error';
    companion?: 'alya' | 'jarvis';
    userId?: string;
    errorMessage?: string;
  }) {
    const comp = payload.companion === 'jarvis' ? 'jarvis' : 'alya';
    if (comp === 'jarvis') {
      this.data.analytics.jarvisUsageTotal++;
    } else {
      this.data.analytics.alyaUsageTotal++;
    }
    const user = payload.userId ? this.data.users.find((u) => u.id === payload.userId) : null;
    if (user) {
      user.lastActive = new Date().toISOString();
    }
    switch (payload.eventType) {
      case 'chat_sent':
        this.data.analytics.chatMessagesTotal++;
        if (user) user.chatCount++;
        break;
      case 'voice_start':
      case 'voice_end':
        this.data.analytics.voiceSessionsTotal++;
        if (user && payload.eventType === 'voice_start') user.voiceSessions++;
        break;
      case 'memory_added':
        this.data.analytics.memoriesSavedTotal++;
        if (user) user.memoriesCount++;
        break;
      case 'phone_tools_opened':
        this.data.analytics.phoneToolsTotal++;
        break;
      case 'app_error':
        if (payload.errorMessage) {
          const cleanMsg = payload.errorMessage.slice(0, 150);
          const existing = this.data.errors.find((e) => e.message === cleanMsg);
          if (existing) {
            existing.count++;
            existing.timestamp = new Date().toISOString();
          } else {
            this.data.errors.unshift({
              id: `err_${Date.now()}`,
              timestamp: new Date().toISOString(),
              type: 'AppClientError',
              message: cleanMsg,
              count: 1,
            });
            if (this.data.errors.length > 50) this.data.errors = this.data.errors.slice(0, 50);
          }
        }
        break;
    }
    this.saveData();
  }

  getUsers(query?: string, companionFilter?: string, statusFilter?: string): UserRecord[] {
    return this.data.users.filter((u) => {
      if (companionFilter && companionFilter !== 'all' && u.companion !== companionFilter) return false;
      if (statusFilter && statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (query && query.trim()) {
        const q = query.trim().toLowerCase();
        return u.displayName.toLowerCase().includes(q) || u.id.toLowerCase().includes(q) || u.platform.toLowerCase().includes(q);
      }
      return true;
    });
  }

  updateUserStatus(userId: string, newStatus: 'active' | 'deactivated', adminEmail: string, ip: string): { success: boolean; error?: string } {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) return { success: false, error: 'User record not found.' };
    const oldStatus = user.status;
    user.status = newStatus;
    this.saveData();
    this.recordAudit(adminEmail, 'USER_STATUS_UPDATED', `User:${userId}`, ip, 'success', `Changed status from ${oldStatus} to ${newStatus}.`);
    return { success: true };
  }

  deleteUser(userId: string, adminEmail: string, ip: string): { success: boolean; error?: string } {
    const index = this.data.users.findIndex((u) => u.id === userId);
    if (index === -1) return { success: false, error: 'User record not found.' };
    const removed = this.data.users.splice(index, 1)[0];
    this.data.devices = this.data.devices.filter((d) => d.userId !== userId);
    this.data.supportTickets = this.data.supportTickets.filter((t) => t.userId !== userId);
    this.saveData();
    this.recordAudit(adminEmail, 'USER_ACCOUNT_DELETED', `User:${userId}`, ip, 'success', `Deleted account for ${removed.displayName} (${userId}).`);
    return { success: true };
  }

  submitSupportTicket(ticket: {
    userId: string;
    userName: string;
    companion: 'alya' | 'jarvis';
    reason: string;
    messages: Array<{ role: string; text: string; timestamp: string }>;
  }): SupportTicket {
    const newTicket: SupportTicket = {
      id: `tkt_${Date.now().toString(36)}`,
      userId: ticket.userId,
      userName: ticket.userName || 'Anonymous User',
      companion: ticket.companion || 'alya',
      submittedAt: new Date().toISOString(),
      reason: (ticket.reason || 'General support request').slice(0, 200),
      messages: (Array.isArray(ticket.messages) ? ticket.messages : []).slice(-10),
      status: 'open',
    };
    this.data.supportTickets.unshift(newTicket);
    const user = this.data.users.find((u) => u.id === ticket.userId);
    if (user) user.supportTicketsCount++;
    this.saveData();
    return newTicket;
  }

  getSupportTickets(): SupportTicket[] {
    return this.data.supportTickets;
  }

  resolveSupportTicket(ticketId: string, status: 'reviewed' | 'resolved', adminEmail: string, ip: string): { success: boolean; error?: string } {
    const ticket = this.data.supportTickets.find((t) => t.id === ticketId);
    if (!ticket) return { success: false, error: 'Support ticket not found.' };
    ticket.status = status;
    ticket.reviewedAt = new Date().toISOString();
    ticket.reviewedBy = adminEmail;
    this.saveData();
    this.recordAudit(adminEmail, 'SUPPORT_TICKET_REVIEWED', `Ticket:${ticketId}`, ip, 'success', `Support ticket marked as ${status}.`);
    return { success: true };
  }

  getDashboardStats() {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const totalUsers = this.data.users.length;
    const activeUsers24h = this.data.users.filter((u) => new Date(u.lastActive).getTime() >= oneDayAgo).length;
    const activeUsers30d = this.data.users.filter((u) => new Date(u.lastActive).getTime() >= thirtyDaysAgo).length;
    const verifiedInstallations = Math.max(1, this.data.devices.length);

    const versionDistribution: Record<string, number> = {};
    for (const u of this.data.users) {
      const v = u.appVersion || 'Unknown';
      versionDistribution[v] = (versionDistribution[v] || 0) + 1;
    }

    const registrationsByDay: Record<string, number> = {};
    for (const u of this.data.users) {
      const day = u.createdAt ? u.createdAt.slice(0, 10) : '2026-10-01';
      registrationsByDay[day] = (registrationsByDay[day] || 0) + 1;
    }
    const registrationsOverTime = Object.keys(registrationsByDay)
      .sort()
      .map((date) => ({ date, count: registrationsByDay[date] }));

    const voiceSessions = this.data.analytics.voiceSessionsTotal;
    const voiceErrors = this.data.errors
      .filter((e) => e.type.includes('Voice') || e.message.includes('Microphone') || e.message.includes('Speech'))
      .reduce((sum, e) => sum + e.count, 0);
    const voiceSuccesses = Math.max(0, voiceSessions - voiceErrors);

    return {
      totalUsers,
      activeUsers24h,
      activeUsers30d,
      verifiedInstallations,
      versionDistribution,
      registrationsOverTime,
      alyaUsage: this.data.analytics.alyaUsageTotal,
      jarvisUsage: this.data.analytics.jarvisUsageTotal,
      chatMessagesCount: this.data.analytics.chatMessagesTotal,
      voiceSessionsCount: voiceSessions,
      voiceCallsSucceeded: voiceSuccesses,
      voiceCallsFailed: voiceErrors,
      speechErrorsCount: voiceErrors,
      memoriesSavedCount: this.data.analytics.memoriesSavedTotal,
      phoneToolsCount: this.data.analytics.phoneToolsTotal,
      screenToolsCount: this.data.analytics.screenToolsTotal,
      recentErrorsCount: this.data.errors.reduce((sum, e) => sum + e.count, 0),
      recentErrors: this.data.errors.slice(0, 10),
      openSupportTickets: this.data.supportTickets.filter((t) => t.status === 'open').length,
    };
  }

  exportUserData(userId: string, adminEmail: string, ip: string): { success: boolean; data?: any; error?: string } {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) return { success: false, error: 'User record not found.' };
    const devices = this.data.devices.filter((d) => d.userId === userId);
    const tickets = this.data.supportTickets.filter((t) => t.userId === userId);
    const exportBundle = {
      account: user,
      registeredDevices: devices,
      consentedSupportSubmissions: tickets,
    };
    this.recordAudit(adminEmail, 'USER_DATA_EXPORTED', `User:${userId}`, ip, 'success', `Generated data bundle.`);
    return { success: true, data: exportBundle };
  }

  validateUsername(username: string): { valid: boolean; error?: string } {
    if (!username || typeof username !== 'string') {
      return { valid: false, error: 'Username is required.' };
    }
    const clean = username.trim();
    if (clean.length < 3) {
      return { valid: false, error: 'Username must be at least 3 characters long.' };
    }
    if (clean.length > 20) {
      return { valid: false, error: 'Username must not exceed 20 characters.' };
    }
    const regex = /^[a-zA-Z0-9_]+$/;
    if (!regex.test(clean)) {
      return {
        valid: false,
        error: 'Username can only contain letters, numbers, and underscores (_).',
      };
    }
    const reserved = ['admin', 'administrator', 'alya', 'jarvis', 'root', 'system'];
    if (reserved.includes(clean.toLowerCase())) {
      return { valid: false, error: 'This username is reserved. Please pick another.' };
    }
    return { valid: true };
  }

  isUsernameAvailable(username: string, excludeUserId?: string): { available: boolean; error?: string } {
    const val = this.validateUsername(username);
    if (!val.valid) {
      return { available: false, error: val.error };
    }
    const lower = username.trim().toLowerCase();
    const conflict = this.data.users.find(
      (u) => u.username && u.username.toLowerCase() === lower && u.id !== excludeUserId
    );
    if (conflict) {
      return { available: false, error: 'This username is already taken. Please choose another.' };
    }
    return { available: true };
  }

  sanitizeUser(user: UserRecord) {
    return {
      id: user.id,
      displayName: user.displayName,
      username: user.username || '',
      avatarUrl: user.avatarUrl || '',
      bannerUrl: user.bannerUrl || '',
      companionPreference: user.companion || 'alya',
      hasCompletedProfile: !!user.hasCompletedProfile,
      hasCompletedOnboarding: !!user.hasCompletedOnboarding,
      hasCompletedKeySetup: !!user.hasCompletedKeySetup,
      createdAt: user.createdAt,
    };
  }

  createOrRegisterProfileUser(payload: {
    username: string;
    displayName: string;
    avatarUrl?: string;
    bannerUrl?: string;
    companionPreference?: 'alya' | 'jarvis';
    existingUserId?: string;
    ip?: string;
    userAgent?: string;
  }): { success: boolean; session?: { token: string; expiresAt: number }; user?: any; error?: string } {
    const cleanUser = (payload.username || '').trim().toLowerCase();
    const val = this.validateUsername(cleanUser);
    if (!val.valid) {
      return { success: false, error: val.error };
    }
    const avail = this.isUsernameAvailable(cleanUser, payload.existingUserId);
    if (!avail.available) {
      return { success: false, error: avail.error || 'Username is already taken.' };
    }

    const cleanDisplay = (payload.displayName || 'Explorer').trim().slice(0, 40);
    const now = new Date().toISOString();
    let user = payload.existingUserId ? this.data.users.find((u) => u.id === payload.existingUserId) : undefined;
    if (user) {
      user.username = cleanUser;
      user.displayName = cleanDisplay;
      if (payload.avatarUrl !== undefined) user.avatarUrl = payload.avatarUrl;
      if (payload.bannerUrl !== undefined) user.bannerUrl = payload.bannerUrl;
      if (payload.companionPreference) user.companion = payload.companionPreference;
      user.hasCompletedProfile = true;
      user.hasCompletedOnboarding = true;
      user.lastActive = now;
    } else {
      const userId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      user = {
        id: userId,
        displayName: cleanDisplay,
        username: cleanUser,
        avatarUrl: payload.avatarUrl,
        bannerUrl: payload.bannerUrl,
        createdAt: now,
        lastActive: now,
        appVersion: '2.5.0',
        platform: 'Alya AI Device Profile',
        devicesCount: 1,
        companion: payload.companionPreference || 'alya',
        status: 'active',
        chatCount: 0,
        voiceSessions: 0,
        memoriesCount: 0,
        supportTicketsCount: 0,
        hasCompletedProfile: true,
        hasCompletedOnboarding: true,
        hasCompletedKeySetup: false,
      };
      this.data.users.unshift(user);
    }

    if (!this.data.userSessions) this.data.userSessions = {};
    const token = `usr_sess_${crypto.randomBytes(28).toString('hex')}`;
    const expiresAt = Date.now() + 60 * 24 * 60 * 60 * 1000;
    this.data.userSessions[token] = {
      token,
      userId: user.id,
      createdAt: Date.now(),
      expiresAt,
      ip: payload.ip || '127.0.0.1',
      userAgent: (payload.userAgent || '').slice(0, 150),
    };
    this.saveData();

    return {
      success: true,
      session: { token, expiresAt },
      user: this.sanitizeUser(user),
    };
  }

  updateUserProfile(
    userId: string,
    data: {
      displayName?: string;
      username?: string;
      avatarUrl?: string;
      bannerUrl?: string;
      companion?: 'alya' | 'jarvis';
    }
  ): { success: boolean; user?: any; error?: string } {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: 'User profile not found.' };
    }
    if (data.username !== undefined) {
      const cleanUser = data.username.trim().toLowerCase();
      if (cleanUser !== (user.username || '').toLowerCase()) {
        const avail = this.isUsernameAvailable(cleanUser, userId);
        if (!avail.available) {
          return { success: false, error: avail.error || 'Username is not available.' };
        }
        user.username = cleanUser;
      }
    }
    if (data.displayName !== undefined) {
      const cleanDisplay = data.displayName.trim().slice(0, 40);
      if (cleanDisplay.length > 0) {
        user.displayName = cleanDisplay;
      }
    }
    if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
    if (data.bannerUrl !== undefined) user.bannerUrl = data.bannerUrl;
    if (data.companion) user.companion = data.companion;
    user.hasCompletedProfile = true;
    user.lastActive = new Date().toISOString();
    this.saveData();

    return {
      success: true,
      user: this.sanitizeUser(user),
    };
  }

  verifyUserSession(token: string): UserRecord | null {
    if (!token || !this.data.userSessions) return null;
    const session = this.data.userSessions[token];
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      delete this.data.userSessions[token];
      this.saveData();
      return null;
    }
    const user = this.data.users.find((u) => u.id === session.userId);
    if (!user || user.status === 'deactivated') {
      return null;
    }
    user.lastActive = new Date().toISOString();
    return user;
  }

  revokeUserSession(token: string): boolean {
    if (this.data.userSessions && this.data.userSessions[token]) {
      delete this.data.userSessions[token];
      this.saveData();
      return true;
    }
    return false;
  }
}

export const adminStore = new AdminStoreManager();
