import { useEffect, useRef, useState } from "react";
import { getTicker } from "@/services/firestore";
import type { Ticker as TickerType } from "@/types";

interface TickerBarProps {
  text?: string;
  color?: string;
  bgColor?: string;
  active?: boolean;
  speed?: number;
  fontSize?: string;
}

export default function TickerBar({ text, color, bgColor, active, speed, fontSize }: TickerBarProps) {
  const [globalTicker, setGlobalTicker] = useState<TickerType | null>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (text === undefined) {
      getTicker().then(setGlobalTicker).catch(() => {});
    }
  }, [text]);

  const ticker = text !== undefined
    ? { text, color: color || "#FFD700", bgColor: bgColor || "#1a1a2e", active: active !== false, speed: speed || 20, fontSize: fontSize || "14px" }
    : globalTicker;

  useEffect(() => {
    const inner = innerRef.current;
    const outer = outerRef.current;
    if (!inner || !outer || !ticker) return;
    if (!ticker.active || !ticker.text.trim()) return;

    const containerW = outer.offsetWidth;
    const textW = inner.offsetWidth;
    if (textW === 0 || containerW === 0) return;

    const totalDistance = containerW + textW;
    const durationMs = (ticker.speed || 20) * 1000;
    let startTime: number | null = null;
    let rafId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) % durationMs;
      const progress = elapsed / durationMs;
      inner.style.transform = `translate3d(${containerW - progress * totalDistance}px, 0, 0)`;
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [ticker?.text, ticker?.speed, ticker?.active]);

  if (!ticker || !ticker.active || !ticker.text.trim()) return null;

  return (
    <div
      ref={outerRef}
      className="overflow-hidden rounded-lg text-sm font-medium"
      style={{
        backgroundColor: ticker.bgColor || "#1a1a2e",
        color: ticker.color,
        border: `1px solid ${ticker.color}40`,
        fontSize: ticker.fontSize || "14px",
        padding: "0.5em 1em",
        lineHeight: 1.6,
      }}
    >
      <div ref={innerRef} className="inline-block whitespace-nowrap" dir="auto">
        {ticker.text}
      </div>
    </div>
  );
}
