export function interpretCallQuality(mos?: number): string {
  if (mos === undefined) return "Unknown";

  if (mos < 3.5) return "Poor";
  if (mos < 4.3) return "Acceptable";
  return "Excellent";
}
