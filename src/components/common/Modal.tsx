import type { CSSProperties, ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  accentColor?: string;
}

export function Modal({ title, onClose, children, accentColor }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={accentColor ? 'modal modal-themed' : 'modal'}
        style={accentColor ? ({ '--modal-accent': accentColor } as CSSProperties) : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
