// Robuste Konvertierung DB-Format YYMMDDHHMM (Europe/Berlin) -> ISO mit Offset.
// z.B. "2410021305" = 02.10.2024 13:05 Berliner Zeit.

function isDstBerlin(year: number, month: number, day: number, hour: number): boolean {
  // EU-Regel: Sommerzeit vom letzten Sonntag im März (02:00 UTC -> 03:00) bis
  // zum letzten Sonntag im Oktober (03:00 -> 02:00).
  // Vereinfacht auf lokale Berliner Zeit evaluiert - ausreichend für Fahrplandaten.
  const lastSunday = (y: number, m: number): number => {
    // letzter Tag des Monats, dann zurück zum Sonntag
    const last = new Date(Date.UTC(y, m, 0));
    const dow = last.getUTCDay();
    return last.getUTCDate() - dow;
  };
  if (month > 3 && month < 10) return true;
  if (month < 3 || month > 10) return false;
  if (month === 3) {
    const ls = lastSunday(year, 3);
    if (day > ls) return true;
    if (day < ls) return false;
    return hour >= 2; // Umschaltung ~02:00
  }
  // Oktober
  const ls = lastSunday(year, 10);
  if (day < ls) return true;
  if (day > ls) return false;
  return hour < 3;
}

export function parseDbTime(ts: string | number | undefined | null): string | null {
  if (ts === undefined || ts === null) return null;
  const s = String(ts).trim();
  if (!/^\d{10}$/.test(s)) return null;
  const yy = Number(s.slice(0, 2));
  const MM = Number(s.slice(2, 4));
  const dd = Number(s.slice(4, 6));
  const HH = Number(s.slice(6, 8));
  const mm = Number(s.slice(8, 10));
  if (MM < 1 || MM > 12 || dd < 1 || dd > 31 || HH > 23 || mm > 59) return null;
  const year = 2000 + yy;
  const dst = isDstBerlin(year, MM, dd, HH);
  const offset = dst ? "+02:00" : "+01:00";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(MM)}-${pad(dd)}T${pad(HH)}:${pad(mm)}:00${offset}`;
}

export function diffMinutes(aIso: string | null, bIso: string | null): number | null {
  if (!aIso || !bIso) return null;
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 60000);
}
