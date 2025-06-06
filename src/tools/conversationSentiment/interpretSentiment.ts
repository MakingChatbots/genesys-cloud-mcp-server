export function interpretSentiment(score?: number): string {
  if (score === undefined) return "Unknown";
  if (score > 55) return "Positive";
  if (score >= 20 && score <= 55) return "Slightly Positive";
  if (score > -20 && score < 20) return "Neutral";
  if (score >= -55 && score <= -20) return "Slightly Negative";
  return "Negative";
}
