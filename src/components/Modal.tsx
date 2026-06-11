"use client";

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import styles from '@/app/page.module.css';

interface ModalProps {
  onClose: () => void;
  labelledBy?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Accessible modal shell: dialog semantics, Escape to close, click outside
// to close, initial focus on the dialog, Tab cycle trapped inside, and
// focus restored to the trigger element on close
export default function Modal({ onClose, labelledBy, style, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(el => !el.hasAttribute('disabled'));
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={`${styles.modalContent} glass`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar ventana">
          <X size={20} aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
}
