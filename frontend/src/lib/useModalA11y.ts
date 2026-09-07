import { useEffect, useRef } from "react";

/* Shared modal behaviour: close on Esc, lock body scroll while open,
   move focus into the dialog on open and return it to the trigger on close.
   Keep it small — full focus-trap libraries are overkill here. */
export function useModalA11y(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Respect an existing autoFocus inside the dialog; otherwise focus the
    // first focusable element, or the dialog itself.
    const node = ref.current;
    if (node && !node.contains(document.activeElement)) {
      const focusables = node.querySelectorAll<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      );
      (focusables.length ? focusables[0] : node).focus?.();
    }

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      trigger?.focus?.();
    };
  }, [onClose]);

  return ref;
}
