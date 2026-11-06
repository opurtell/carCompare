import type { ReactNode } from 'react';

export type MobileView = 'cars' | 'compare' | 'settings';

const ICON_PROPS = {
  className: 'w-6 h-6',
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

const ITEMS: { view: MobileView; label: string; icon: ReactNode }[] = [
  {
    view: 'cars',
    label: 'Cars',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M5 16V11l2-5h10l2 5v5M5 11h14M4 16h16v3h-3v-1H7v1H4z" />
        <path d="M7.5 13.5h.01M16.5 13.5h.01" />
      </svg>
    ),
  },
  {
    view: 'compare',
    label: 'Compare',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M5 20V12M12 20V5M19 20v-5" />
      </svg>
    ),
  },
  {
    view: 'settings',
    label: 'Settings',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </svg>
    ),
  },
];

interface MobileNavProps {
  view: MobileView;
  onChange: (view: MobileView) => void;
}

export function MobileNav({ view, onChange }: MobileNavProps) {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-20 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-3">
        {ITEMS.map(item => (
          <button
            key={item.view}
            type="button"
            onClick={() => onChange(item.view)}
            aria-current={view === item.view ? 'page' : undefined}
            className={`h-14 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
              view === item.view ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
