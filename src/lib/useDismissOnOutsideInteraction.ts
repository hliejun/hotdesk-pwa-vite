import { useEffect } from "react";
import type { RefObject } from "react";

function isEventInsideAnyRef(
  target: EventTarget | null,
  refs: Array<RefObject<HTMLElement | null>>,
) {
  if (!target || !(target instanceof Node)) return false;
  return refs.some((ref) => {
    const el = ref.current;
    return !!el && (el === target || el.contains(target));
  });
}

/**
 * Dismisses an "open" UI (menu/modal/popover) when the user interacts outside it.
 *
 * It listens for:
 * - `pointerdown` outside the referenced elements
 * - `focusin` outside the referenced elements
 *
 * Both listeners run in capture phase so they can catch events before internal
 * handlers change DOM state.
 */
export function useDismissOnOutsideInteraction(
  open: boolean,
  refs: Array<RefObject<HTMLElement | null>>,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!open) return;

    const onPointerDownCapture = (e: PointerEvent) => {
      if (isEventInsideAnyRef(e.target, refs)) return;
      onDismiss();
    };

    const onFocusInCapture = (e: FocusEvent) => {
      if (isEventInsideAnyRef(e.target, refs)) return;
      onDismiss();
    };

    document.addEventListener("pointerdown", onPointerDownCapture, true);
    document.addEventListener("focusin", onFocusInCapture, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
      document.removeEventListener("focusin", onFocusInCapture, true);
    };
  }, [onDismiss, open, refs]);
}
