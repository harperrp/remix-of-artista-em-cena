const API_URL = import.meta.env.VITE_WHATSAPP_API_URL;

function getApiUrl() {
  if (!API_URL || API_URL.trim().length === 0) {
    throw new Error("VITE_WHATSAPP_API_URL não configurada");
  }

  return API_URL.replace(/\/$/, "");
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${getApiUrl()}${path}`, init);
  if (!response.ok) {
    throw new Error(`WhatsApp API falhou (${response.status})`);
  }
  return response;
}

export const whatsappService = {
  async connect() {
    await request("/start", { method: "POST" });
  },

  async disconnect() {
    await request("/logout", { method: "POST" });
  },

  async getStatus() {
    const res = await request("/status");
    return res.json();
  },

  getQrImage() {
    return `${getApiUrl()}/qr-image`;
  },
};


export function buildWhatsAppClickToChatUrl(phone?: string | null) {
  const normalized = (phone ?? "").replace(/\D/g, "");
  if (!normalized) return null;
  return `https://wa.me/${normalized}`;
}
