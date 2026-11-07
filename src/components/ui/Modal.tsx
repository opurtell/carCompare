import { useEffect, useId, type ReactNode, type Ref } from 'react';

interface ModalProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** The scrolling body, for dialogs that move between views. */
  bodyRef?: Ref<HTMLDivElement>;
}

/** Bottom sheet on phones, centred dialog from `md` up. Closes on Escape or backdrop click. */
export function Modal({ title, onClose, children, footer, bodyRef }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full max-w-lg md:mx-4 flex flex-col
                   max-h-[92dvh] md:max-h-[85vh] pb-[env(safe-area-inset-bottom)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 pl-5 pr-3 py-2 md:py-3 border-b border-gray-200">
          <h2 id={titleId} className="text-lg font-semibold text-gray-800 flex items-center gap-2 min-w-0">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-11 h-11 md:w-8 md:h-8 shrink-0 text-gray-400 hover:text-gray-600 text-2xl md:text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>

        {footer}
      </div>
    </div>
  );
}
