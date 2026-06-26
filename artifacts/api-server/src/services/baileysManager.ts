import { BaileysService } from "./baileys";

/**
 * Manages one BaileysService instance per user.
 * Each service auto-initializes on first access so multi-user sessions
 * start connecting immediately without extra wiring.
 */
class BaileysServiceManager {
  private services = new Map<string, BaileysService>();

  get(userId: string): BaileysService {
    let svc = this.services.get(userId);
    if (!svc) {
      svc = new BaileysService(userId);
      this.services.set(userId, svc);
      // Auto-start the WhatsApp connection for this user
      void svc.initialize();
    }
    return svc;
  }
}

export const baileysServiceManager = new BaileysServiceManager();
