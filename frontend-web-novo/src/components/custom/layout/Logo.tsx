import React from 'react';

export interface LogoProps {
  className?: string;
  size?: number;
  variant?: 'horizontal' | 'compact' | 'symbol';
  themeMode?: 'light' | 'dark' | 'auto';
  showText?: boolean;
  showSlogan?: boolean;
  textClassName?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 36,
  variant = 'horizontal',
  themeMode = 'auto',
  showText = true,
  showSlogan = false,
  textClassName = '',
}) => {
  const isDarkTheme = themeMode === 'dark';

  const titleColorClass = isDarkTheme
    ? 'text-white'
    : 'text-slate-900 dark:text-white';

  const sloganColorClass = isDarkTheme
    ? 'text-slate-300'
    : 'text-slate-600 dark:text-slate-300';

  if (variant === 'symbol') {
    return (
      <svg
        viewBox="0 0 100 120"
        style={{ width: `${size}px`, height: 'auto' }}
        className={`flex-shrink-0 drop-shadow-sm transition-transform hover:scale-105 ${className}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left Avatar (Azul Profundo #1E3A8A) */}
        <circle cx="33" cy="18" r="16" fill="#1E3A8A" />
        <rect x="8" y="36" width="44" height="76" rx="14" fill="#1E3A8A" />

        {/* Right Avatar (Azul Médio #3B82F6) */}
        <circle cx="67" cy="18" r="16" fill="#3B82F6" />
        <rect x="48" y="36" width="44" height="76" rx="14" fill="#3B82F6" />

        {/* Central Overlap Blend */}
        <rect x="40" y="36" width="20" height="76" rx="10" fill="#2563EB" opacity="0.4" />

        {/* Central White Clock Dial */}
        <circle cx="50" cy="74" r="31" fill="#FFFFFF" />

        {/* Green Center Hub (#10B981) */}
        <circle cx="50" cy="74" r="8" fill="#10B981" />

        {/* Clock Hands (Navy Blue #1E3A8A) */}
        <path d="M 50 74 L 66 55" stroke="#1E3A8A" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 50 74 L 74 85" stroke="#1E3A8A" strokeWidth="3.5" strokeLinecap="round" />

        {/* Center Pivot Dot */}
        <circle cx="50" cy="74" r="2.5" fill="#1E3A8A" />
      </svg>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex flex-col items-center text-center gap-1.5 ${className}`}>
        <svg
          viewBox="0 0 100 120"
          style={{ width: `${size}px`, height: 'auto' }}
          className="flex-shrink-0 drop-shadow-sm"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="33" cy="18" r="16" fill="#1E3A8A" />
          <rect x="8" y="36" width="44" height="76" rx="14" fill="#1E3A8A" />
          <circle cx="67" cy="18" r="16" fill="#3B82F6" />
          <rect x="48" y="36" width="44" height="76" rx="14" fill="#3B82F6" />
          <rect x="40" y="36" width="20" height="76" rx="10" fill="#2563EB" opacity="0.4" />
          <circle cx="50" cy="74" r="31" fill="#FFFFFF" />
          <circle cx="50" cy="74" r="8" fill="#10B981" />
          <path d="M 50 74 L 66 55" stroke="#1E3A8A" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 50 74 L 74 85" stroke="#1E3A8A" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="50" cy="74" r="2.5" fill="#1E3A8A" />
        </svg>

        <div className="flex flex-col items-center">
          <span className={`font-bold text-base leading-tight tracking-tight ${titleColorClass} ${textClassName}`}>
            Tempo de Projetos
          </span>
          {showSlogan && (
            <span className={`text-[10px] font-medium tracking-normal mt-0.5 ${sloganColorClass}`}>
              Gestão colaborativa de tempo e trabalho.
            </span>
          )}
        </div>
      </div>
    );
  }

  // Default: Horizontal Variant
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 100 120"
        style={{ width: `${size}px`, height: 'auto' }}
        className="flex-shrink-0 drop-shadow-sm transition-transform hover:scale-105"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="33" cy="18" r="16" fill="#1E3A8A" />
        <rect x="8" y="36" width="44" height="76" rx="14" fill="#1E3A8A" />
        <circle cx="67" cy="18" r="16" fill="#3B82F6" />
        <rect x="48" y="36" width="44" height="76" rx="14" fill="#3B82F6" />
        <rect x="40" y="36" width="20" height="76" rx="10" fill="#2563EB" opacity="0.4" />
        <circle cx="50" cy="74" r="31" fill="#FFFFFF" />
        <circle cx="50" cy="74" r="8" fill="#10B981" />
        <path d="M 50 74 L 66 55" stroke="#1E3A8A" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 50 74 L 74 85" stroke="#1E3A8A" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="50" cy="74" r="2.5" fill="#1E3A8A" />
      </svg>

      {showText && (
        <div className="flex flex-col text-left">
          <span className={`font-bold text-lg leading-tight tracking-tight ${titleColorClass} ${textClassName}`}>
            Tempo de Projetos
          </span>
          {showSlogan ? (
            <span className={`text-[11px] font-medium tracking-tight ${sloganColorClass}`}>
              Gestão colaborativa de tempo e trabalho.
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase">
              Gestão & Trabalho
            </span>
          )}
        </div>
      )}
    </div>
  );
};
