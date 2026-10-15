import { whatsappService, WhatsAppService } from './whatsapp.service.js';

export interface NotificationUser {
  id?: string;
  fullName: string;
  phone: string;
  email?: string;
}

export interface NotificationRequest {
  id: string;
  requestNumber?: string;
  itemName?: string;
  quantity?: number;
  status?: string;
}

export interface PhoneValidationResult {
  valid: boolean;
  normalized?: string;
  reason?: string;
}

/**
 * Normalizes and validates phone numbers for international WhatsApp delivery.
 * Strict: Never guesses country codes for ambiguous national numbers.
 */
export function validateAndNormalizePhone(rawPhone: string | undefined | null): PhoneValidationResult {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { valid: false, reason: 'EMPTY_PHONE_NUMBER' };
  }

  const trimmed = rawPhone.trim();
  if (!trimmed) {
    return { valid: false, reason: 'EMPTY_PHONE_NUMBER' };
  }

  // Check for disallowed characters (only allow +, digits, spaces, hyphens, parentheses)
  if (/[^\d+\s\-().]/.test(trimmed)) {
    return { valid: false, reason: 'INVALID_CHARACTERS' };
  }

  let cleaned = '';
  let hasExplicitPlus = false;

  if (trimmed.startsWith('+')) {
    hasExplicitPlus = true;
    cleaned = trimmed.slice(1).replace(/[\s\-().]/g, '');
  } else if (trimmed.startsWith('00')) {
    hasExplicitPlus = true;
    cleaned = trimmed.slice(2).replace(/[\s\-().]/g, '');
  } else {
    cleaned = trimmed.replace(/[\s\-().]/g, '');
  }

  // Ensure only digits remain
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, reason: 'NON_NUMERIC_DIGITS' };
  }

  // If number had an explicit country code prefix (+ or 00)
  if (hasExplicitPlus) {
    if (cleaned.length < 8 || cleaned.length > 15) {
      return { valid: false, reason: 'INVALID_INTERNATIONAL_LENGTH' };
    }
    return { valid: true, normalized: cleaned };
  }

  // If no prefix was given:
  // Numbers with 11 to 15 digits include a country code (e.g. 9779841234567, 919876543210, 15551234567)
  if (cleaned.length >= 11 && cleaned.length <= 15) {
    return { valid: true, normalized: cleaned };
  }

  // Numbers with 10 or fewer digits without an explicit country code are ambiguous
  // (e.g., 9841234567 could be Nepal, India, US local, etc.). We refuse to silently guess.
  return {
    valid: false,
    reason: 'AMBIGUOUS_MISSING_COUNTRY_CODE',
  };
}

