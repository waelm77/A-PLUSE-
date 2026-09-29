import { useRef, useState, type ClipboardEvent } from "react";
import { Input } from "@/components/ui/input";
import RichText from "@/components/RichText";

/**
 * Text field that shows the RAW markup only while focused for editing, and
 * otherwise renders a REAL formatted preview in the field itself (superscripts
 * raised, subscripts lowered, bold **…**, red ##…##, Unicode math runs styled).
 * While editing, two quick-format buttons (B = عريض, red A = أحمر) wrap the
 * current selection with the matching markers — or place the caret between a
 * fresh pair of markers if nothing is selected.
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
  const inputRef = useRef<HTMLInputElement>(null);
  const showPreview = !focused && value.trim().length > 0;

  const wrapSelection = (marker: "**" | "##") => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    const sel = value.slice(start, end);
    onChange(value.slice(0, start) + marker + sel + marker + value.slice(end));
    const caret = start + marker.length + sel.length;
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(caret, caret);
    });
  };

  const toolButton =
    "flex h-5 w-6 items-center justify-center rounded border bg-background px-1 text-[11px] leading-none font-black shadow-sm";

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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        dir={dir}
        autoFocus={autoFocus}
        className={showPreview ? "text-transparent" : ""}
      />
      {showPreview && (
        <div
          dir="auto"
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 left-3 flex items-center overflow-hidden whitespace-nowrap text-base md:text-sm"
        >
          <RichText text={value} />
        </div>
      )}
    </div>
  );
}