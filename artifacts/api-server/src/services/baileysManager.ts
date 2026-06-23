import { BaileysService } from "./baileys";

/**
 * Manages one BaileysService instance per user.
 * userId "default" is used for unauthenticated single-tenant mode.
 */
class BaileysServiceManager {
  private services = new Map<string, BaileysService>();

  get(userId: string): BaileysService {
    let svc = this.services.get(userId);
    if (!svc) {
      svc = new BaileysService(userId);
      this.services.set(userId, svc);
    }
    return svc;
  }
}

export const baileysServiceManager = new BaileysServiceManager();