/**
 * Masks phone numbers for secure logging without exposing full PII.
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length <= 4) {
    return '****';
  }
  return `***${phone.slice(-4)}`;
}

export class NotificationService {
  // In-memory set preventing duplicate approval notification dispatches per request ID
  private sentApprovalNotifications: Set<string> = new Set();

  constructor(private waService: WhatsAppService = whatsappService) {}

  /**
   * Dispatches a welcome WhatsApp message following successful user registration.
   * Completely non-blocking and safe against WhatsApp service unreadiness.
   */
  public async sendWelcomeNotification(user: NotificationUser): Promise<boolean> {
    const phoneValidation = validateAndNormalizePhone(user.phone);
    if (!phoneValidation.valid || !phoneValidation.normalized) {
      console.warn(
        `[LifeLink Notification] Skipping welcome message for '${user.fullName}': Phone validation failed (${phoneValidation.reason}).`
      );
      return false;
    }

    const message = [
      `Hi ${user.fullName.trim()}! 👋`,
      '',
      'Welcome to LifeLink!',
      '',
      'Your account has been created successfully. LifeLink helps connect people with available blood and essential medicines when they need them.',
      '',
      'Thank you for joining our community! ❤️',
    ].join('\n');

    const result = await this.waService.send(phoneValidation.normalized, message);
    if (result.success) {
      console.log(`[LifeLink Notification] Welcome notification sent to ${maskPhone(user.phone)} (Message ID: ${result.messageId}).`);
      return true;
    }

    // Failures log safe warnings without crashing or exposing full numbers
    console.warn(`[LifeLink Notification] Could not deliver welcome notification to ${maskPhone(user.phone)}: ${result.error}`);
    return false;
  }

  /**
   * Dispatches a confirmation message upon successful blood/medicine request submission.
   */
  public async sendRequestSubmittedNotification(
    user: NotificationUser,
    request: NotificationRequest
  ): Promise<boolean> {
    const phoneValidation = validateAndNormalizePhone(user.phone);
    if (!phoneValidation.valid || !phoneValidation.normalized) {
      console.warn(
        `[LifeLink Notification] Skipping request submission message for request '${request.id}': Phone validation failed (${phoneValidation.reason}).`
      );
      return false;
    }

    const displayId = request.requestNumber || request.id.slice(0, 8);
    const itemName = request.itemName || 'Requested Medical Resource';
    const quantity = request.quantity !== undefined ? `${request.quantity} units` : 'Specified quantity';
    const status = request.status || 'Pending Review';

    const message = [
      `Hi ${user.fullName.trim()}! 👋`,
      '',
      'Your LifeLink request has been submitted successfully.',
      '',
      `Request ID: ${displayId}`,
      `Item: ${itemName}`,
      `Quantity: ${quantity}`,
      `Status: ${status}`,
      '',
      "We'll notify you when your request is reviewed.",
    ].join('\n');

    const result = await this.waService.send(phoneValidation.normalized, message);
    if (result.success) {
      console.log(`[LifeLink Notification] Request submitted notification sent for request ${displayId}.`);
      return true;
    }

    console.warn(`[LifeLink Notification] Could not deliver request submitted notification for ${displayId}: ${result.error}`);
    return false;
  }

  /**
   * Dispatches an approval notification when an authorized admin or staff approves a request.
   * Enforces deduplication: will not send duplicate approval messages if called repeatedly.
   */
  public async sendRequestApprovedNotification(
    user: NotificationUser,
    request: NotificationRequest
  ): Promise<boolean> {
    // Guard against duplicate notifications for repeated approval calls
    if (this.sentApprovalNotifications.has(request.id)) {
      console.log(`[LifeLink Notification] Approval notification already dispatched for request '${request.id}'. Skipping duplicate.`);
      return false;
    }

    const phoneValidation = validateAndNormalizePhone(user.phone);
    if (!phoneValidation.valid || !phoneValidation.normalized) {
      console.warn(
        `[LifeLink Notification] Skipping approval notification for request '${request.id}': Phone validation failed (${phoneValidation.reason}).`
      );
      return false;
    }

    const displayId = request.requestNumber || request.id.slice(0, 8);
    const itemName = request.itemName || 'Requested Medical Resource';

    const message = [
      `Hi ${user.fullName.trim()}! ✅`,
      '',
      'Good news! Your LifeLink request has been approved.',
      '',
      `Request ID: ${displayId}`,
      `Item: ${itemName}`,
      'Status: Approved',
      '',
      'Please check LifeLink for further details.',
    ].join('\n');

    const result = await this.waService.send(phoneValidation.normalized, message);
    if (result.success) {
      this.sentApprovalNotifications.add(request.id);
      console.log(`[LifeLink Notification] Approval notification sent for request ${displayId}.`);
      return true;
    }

    console.warn(`[LifeLink Notification] Could not deliver approval notification for ${displayId}: ${result.error}`);
    return false;
  }

  /**
   * Resets deduplication state (useful for test isolation).
   */
  public resetState(): void {
    this.sentApprovalNotifications.clear();
  }
}

// Global singleton notification service
export const notificationService = new NotificationService();
