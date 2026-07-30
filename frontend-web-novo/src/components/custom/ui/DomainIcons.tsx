import React from 'react';

interface DomainIconProps {
  className?: string;
  size?: number;
  color?: string;
}

/**
 * Ícone 1: Projetos / Atividades (Bloco/card de tarefa organizada)
 */
export const ProjectTaskIcon: React.FC<DomainIconProps> = ({
  className = '',
  size = 24,
  color = '#1E3A8A',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="3" y="4" width="18" height="16" rx="3" stroke={color} strokeWidth="2" />
    <path d="M7 8H17" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M7 12H13" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <rect x="15" y="11" width="2" height="2" rx="0.5" fill="#10B981" />
    <path d="M7 16H10" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * Ícone 2: Pessoas / Equipe (Rede de colaboração amigável)
 */
export const CollaborationNetworkIcon: React.FC<DomainIconProps> = ({
  className = '',
  size = 24,
  color = '#3B82F6',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Person 1 */}
    <circle cx="7" cy="7" r="3" fill="#1E3A8A" />
    <path d="M3 16C3 14 4.5 13 7 13C9.5 13 11 14 11 16" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" />

    {/* Person 2 */}
    <circle cx="17" cy="7" r="3" fill={color} />
    <path d="M13 16C13 14 14.5 13 17 13C19.5 13 21 14 21 16" stroke={color} strokeWidth="2" strokeLinecap="round" />

    {/* Connecting Collaboration Node */}
    <path d="M9.5 9.5L14.5 9.5" stroke="#10B981" strokeWidth="2" strokeDasharray="2 2" />
    <circle cx="12" cy="9.5" r="2" fill="#10B981" />
  </svg>
);

/**
 * Ícone 3: Tempo / Esforço (Barra de progresso e etapas - NÃO relógio burocrático)
 */
export const ProgressEffortIcon: React.FC<DomainIconProps> = ({
  className = '',
  size = 24,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Base Progress Track */}
    <rect x="3" y="10" width="18" height="4" rx="2" fill="#E2E8F0" />
    {/* Active Effort Fill */}
    <rect x="3" y="10" width="13" height="4" rx="2" fill="#3B82F6" />
    
    {/* Stage Nodes */}
    <circle cx="5" cy="12" r="3" fill="#1E3A8A" stroke="#FFFFFF" strokeWidth="1" />
    <circle cx="12" cy="12" r="3" fill="#10B981" stroke="#FFFFFF" strokeWidth="1" />
    <circle cx="19" cy="12" r="3" fill="#94A3B8" stroke="#FFFFFF" strokeWidth="1" />

    {/* Step Markers */}
    <path d="M5 6V8" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 6V8" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
    <path d="M19 6V8" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * Ícone 4: Entregas / Resultados (Marco com check de sucesso #10B981)
 */
export const MilestoneDeliveryIcon: React.FC<DomainIconProps> = ({
  className = '',
  size = 24,
  color = '#10B981',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M4 21V4" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 5L17 5C19 5 19 8 17 9L4 12" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
    <circle cx="12" cy="8.5" r="2.5" fill={color} />
    <path d="M10.5 8.5L11.5 9.5L13.5 7.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Ícone 5: Configurações / Organização (Engrenagem harmonizada)
 */
export const HarmonizedSettingsIcon: React.FC<DomainIconProps> = ({
  className = '',
  size = 24,
  color = '#6B7280',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
    <path
      d="M12 2V4M12 20V22M2 12H4M20 12H22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M4.93 19.07L6.34 17.66M17.66 6.34L19.07 4.93"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);
