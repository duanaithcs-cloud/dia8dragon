import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Giữ focus trong hộp thoại, hỗ trợ Esc và trả focus về phần tử đã mở hộp thoại.
 * Hook chỉ đăng ký một lần; callback đóng luôn được cập nhật qua ref để tránh reset focus mỗi render.
 */
export const useDialogFocus = <T extends HTMLElement>(onClose?: () => void) => {
  const ref = useRef<T>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = ref.current;
    if (!dialog) return;

    dialog.setAttribute('role', dialog.getAttribute('role') || 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');

    const getFocusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter(element => !element.hasAttribute('disabled') && element.offsetParent !== null);

    const frame = window.requestAnimationFrame(() => {
      (getFocusable()[0] || dialog).focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeRef.current) {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      dialog.removeEventListener('keydown', handleKeyDown);
      const target = previousFocus.current;
      if (target?.isConnected) target.focus({ preventScroll: true });
    };
  }, []);

  return ref;
};
