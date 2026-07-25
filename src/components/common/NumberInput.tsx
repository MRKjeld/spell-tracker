import { useEffect, useState } from 'react';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  id?: string;
  className?: string;
  autoFocus?: boolean;
}

// A plain `<input type="number" value={value} onChange={... Number(e.target.value)}>`
// forces the DOM back to a numeric string on every keystroke. Clearing the
// field re-renders it as "0" (since Number('') is 0), and the next digit the
// player types lands after that stray zero — "6" becomes "06". Tracking the
// raw text locally lets the field sit empty (or mid-edit) without a forced
// round-trip through Number(), only reconciling to a valid number on blur.
export function NumberInput({ value, onChange, min, max, id, className, autoFocus }: NumberInputProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit(raw: string) {
    const parsed = Number(raw);
    if (raw.trim() === '' || Number.isNaN(parsed)) {
      setText(String(value));
      return;
    }
    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    setText(String(next));
    if (next !== value) onChange(next);
  }

  return (
    <input
      id={id}
      className={className}
      type="number"
      min={min}
      max={max}
      value={text}
      autoFocus={autoFocus}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const parsed = Number(raw);
        if (raw.trim() !== '' && !Number.isNaN(parsed)) onChange(parsed);
      }}
      onBlur={(e) => commit(e.target.value)}
    />
  );
}
