/** Flat drawn house for the lime hero cards (Home, login). Black + white on lime, Neobank style. Decorative. */
export function HouseIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 180" className={className} aria-hidden fill="none">
      {/* ground */}
      <ellipse cx="160" cy="168" rx="150" ry="12" fill="#121412" fillOpacity="0.12" />
      {/* trees */}
      <circle cx="46" cy="112" r="26" fill="#121412" />
      <circle cx="66" cy="96" r="20" fill="#2b2f2b" />
      <rect x="52" y="120" width="6" height="44" rx="3" fill="#121412" />
      <circle cx="276" cy="118" r="22" fill="#2b2f2b" />
      <rect x="273" y="128" width="6" height="36" rx="3" fill="#121412" />
      {/* house body */}
      <rect x="96" y="86" width="132" height="78" rx="6" fill="#ffffff" />
      {/* roof */}
      <path d="M84 92 L162 34 L240 92 Z" fill="#121412" />
      {/* chimney */}
      <rect x="196" y="48" width="14" height="26" rx="2" fill="#121412" />
      {/* door */}
      <rect x="150" y="122" width="26" height="42" rx="4" fill="#121412" />
      <circle cx="170" cy="144" r="2" fill="#c6f432" />
      {/* windows: lit */}
      <rect x="110" y="104" width="28" height="24" rx="4" fill="#121412" />
      <rect x="188" y="104" width="28" height="24" rx="4" fill="#121412" />
      <rect x="114" y="108" width="20" height="16" rx="2" fill="#c6f432" />
      <rect x="192" y="108" width="20" height="16" rx="2" fill="#c6f432" />
      {/* meter on the wall */}
      <rect x="232" y="118" width="16" height="22" rx="3" fill="#ffffff" stroke="#121412" strokeWidth="2" />
      <circle cx="240" cy="127" r="3" fill="#121412" />
    </svg>
  );
}
