import type { MarketChartPoint } from "@/types/company";

/**
 * Generate a realistic-looking mock 24hr price chart based on a current price.
 * Produces a point every 15 minutes for the last 24 hours.
 */
export function generateMockChart(currentPrice: number): MarketChartPoint[] {
  const points: MarketChartPoint[] = [];
  const now = Date.now();
  const intervalMs = 15 * 60 * 1000;
  const totalPoints = 96; // 24h at 15min intervals

  let price = currentPrice * (0.97 + Math.random() * 0.03);

  for (let i = 0; i < totalPoints; i++) {
    const t = now - (totalPoints - i) * intervalMs;
    const drift = (Math.random() - 0.48) * currentPrice * 0.003;
    price = Math.max(price * 0.95, Math.min(price * 1.05, price + drift));
    points.push({
      time: new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      price: Math.round(price * 100) / 100,
      volume: Math.round(Math.random() * 1_000_000),
    });
  }

  // Make last point the actual current price
  if (points.length > 0) {
    points[points.length - 1].price = currentPrice;
  }

  return points;
}
