import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { WhatsAppService } from '../src/services/whatsapp.service.js';
import {
  NotificationService,
  validateAndNormalizePhone,
  maskPhone,
} from '../src/services/notification.service.js';

describe('WhatsApp Integration & Notification Test Suite', () => {
  let mockWaService: WhatsAppService;
  let notificationService: NotificationService;

  beforeEach(() => {
    mockWaService = new WhatsAppService({ enabled: false });
    notificationService = new NotificationService(mockWaService);
    notificationService.resetState();
  });

  afterEach(async () => {
    await mockWaService.disconnect();
    vi.restoreAllMocks();
  });

  describe('1. Phone Number Validation and Normalization', () => {
    it('normalizes valid international numbers with plus and separators', () => {
      const res1 = validateAndNormalizePhone('+977-9841234567');
      expect(res1.valid).toBe(true);
      expect(res1.normalized).toBe('9779841234567');

      const res2 = validateAndNormalizePhone('+91 98765-43210');
      expect(res2.valid).toBe(true);
      expect(res2.normalized).toBe('919876543210');

      const res3 = validateAndNormalizePhone('001 555-123-4567');
      expect(res3.valid).toBe(true);
      expect(res3.normalized).toBe('15551234567');
    });

    it('accepts numbers that already include country code (11-15 digits)', () => {
      const res = validateAndNormalizePhone('9779841234567');
      expect(res.valid).toBe(true);
      expect(res.normalized).toBe('9779841234567');
    });

    it('rejects ambiguous national numbers lacking country code without guessing', () => {
      // 10 digits without country code is ambiguous
      const res = validateAndNormalizePhone('9841234567');
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('AMBIGUOUS_MISSING_COUNTRY_CODE');
    });

    it('safely rejects empty, null, or non-numeric inputs', () => {
      expect(validateAndNormalizePhone('')).toEqual({ valid: false, reason: 'EMPTY_PHONE_NUMBER' });
      expect(validateAndNormalizePhone(null as any)).toEqual({ valid: false, reason: 'EMPTY_PHONE_NUMBER' });
      expect(validateAndNormalizePhone('abc-invalid')).toEqual({ valid: false, reason: 'INVALID_CHARACTERS' });
      expect(validateAndNormalizePhone('+12')).toEqual({ valid: false, reason: 'INVALID_INTERNATIONAL_LENGTH' });
    });

    it('masks phone numbers to protect PII in logs', () => {
      expect(maskPhone('+9779841234567')).toBe('***4567');
      expect(maskPhone('123')).toBe('****');
    });
  });

  describe('2. WhatsApp Service Lifecycle & Fault Tolerance', () => {
    it('handles WhatsApp disabled cleanly without attempting connection', async () => {
      const service = new WhatsAppService({ enabled: false });
      expect(service.isEnabled()).toBe(false);

      await service.initialize();
      expect(service.isConnected()).toBe(false);
      expect(service.isReady()).toBe(false);

      const status = service.getStatus();
      expect(status.enabled).toBe(false);
      expect(status.state).toBe('disabled');

      const sendResult = await service.send('9779841234567', 'Test message');
      expect(sendResult.success).toBe(false);
      expect(sendResult.error).toBe('WHATSAPP_DISABLED');
    });

    it('handles WhatsApp unready state safely without throwing exceptions', async () => {
      const service = new WhatsAppService({ enabled: true });
      // Client not initialized or not ready
      const sendResult = await service.send('9779841234567', 'Test message');
      expect(sendResult.success).toBe(false);
      expect(sendResult.error).toBe('CLIENT_NOT_INITIALIZED');
    });

    it('recovers gracefully if connection encounters an error on startup', async () => {
      const service = new WhatsAppService({ enabled: true });
      const mockClient = {
        connect: vi.fn().mockRejectedValue(new Error('Network offline')),
        isConnected: vi.fn().mockReturnValue(false),
        isReady: vi.fn().mockReturnValue(false),
        getStatus: vi.fn().mockReturnValue({ session: 'lifelink', state: 'disconnected', connected: false, ready: false }),
        on: vi.fn(),
        destroy: vi.fn(),
      };

      service.setMockClient(mockClient as any);

      // Should not throw or crash
      await expect(service.initialize()).resolves.toBeUndefined();
      expect(service.isReady()).toBe(false);
    });

    it('ensures sanitized status output contains no private credentials or secrets', () => {
      const service = new WhatsAppService({ enabled: true, session: 'lifelink' });
      const status = service.getStatus();

      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('session');
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('ready');
      expect(status).toHaveProperty('state');

      // Verify no credential fields or tokens exist
      expect(status).not.toHaveProperty('key');
      expect(status).not.toHaveProperty('token');
      expect(status).not.toHaveProperty('creds');
      expect(status).not.toHaveProperty('authDir');
    });
  });

  describe('3. Notification Service & Template Formatting', () => {
    it('dispatches welcome notification with user details when delivery succeeds', async () => {
      const sendSpy = vi.spyOn(mockWaService, 'send').mockResolvedValue({
        success: true,
        messageId: 'wa_msg_welcome_001',
      });

      const user = {
        id: 'usr-12345',
        fullName: 'Bikash Sharma',
        phone: '+977-9841234567',
        email: 'bikash@example.com',
      };

      const result = await notificationService.sendWelcomeNotification(user);
      expect(result).toBe(true);
      expect(sendSpy).toHaveBeenCalledTimes(1);

      const [calledPhone, calledText] = sendSpy.mock.calls[0]!;
      expect(calledPhone).toBe('9779841234567');
      expect(calledText).toContain('Hi Bikash Sharma! 👋');
      expect(calledText).toContain('Welcome to LifeLink!');
      expect(calledText).toContain('Thank you for joining our community! ❤️');
    });

    it('skips welcome notification safely if phone is invalid', async () => {
      const sendSpy = vi.spyOn(mockWaService, 'send');
      const user = {
        fullName: 'Jane Doe',
        phone: 'invalid-phone',
      };

      const result = await notificationService.sendWelcomeNotification(user);
      expect(result).toBe(false);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('formats request submitted message with real request details', async () => {
      const sendSpy = vi.spyOn(mockWaService, 'send').mockResolvedValue({
        success: true,
        messageId: 'wa_msg_req_001',
      });

      const user = {
        fullName: 'Dr. Sita',
        phone: '+977-9801234567',
      };

      const requestData = {
        id: 'req-00000001-aaaa-bbbb',
        requestNumber: 'REQ-2026-001',
        itemName: 'Packed Red Blood Cells (O-)',
        quantity: 3,
        status: 'Pending Review',
      };

      const result = await notificationService.sendRequestSubmittedNotification(user, requestData);
      expect(result).toBe(true);
      expect(sendSpy).toHaveBeenCalledTimes(1);

      const [calledPhone, calledText] = sendSpy.mock.calls[0]!;
      expect(calledPhone).toBe('9779801234567');
      expect(calledText).toContain('Hi Dr. Sita! 👋');
      expect(calledText).toContain('Request ID: REQ-2026-001');
      expect(calledText).toContain('Item: Packed Red Blood Cells (O-)');
      expect(calledText).toContain('Quantity: 3 units');
      expect(calledText).toContain('Status: Pending Review');
    });

    it('formats request approved message and prevents duplicate notifications on repeated calls', async () => {
      const sendSpy = vi.spyOn(mockWaService, 'send').mockResolvedValue({
        success: true,
        messageId: 'wa_msg_appr_001',
      });

      const user = {
        fullName: 'Dr. Sita',
        phone: '+977-9801234567',
      };

      const requestData = {
        id: 'req-unique-999',
        requestNumber: 'REQ-2026-999',
        itemName: 'Amoxicillin 500mg',
      };

      // First approval: should send
      const firstResult = await notificationService.sendRequestApprovedNotification(user, requestData);
      expect(firstResult).toBe(true);
      expect(sendSpy).toHaveBeenCalledTimes(1);

      const [calledPhone, calledText] = sendSpy.mock.calls[0]!;
      expect(calledPhone).toBe('9779801234567');
      expect(calledText).toContain('Good news! Your LifeLink request has been approved.');
      expect(calledText).toContain('Request ID: REQ-2026-999');
      expect(calledText).toContain('Item: Amoxicillin 500mg');
      expect(calledText).toContain('Status: Approved');

      // Second approval call with identical request ID: should deduplicate and skip
      const secondResult = await notificationService.sendRequestApprovedNotification(user, requestData);
      expect(secondResult).toBe(false);
      expect(sendSpy).toHaveBeenCalledTimes(1); // Still exactly 1 call
    });
  });

  describe('4. Registration API Endpoint Resilience', () => {
    it('successfully registers user and returns 201 even when WhatsApp client is offline', async () => {
      const testEmail = `wa_reg_test_${Date.now()}@example.com`;

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'SecurePassword123!',
          fullName: 'WhatsApp Test User',
          phone: '+977-9841234567',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(testEmail);
      expect(response.body.data.token).toBeDefined();
    });
  });
});
