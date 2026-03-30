import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Wifi, WifiOff, QrCode, RefreshCw, type LucideIcon } from "lucide-react";
import { whatsappService } from "@/services/whatsapp";
import { toast } from "sonner";
import type { WhatsAppStatus } from "@/types/crm";
import { CrmPageHeader } from "@/components/crm/CrmPageHeader";
import { CrmStateCard } from "@/components/crm/CrmStateCard";

const statusConfig: Record<WhatsAppStatus, { label: string; color: string; icon: LucideIcon }> = {
  disconnected: { label: "Desconectado", color: "text-red-400", icon: WifiOff },
  connecting: { label: "Conectando...", color: "text-yellow-400", icon: RefreshCw },
  qr_ready: { label: "QR Code Pronto", color: "text-blue-400", icon: QrCode },
  connected: { label: "Conectado", color: "text-green-400", icon: Wifi },
};

export function CrmWhatsAppPage() {
  const [status, setStatus] = useState<WhatsAppStatus>("disconnected");
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrVersion, setQrVersion] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);

  async function refreshStatus() {
    try {
      const s = await whatsappService.getStatus();
      const nextStatus: WhatsAppStatus =
        typeof s === "string"
          ? s
          : s?.status || "disconnected";

      setStatus(nextStatus);
      setLastSyncAt(new Date().toISOString());
      setServiceError(null);

      if (nextStatus === "qr_ready") {
        setQrUrl(`${whatsappService.getQrImage()}?t=${Date.now()}&v=${qrVersion}`);
      } else {
        setQrUrl(null);
      }
    } catch (e) {
      setStatus("disconnected");
      setQrUrl(null);
      setServiceError(e instanceof Error ? e.message : "Erro ao consultar serviço");
    }
  }

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, [qrVersion]);

  async function handleConnect() {
    setLoading(true);
    try {
      await whatsappService.connect();
      setQrVersion((v) => v + 1);
      toast.success("Solicitação de conexão enviada");
      await refreshStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao conectar");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    try {
      await whatsappService.disconnect();
      setQrUrl(null);
      toast.success("Desconectado");
      await refreshStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao desconectar");
    } finally {
      setLoading(false);
    }
  }

  const cfg = statusConfig[status] ?? statusConfig.disconnected;
  const StatusIcon = cfg.icon ?? WifiOff;

  return (
    <div className="space-y-6 fade-up max-w-3xl">
      <CrmPageHeader title="WhatsApp" description="Gerenciar conexão com WhatsApp Business" />

      {serviceError && (
        <CrmStateCard
          tone="error"
          message={`Falha ao consultar serviço: ${serviceError}`}
          className="p-4 text-sm"
        />
      )}

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
            <p className="text-xs text-muted-foreground mt-1">
              Última sincronização: {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString("pt-BR") : "—"}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshStatus} disabled={loading} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Atualizar
            </Button>
            {(status === "disconnected" || status === "qr_ready") && (
              <Button onClick={handleConnect} disabled={loading} className="gap-2">
                <QrCode className="h-4 w-4" />
                {loading ? "Conectando..." : "Conectar"}
              </Button>
            )}

            {status === "connected" && (
              <Button
                onClick={handleDisconnect}
                disabled={loading}
                variant="destructive"
                className="gap-2"
              >
                <WifiOff className="h-4 w-4" />
                {loading ? "Desconectando..." : "Desconectar"}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {status === "qr_ready" && (
        <Card className="border bg-card p-6 text-center">
          <p className="text-sm font-semibold mb-4">Escaneie o QR Code com seu WhatsApp</p>

          <div className="h-64 w-64 mx-auto bg-white rounded-lg flex items-center justify-center border border-border overflow-hidden p-3">
            {qrUrl ? (
              <iframe src={qrUrl} title="QR Code WhatsApp" className="w-full h-full border-0 rounded" />
            ) : (
              <div className="text-center">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-spin" />
                <p className="text-xs text-muted-foreground">Carregando QR...</p>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-4">Abra o WhatsApp no celular → Aparelhos conectados → Conectar aparelho</p>
        </Card>
      )}
    </div>
  );
}
