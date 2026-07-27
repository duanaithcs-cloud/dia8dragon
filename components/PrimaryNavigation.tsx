import React from 'react';

export type PrimaryDestination = 'LEARN' | 'PRACTICE' | 'ASSIGNMENTS' | 'DOCUMENTS' | 'PROFILE';

interface PrimaryNavigationProps {
  active: PrimaryDestination;
  onNavigate: (destination: PrimaryDestination) => void;
}

const NavIcon = ({ name }: { name: PrimaryDestination }) => {
  const common = { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'LEARN') return <svg {...common}><circle cx="8" cy="8" r="3"/><circle cx="16" cy="7" r="2.5"/><circle cx="13" cy="15" r="4"/><path d="M5 19c1-2 3-3 5-3M17 12c1.5.5 2.5 1.5 3 3"/></svg>;
  if (name === 'PRACTICE') return <svg {...common}><path d="M8 4h8M9 4v4l-4 8a3 3 0 0 0 2.7 4h8.6A3 3 0 0 0 19 16l-4-8V4"/><path d="M7 15h10"/></svg>;
  if (name === 'ASSIGNMENTS') return <svg {...common}><path d="M8 4h8l2 2v14H6V6z"/><path d="M9 3h6v4H9zM9 11h6M9 15h4"/></svg>;
  if (name === 'DOCUMENTS') return <svg {...common}><path d="M4 5a3 3 0 0 1 3-2h5v16H7a3 3 0 0 0-3 2z"/><path d="M20 5a3 3 0 0 0-3-2h-5v16h5a3 3 0 0 1 3 2z"/></svg>;
  return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
};

const items: Array<{ id: PrimaryDestination; label: string; shortLabel: string }> = [
  { id: 'LEARN', label: 'Học tập', shortLabel: 'Học' },
  { id: 'PRACTICE', label: 'Luyện tập', shortLabel: 'Luyện' },
  { id: 'ASSIGNMENTS', label: 'Bài giao', shortLabel: 'Bài' },
  { id: 'DOCUMENTS', label: 'Tài liệu', shortLabel: 'Tài liệu' },
  { id: 'PROFILE', label: 'Cá nhân', shortLabel: 'Cá nhân' },
];

const PrimaryNavigation: React.FC<PrimaryNavigationProps> = ({ active, onNavigate }) => (
  <nav className="primary-navigation" aria-label="Điều hướng chính học sinh">
    {items.map(item => (
      <button
        type="button"
        key={item.id}
        className={active === item.id ? 'is-active' : ''}
        aria-current={active === item.id ? 'page' : undefined}
        aria-label={item.label}
        onClick={() => onNavigate(item.id)}
      >
        <NavIcon name={item.id} />
        <span className="primary-navigation-label">{item.label}</span>
        <span className="primary-navigation-short" aria-hidden="true">{item.shortLabel}</span>
      </button>
    ))}
  </nav>
);

export default PrimaryNavigation;
