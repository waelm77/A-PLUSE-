import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import RichText from "@/components/RichText";

/**
 * WYSIWYG text field: the formatted result (bold **…**, red ##…##, super/sub
 * scripts, Unicode math runs) is ALWAYS shown in the box — the same rendering
 * the student sees. The invisible native input keeps the real editing surface
 * untouched (paste handlers, controlled value, selection), and the overlay:
 *   • highlights the current selection (amber) so the B / red-A toolbar shows
 *     exactly what will be wrapped,
 *   • draws a synthetic caret when the selection is collapsed,
 *   • scrolls in sync with the input on long text.
 * B = عريض (**…**), red A = أحمر (##…##) — wrap the selection (or start a
 * fresh pair for the next typed word) and keep the wrapped text selected so
 * bold then red nest cleanly (##**كلمة**##).
 */
export default function MathTextInput({
  value,
  onChange,
  onPaste,
  placeholder,
  dir = "rtl",
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onPaste?: (e: ClipboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  dir?: string;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [sel, setSel] = useState<[number, number]>([0, 0]);
  const [scrollX, setScrollX] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const visual = value.trim().length > 0;

  const syncRange = (el: HTMLInputElement) => {
    setSel([el.selectionStart ?? 0, el.selectionEnd ?? 0]);
  };

  const handleScroll = (e: { currentTarget: HTMLInputElement }) => {
    const el = e.currentTarget;
    const rtl = el.matches(":dir(rtl)");
    setScrollX(rtl ? el.scrollLeft : -el.scrollLeft);
  };

  const wrapSelection = (marker: "**" | "##") => {
    const input = inputRef.current;
    if (!input) return;
    const raw = input.value;
    let s = input.selectionStart ?? raw.length;
    let e = input.selectionEnd ?? raw.length;
    if (s > e) [s, e] = [e, s];
    const selected = raw.slice(s, e);

    if (raw.slice(Math.max(0, s - 2), s) === marker && raw.slice(e, e + 2) === marker) {
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(s, e);
      });
      return;
    }
    const wrapped =
      selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= marker.length * 2;
    if (wrapped) {
      const inner = selected.slice(marker.length, -marker.length);
      onChange(raw.slice(0, s) + inner + raw.slice(e));
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(s, s + inner.length);
      });
      return;
    }
    onChange(raw.slice(0, s) + marker + selected + marker + raw.slice(e));
    const anchor = s + marker.length;
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(anchor, anchor + selected.length);
    });
  };

  const toolButton =
    "flex h-5 w-6 items-center justify-center rounded border bg-background px-1 text-[11px] leading-none font-black shadow-sm";

  const s = Math.min(sel[0], sel[1]);
  const e = Math.max(sel[0], sel[1]);
  const prefix = value.slice(0, s);
  const selectedText = value.slice(s, e);
  const suffix = value.slice(e);

  return (
    <div className="relative min-w-0 flex-1">
      {focused && (
        <div className="absolute -top-5 left-1 z-20 flex items-center gap-1">
          <button
            type="button"
            className={toolButton}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => wrapSelection("**")}
            title="خط عريض — **كلمة**"
            aria-label="خط عريض"
          >
            B
          </button>
          <button
            type="button"
            className={toolButton}
            style={{ color: "#dc2626" }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => wrapSelection("##")}
            title="لون أحمر — ##كلمة##"
            aria-label="لون أحمر"
          >
            A
          </button>
        </div>
      )}
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onPaste}
        onFocus={(e) => {
          setFocused(true);
          syncRange(e.currentTarget);
        }}
        onBlur={() => setFocused(false)}
        onSelect={(e) => syncRange(e.currentTarget)}
        onKeyUp={(e: KeyboardEvent<HTMLInputElement>) => syncRange(e.currentTarget)}
        onScroll={handleScroll}
        placeholder={placeholder}
        dir={dir}
        autoFocus={autoFocus}
        className={visual ? "text-transparent caret-transparent" : ""}
      />
      {visual && (
        <div
          dir="auto"
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 left-3 flex items-center overflow-hidden whitespace-nowrap text-base md:text-sm"
        >
          <span className="whitespace-nowrap" style={{ transform: `translateX(${scrollX}px)` }}>
            {prefix && <RichText text={prefix} />}
            {selectedText && (
              <mark className="rounded bg-amber-200/70 text-inherit dark:bg-amber-200/40">
                <RichText text={selectedText} />
              </mark>
            )}
            {focused && s === e && (
              <span className="inline-block h-[1.1em] w-[2px] translate-y-[0.15em] rounded-full bg-blue-500/90" />
            )}
            {suffix && <RichText text={suffix} />}
          </span>
        </div>
      )}
    </div>
  );
}