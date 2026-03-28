import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Wifi, WifiOff, QrCode, RefreshCw } from "lucide-react";
import { whatsappService } from "@/services/whatsapp";
import { toast } from "sonner";
import type { WhatsAppStatus } from "@/types/crm";

const statusConfig: Record<WhatsAppStatus, { label: string; color: string; icon: any }> = {
  disconnected: { label: "Desconectado", color: "text-red-400", icon: WifiOff },
  connecting: { label: "Conectando...", color: "text-yellow-400", icon: RefreshCw },
  qr_ready: { label: "QR Code Pronto", color: "text-blue-400", icon: QrCode },
  connected: { label: "Conectado", color: "text-green-400", icon: Wifi },
};

export function CrmWhatsAppPage() {
  const [status, setStatus] = useState<WhatsAppStatus>("disconnected");
  const [loading, setLoading] = useState(false);

  async function refreshStatus() {
    const s = await whatsappService.getStatus();
    setStatus(s);
  }

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  async function handleConnect() {
    setLoading(true);
    try {
      await whatsappService.connect();
      toast.success("Solicitação de conexão enviada");
      refreshStatus();
    } catch {
      toast.error("Erro ao conectar");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    try {
      await whatsappService.disconnect();
      toast.success("Desconectado");
      refreshStatus();
    } catch {
      toast.error("Erro ao desconectar");
    } finally {
      setLoading(false);
    }
  }

  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  return (
    <div className="p-6 space-y-6 fade-up max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Gerenciar conexão com WhatsApp Business</p>
      </div>

      {/* Status card */}
      <Card className="border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-accent flex items-center justify-center">
            <Smartphone className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Status da Sessão</p>
            <div className="flex items-center gap-2 mt-1">
              <StatusIcon className={`h-4 w-4 ${cfg.color}`} />
              <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {status === "disconnected" && (
              <Button onClick={handleConnect} disabled={loading} className="gap-2">
                <QrCode className="h-4 w-4" /> Conectar
              </Button>
            )}
            {status === "connected" && (
              <Button onClick={handleDisconnect} disabled={loading} variant="destructive" className="gap-2">
                <WifiOff className="h-4 w-4" /> Desconectar
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* QR Code area */}
      {status === "qr_ready" && (
        <Card className="border bg-card p-6 text-center">
          <p className="text-sm font-semibold mb-4">Escaneie o QR Code com seu WhatsApp</p>
          <div className="h-64 w-64 mx-auto bg-muted rounded-lg flex items-center justify-center border border-border">
            <div className="text-center">
              <QrCode className="h-16 w-16 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">QR Code aparecerá aqui</p>
              <p className="text-[10px] text-muted-foreground mt-1">Aguardando VPS...</p>
            </div>
          </div>
        </Card>
      )}

      {/* Info */}
      <Card className="border bg-card p-5">
        <p className="text-xs font-semibold text-muted-foreground mb-2">ARQUITETURA</p>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>• Preparado para integração com VPS (Contabo + Baileys)</p>
          <p>• Funções: connect, disconnect, sendMessage, getConversations</p>
          <p>• Atualmente usando mock — sem conexão real</p>
          <p>• Quando o VPS estiver pronto, altere apenas <code className="bg-accent px-1 rounded">src/services/whatsapp.ts</code></p>
        </div>
      </Card>
    </div>
  );
}
