import { useEffect, useRef } from 'react';

const ITEM_HEIGHT = 32;

interface ScrollPickerProps {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  label: string;
}

// An iOS-style scrollable number wheel: scroll (or click an item) to change
// the value. Used in place of a free-text field for dice notation.
export function ScrollPicker({ values, value, onChange, label }: ScrollPickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const settleTimeout = useRef<number | undefined>(undefined);
  const scrolledByClick = useRef(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const index = values.indexOf(value);
    if (index === -1) return;
    const target = index * ITEM_HEIGHT;
    if (Math.abs(track.scrollTop - target) > 1) {
      track.scrollTo({ top: target, behavior: scrolledByClick.current ? 'smooth' : 'auto' });
    }
    scrolledByClick.current = false;
  }, [value, values]);

  function handleScroll() {
    window.clearTimeout(settleTimeout.current);
    settleTimeout.current = window.setTimeout(() => {
      const track = trackRef.current;
      if (!track) return;
      const index = Math.round(track.scrollTop / ITEM_HEIGHT);
      const clamped = Math.min(Math.max(index, 0), values.length - 1);
      const next = values[clamped];
      if (next !== value) onChange(next);
    }, 100);
  }

  function selectValue(v: number) {
    scrolledByClick.current = true;
    onChange(v);
  }

  return (
    <div className="scroll-picker" role="listbox" aria-label={label}>
      <div className="scroll-picker-highlight" aria-hidden="true" />
      <div className="scroll-picker-track" ref={trackRef} onScroll={handleScroll}>
        <div className="scroll-picker-pad" aria-hidden="true" />
        {values.map((v) => (
          <button
            key={v}
            type="button"
            role="option"
            aria-selected={v === value}
            className={`scroll-picker-item${v === value ? ' scroll-picker-item-selected' : ''}`}
            onClick={() => selectValue(v)}
          >
            {v}
          </button>
        ))}
        <div className="scroll-picker-pad" aria-hidden="true" />
      </div>
    </div>
  );
}
