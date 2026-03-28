import type { WhatsAppStatus } from "@/types/crm";

const API_BASE = "https://crm.zapzdelivery.com.br";

type StatusResponse = {
  status?: WhatsAppStatus | string;
  connected?: boolean;
  qrAvailable?: boolean;
};

type QrResponse = {
  qr?: string | null;
  qrCode?: string | null;
  dataUrl?: string | null;
  image?: string | null;
};

type SendMessageResponse = {
  ok?: boolean;
  success?: boolean;
  error?: string;
};

export const whatsappService = {
  async getStatus(): Promise<WhatsAppStatus> {
    try {
      const res = await fetch(`${API_BASE}/status`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        return "disconnected";
      }

      const data = (await res.json()) as StatusResponse;

      if (data.status === "connected") return "connected";
      if (data.status === "qr_ready") return "qr_ready";

      if (data.connected === true) return "connected";
      if (data.qrAvailable === true) return "qr_ready";

      return "disconnected";
    } catch (error) {
      console.error("[WA] getStatus error:", error);
      return "disconnected";
    }
  },

  async getQrCode(): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}/qr`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as QrResponse;

      return data.qr || data.qrCode || data.dataUrl || data.image || null;
    } catch (error) {
      console.error("[WA] getQrCode error:", error);
      return null;
    }
  },

  getQrImageUrl(): string {
    return `${API_BASE}/qr-image`;
  },

  async connect(): Promise<void> {
    const res = await fetch(`${API_BASE}/`, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Falha ao iniciar conexão do WhatsApp");
    }
  },

  async disconnect(): Promise<void> {
    const res = await fetch(`${API_BASE}/logout`, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Falha ao desconectar WhatsApp");
    }
  },

  async sendMessage(phone: string, text: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/send-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ phone, text }),
      });

      if (!res.ok) {
        return false;
      }

      const data = (await res.json()) as SendMessageResponse;
      return Boolean(data.ok ?? data.success ?? true);
    } catch (error) {
      console.error("[WA] sendMessage error:", error);
      return false;
    }
  },

  async getConversations(): Promise<any[]> {
    // As conversas reais continuam vindo do Supabase / camada do CRM
    return [];
  },

  async getMessages(_phone: string): Promise<any[]> {
    // As mensagens reais continuam vindo do Supabase / camada do CRM
    return [];
  },
};
