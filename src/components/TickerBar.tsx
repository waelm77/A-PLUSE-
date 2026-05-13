import { useEffect, useState } from "react";
import { getTicker } from "@/services/firestore";
import type { Ticker } from "@/types";

export default function TickerBar() {
  const [ticker, setTicker] = useState<Ticker | null>(null);

  useEffect(() => {
    getTicker().then(setTicker).catch(() => {});
  }, []);

  if (!ticker || !ticker.active || !ticker.text.trim()) return null;

  return (
    <div
      className="overflow-hidden whitespace-nowrap rounded-lg py-2 px-4 text-sm font-medium"
      style={{ backgroundColor: ticker.color + "20", color: ticker.color, border: `1px solid ${ticker.color}40` }}
    >
      <div className="animate-marquee inline-block" style={{ animation: `marquee 20s linear infinite` }}>
        {ticker.text}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}