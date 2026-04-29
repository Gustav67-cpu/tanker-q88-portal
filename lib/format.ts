export function fmtDwt(d: number | null | undefined): string {
  if (d == null) return "—";
  return `${Math.round(d).toLocaleString()} DWT`;
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  // Accept either YYYY-MM-DD or full ISO. Always render YYYY-MM-DD locally.
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fmtNumber(n: number | null | undefined, suffix = ""): string {
  if (n == null) return "—";
  return `${n.toLocaleString()}${suffix}`;
}
