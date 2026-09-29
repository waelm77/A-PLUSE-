import type { ReactNode } from "react";

// Tiny safe renderer for the quiz markup and Unicode math runs:
//   **text** → bold
//   ##text## → red (e.g. keyword in a question)
//   ^text^   → superscript        (e.g. 10^-3^)
//   ~text~   → subscript          (e.g. H~2~O)
// All markers nest (##**مهم**## , ^~n~^ …). Literal Unicode super/subscripts
// (H₂O, 10⁻³, ², ₄ …) also render correctly. Renders plain React elements only
// — never dangerouslySetInnerHTML. Lone ^ / ~ / ** / ## (unpaired) stay as
// literal characters.

const SUPERSCRIPTS = new Set("⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿªº");
const SUBSCRIPTS = new Set("₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓ");

const RED = "#dc2626";

function wrapUnicodeRuns(seg: string, keyBase: { n: number }): ReactNode[] {
  const out: ReactNode[] = [];
  let run: string[] = [];
  let mode: "sup" | "sub" | null = null;

  const flushRun = () => {
    if (!run.length) return;
    const node = run.join("");
    if (mode === "sup") out.push(<sup key={`u${keyBase.n++}`}>{node}</sup>);
    else if (mode === "sub") out.push(<sub key={`u${keyBase.n++}`}>{node}</sub>);
    else out.push(<span key={`u${keyBase.n++}`}>{node}</span>);
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

/** Renders text into `out`, handling **…**, ##…##, ^…^ and ~…~ recursively. */
function renderFragment(text: string, out: ReactNode[], keyBase: { n: number }): void {
  let plain = "";

  const flush = () => {
    if (!plain) return;
    const parts = plain.split("\n");
    parts.forEach((seg, idx) => {
      if (idx > 0) out.push(<br key={`br-${keyBase.n++}`} />);
      if (seg) out.push(...wrapUnicodeRuns(seg, keyBase));
    });
    plain = "";
  };

  for (let i = 0; i < text.length; ) {
    if (text.startsWith("**", i) || text.startsWith("##", i)) {
      const marker = text.slice(i, i + 2);
      const end = text.indexOf(marker, i + 2);
      if (end === -1 || text.slice(i + 2, end).includes("\n")) {
        plain += marker[0];
        i += 1;
        continue;
      }
      flush();
      const inner: ReactNode[] = [];
      renderFragment(text.slice(i + 2, end), inner, keyBase);
      out.push(
        marker === "**" ? (
          <strong key={`b-${keyBase.n++}`}>{inner}</strong>
        ) : (
          <span key={`r-${keyBase.n++}`} style={{ color: RED }}>
            {inner}
          </span>
        )
      );
      i = end + 2;
      continue;
    }
    const ch = text[i]!;
    if (ch === "^" || ch === "~") {
      const end = text.indexOf(ch, i + 1);
      if (end === -1 || text.slice(i + 1, end).includes("\n")) {
        plain += ch;
        i += 1;
        continue;
      }
      flush();
      const inner: ReactNode[] = [];
      renderFragment(text.slice(i + 1, end), inner, keyBase);
      const Tag = ch === "~" ? "sub" : "sup";
      out.push(<Tag key={`m-${keyBase.n++}`}>{inner}</Tag>);
      i = end + 1;
      continue;
    }
    plain += ch;
    i += 1;
  }
  flush();
}

export default function RichText({ text }: { text: string }) {
  const out: ReactNode[] = [];
  renderFragment(text ?? "", out, { n: 0 });
  return <>{out}</>;
}