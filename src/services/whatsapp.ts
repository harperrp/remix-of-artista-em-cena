// ── WhatsApp Service (Mock / Preparado para VPS) ──
// Quando o backend VPS com Baileys estiver pronto, trocar as implementações.
// A interface pública não muda.

import type { WhatsAppStatus } from "@/types/crm";

let mockStatus: WhatsAppStatus = "disconnected";

export const whatsappService = {
  async getStatus(): Promise<WhatsAppStatus> {
    // TODO: fetch from VPS API
    return mockStatus;
  },

  async getQrCode(): Promise<string | null> {
    // TODO: fetch real QR from VPS
    if (mockStatus === "qr_ready") {
      return "data:image/png;base64,MOCK_QR_PLACEHOLDER";
    }
    return null;
  },

  async connect(): Promise<void> {
    // TODO: POST to VPS /api/whatsapp/connect
    mockStatus = "qr_ready";
    setTimeout(() => { mockStatus = "connected"; }, 5000);
  },

  async disconnect(): Promise<void> {
    // TODO: POST to VPS /api/whatsapp/disconnect
    mockStatus = "disconnected";
  },

  async sendMessage(phone: string, text: string): Promise<boolean> {
    // TODO: POST to VPS /api/whatsapp/send
    console.log(`[WA Mock] Sending to ${phone}: ${text}`);
    return true;
  },

  async getConversations(): Promise<any[]> {
    // TODO: GET from VPS /api/whatsapp/conversations
    return [];
  },

  async getMessages(phone: string): Promise<any[]> {
    // TODO: GET from VPS /api/whatsapp/messages/:phone
    return [];
  },
};
