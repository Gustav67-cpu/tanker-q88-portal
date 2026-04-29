// Helpers for building wa.me deep links and the standard message bodies used
// throughout the app. Numbers are normalized to digits-only because wa.me
// requires E.164 without the leading "+".

export function normalizeWhatsAppNumber(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/[^\d]/g, "");
}

export function waLink(phone: string | null | undefined, message: string): string {
  const num = normalizeWhatsAppNumber(phone);
  const body = encodeURIComponent(message);
  return num ? `https://wa.me/${num}?text=${body}` : `https://wa.me/?text=${body}`;
}

export interface ShareVesselArgs {
  vesselName: string;
  dwt?: number | null;
  openingPort?: string | null;
  openingDate?: string | null;
  shareUrl: string;
}

export function shareVesselMessage(v: ShareVesselArgs): string {
  const dwt = v.dwt ? `${Math.round(v.dwt).toLocaleString()} DWT` : "DWT n/a";
  const port = v.openingPort ?? "TBN";
  const date = v.openingDate ?? "TBN";
  return `Open tanker: ${v.vesselName} / ${dwt} / Open ${port} ${date} / Details: ${v.shareUrl}`;
}

export interface ChartererToBrokerArgs {
  vesselName: string;
  cargo?: string | null;
  quantity?: string | null;
  loadPort?: string | null;
  dischargePort?: string | null;
  laycanFrom?: string | null;
  laycanTo?: string | null;
}

export function chartererToBrokerMessage(a: ChartererToBrokerArgs): string {
  const fmt = (s?: string | null) => s ?? "TBN";
  return (
    `Request for tanker ${a.vesselName}: ` +
    `cargo ${fmt(a.cargo)}, qty ${fmt(a.quantity)}, ` +
    `load ${fmt(a.loadPort)}, disch ${fmt(a.dischargePort)}, ` +
    `laycan ${fmt(a.laycanFrom)}–${fmt(a.laycanTo)}. Please handle through broker.`
  );
}

export function brokerToOwnerMessage(a: ChartererToBrokerArgs): string {
  const fmt = (s?: string | null) => s ?? "TBN";
  return (
    `Firm/indicative enquiry for ${a.vesselName}: ` +
    `cargo ${fmt(a.cargo)}, qty ${fmt(a.quantity)}, ` +
    `load ${fmt(a.loadPort)}, disch ${fmt(a.dischargePort)}, ` +
    `laycan ${fmt(a.laycanFrom)}–${fmt(a.laycanTo)}. ` +
    `Please revert with Owner's counter. Broker commission 2.5% from Owners' side.`
  );
}

export function publicShareUrl(token: string): string {
  const origin =
    process.env.EXPO_PUBLIC_PUBLIC_ORIGIN ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin.replace(/\/$/, "")}/v/${token}`;
}
