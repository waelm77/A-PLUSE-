import type { ReactNode } from "react";

// Tiny safe renderer for the quiz markup and Unicode math runs:
//   ^text^  →  superscript        (e.g. 10^-3^)
//   ~text~  →  subscript          (e.g. H~2~O)
// Literal Unicode super/subscripts (H₂O, 10⁻³, ², ₄ …) also render correctly.
// Renders plain React elements only — never dangerouslySetInnerHTML.
// Lone ^ or ~ (unpaired) stay as literal characters.

const SUPERSCRIPTS = new Set("⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿªº");
const SUBSCRIPTS = new Set("₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓ");

function wrapUnicodeRuns(seg: string, baseKey: number): ReactNode[] {
  const out: ReactNode[] = [];
  let run: string[] = [];
  let mode: "sup" | "sub" | null = null;
  let key = baseKey;

  const flushRun = () => {
    if (!run.length) return;
    if (mode === "sup") out.push(<sup key={`u${key++}`}>{run.join("")}</sup>);
    else if (mode === "sub") out.push(<sub key={`u${key++}`}>{run.join("")}</sub>);
    else out.push(<span key={`u${key++}`}>{run.join("")}</span>);
    run = [];
  };

  for (const ch of seg) {
    const next: "sup" | "sub" | null = SUPERSCRIPTS.has(ch)
      ? "sup"
      : SUBSCRIPTS.has(ch)
        ? "sub"
        : null;
    if (next !== mode) {
      flushRun();
      mode = next;
    }
    run.push(ch);
  }
  flushRun();
  return out;
}

function parseSegments(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let plain = "";

  const flush = () => {
    if (!plain) return;
    const parts = plain.split("\n");
    parts.forEach((seg, idx) => {
      if (idx > 0) out.push(<br key={`br-${out.length}`} />);
      if (seg) out.push(...wrapUnicodeRuns(seg, out.length));
    });
    plain = "";
  };

  for (let i = 0; i < text.length; ) {
    const ch = text[i]!;
    if (ch === "^" || ch === "~") {
      const end = text.indexOf(ch, i + 1);
      if (end === -1 || text.slice(i + 1, end).includes("\n")) {
        plain += ch;
        i += 1;
        continue;
      }
      flush();
      const content = text.slice(i + 1, end);
      const Tag = ch === "~" ? "sub" : "sup";
      out.push(<Tag key={`m-${out.length}`}>{content}</Tag>);
      i = end + 1;
      continue;
    }
    plain += ch;
    i += 1;
  }
  flush();
  return out;
}

export default function RichText({ text }: { text: string }) {
  return <>{parseSegments(text ?? "")}</>;
}