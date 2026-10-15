import path from 'node:path';
import { WhatsApp, type WhatsAppStatus } from 'whatsapp-msg-client';

export interface WhatsAppServiceOptions {
  enabled?: boolean;
  session?: string;
  authDir?: string;
  printQRInTerminal?: boolean;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class WhatsAppService {
  private client: WhatsApp | null = null;
  private initPromise: Promise<void> | null = null;
  private options: WhatsAppServiceOptions;

  constructor(options: WhatsAppServiceOptions = {}) {
    this.options = options;
  }

  /**
   * Evaluates whether the WhatsApp integration is enabled via options or environment variable.
   */
  public isEnabled(): boolean {
    if (this.options.enabled !== undefined) {
      return this.options.enabled;
    }
    return process.env.WHATSAPP_ENABLED === 'true';
  }

  /**
   * Resolves the persistent authentication directory path.
   * Resolves relative paths against the project root / current working directory.
   */
  public getAuthDirectory(): string {
    const rawDir =
      this.options.authDir ||
      process.env.WHATSAPP_AUTH_DIR ||
      path.resolve(process.cwd(), '.wauth');

    return path.isAbsolute(rawDir) ? rawDir : path.resolve(process.cwd(), rawDir);
  }

  /**
   * Returns the active session profile identifier.
   */
  public getSessionName(): string {
    return this.options.session || process.env.WHATSAPP_SESSION || 'lifelink';
  }

  /**
   * Initializes the singleton WhatsApp client.
   * Thread-safe: guards against concurrent initialization invocations.
   */
  public async initialize(): Promise<void> {
    if (!this.isEnabled()) {
      console.log('[LifeLink WhatsApp] Notifications disabled (WHATSAPP_ENABLED is not set to true).');
      return;
    }

    if (this.client && (this.client.isConnected() || this.client.isReady())) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        const session = this.getSessionName();
        const authDir = this.getAuthDirectory();
        const printQRInTerminal =
          this.options.printQRInTerminal !== undefined
            ? this.options.printQRInTerminal
            : true;

        console.log(`[LifeLink WhatsApp] Initializing client (session: '${session}', storage: '${authDir}')...`);

        if (!this.client) {
          this.client = new WhatsApp({
            session,
            authDir,
            printQRInTerminal,
            keepAlive: true,
            reconnect: true,
            logger: 'silent', // Keeps internal protocol logs out of application output
          });
        }

        // Register connection lifecycle event listeners
        this.client.on('qr', () => {
          console.log('[LifeLink WhatsApp] --------------------------------------------------');
          console.log('[LifeLink WhatsApp] ACTION REQUIRED: First-time authentication QR generated.');
          console.log('[LifeLink WhatsApp] Scan the QR code above in terminal using WhatsApp:');
          console.log('[LifeLink WhatsApp] Open WhatsApp -> Settings / Menu -> Linked Devices -> Link a Device');
          console.log('[LifeLink WhatsApp] --------------------------------------------------');
        });

        this.client.on('connected', () => {
          console.log('[LifeLink WhatsApp] Underlying transport connection opened.');
        });

        this.client.on('ready', () => {
          console.log('[LifeLink WhatsApp] Connected and ready.');
        });

        this.client.on('reconnecting', (attempt, maxAttempts) => {
          console.log(`[LifeLink WhatsApp] Reconnecting (attempt ${attempt} of ${maxAttempts})...`);
        });

        this.client.on('disconnected', (reason) => {
          console.log(`[LifeLink WhatsApp] Disconnected: ${reason || 'Connection closed'}.`);
        });

        this.client.on('logged_out', () => {
          console.warn('[LifeLink WhatsApp] Session was logged out. A new QR code will be generated on next connect.');
        });

        this.client.on('error', (error) => {
          console.error('[LifeLink WhatsApp] Client error (non-fatal):', error.message);
        });

        // Connect asynchronously to initiate session loading or QR generation
        await this.client.connect();
      } catch (error: any) {
        console.warn('[LifeLink WhatsApp] Startup connection attempt encountered an error (backend remains fully operational):', error.message);
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Indicates whether the client is currently connected and authenticated to send messages.
   */
  public isReady(): boolean {
    if (!this.isEnabled() || !this.client) {
      return false;
    }
    return this.client.isReady();
  }

  /**
   * Indicates whether the socket connection is currently open.
   */
  public isConnected(): boolean {
    if (!this.isEnabled() || !this.client) {
      return false;
    }
    return this.client.isConnected();
  }

  /**
   * Returns a sanitized status report.
   * Never exposes credentials, tokens, or private session keys.
   */
  public getStatus(): {
    enabled: boolean;
    session: string;
    connected: boolean;
    ready: boolean;
    reconnecting: boolean;
    state: string;
  } {
    if (!this.isEnabled()) {
      return {
        enabled: false,
        session: this.getSessionName(),
        connected: false,
        ready: false,
        reconnecting: false,
        state: 'disabled',
      };
    }

    if (!this.client) {
      return {
        enabled: true,
        session: this.getSessionName(),
        connected: false,
        ready: false,
        reconnecting: false,
        state: 'uninitialized',
      };
    }

    const clientStatus: WhatsAppStatus = this.client.getStatus();
    return {
      enabled: true,
      session: clientStatus.session,
      connected: clientStatus.connected,
      ready: clientStatus.ready,
      reconnecting: clientStatus.reconnecting,
      state: clientStatus.state,
    };
  }

  /**
   * Sends a plain text WhatsApp message.
   * Fails safely without throwing unhandled exceptions if the client is offline or sending fails.
   */
  public async send(to: string, message: string): Promise<SendResult> {
    if (!this.isEnabled()) {
      return { success: false, error: 'WHATSAPP_DISABLED' };
    }

    if (!this.client) {
      return { success: false, error: 'CLIENT_NOT_INITIALIZED' };
    }

    if (!this.client.isReady()) {
      return { success: false, error: 'CLIENT_NOT_READY' };
    }

    try {
      const sent = await this.client.send(to, message);
      return {
        success: true,
        messageId: sent.id,
      };
    } catch (err: any) {
      console.warn(`[LifeLink WhatsApp] Delivery to recipient failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Closes the connection and cleans up client resources.
   * Useful during graceful shutdown or automated testing teardown.
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch {
        // Ignore teardown errors
      }
      this.client = null;
    }
    this.initPromise = null;
  }

  /**
   * Testing helper: permits injection of a mock or stubbed WhatsApp instance.
   */
  public setMockClient(mockClient: WhatsApp | null): void {
    this.client = mockClient;
  }
}

// Global singleton instance for the LifeLink server process
export const whatsappService = new WhatsAppService();
