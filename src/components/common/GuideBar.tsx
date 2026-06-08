import { useState } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useDark } from '../../store/themeStore';
import { useSettingsStore } from '../../store/settingsStore';

export interface GuideBarProps {
  id: string;
  icon?: ReactNode;
  title: string;
  body: string;
  type?: 'tip' | 'warning' | 'info';
  action?: { label: string; onClick: () => void };
}

const STORAGE_KEY = 'nelka_dismissed_guides';

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function addDismissed(id: string) {
  const list = getDismissed();
  if (!list.includes(id)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...list, id]));
  }
}

export function GuideBar({ id, icon, title, body, type = 'tip', action }: GuideBarProps) {
  const dark = useDark();
  const { showTooltips } = useSettingsStore();
  const [dismissed, setDismissed] = useState(() => getDismissed().includes(id));

  if (!showTooltips || dismissed) return null;

  const colors = {
    tip: {
      bg: dark ? 'rgba(251,146,60,0.12)' : '#fff7ed',
      border: dark ? 'rgba(251,146,60,0.3)' : '#fed7aa',
      text: dark ? '#fb923c' : '#c2410c',
      icon: dark ? '#fb923c' : '#ea580c',
    },
    warning: {
      bg: dark ? 'rgba(251,191,36,0.12)' : '#fffbeb',
      border: dark ? 'rgba(251,191,36,0.3)' : '#fde68a',
      text: dark ? '#fbbf24' : '#92400e',
      icon: dark ? '#fbbf24' : '#d97706',
    },
    info: {
      bg: dark ? 'rgba(59,130,246,0.12)' : '#eff6ff',
      border: dark ? 'rgba(59,130,246,0.3)' : '#bfdbfe',
      text: dark ? '#60a5fa' : '#1e40af',
      icon: dark ? '#60a5fa' : '#2563eb',
    },
  }[type];

  const handleDismiss = () => {
    addDismissed(id);
    setDismissed(true);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '12px 16px',
      borderRadius: 10,
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      marginBottom: 16,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {icon && (
        <span style={{ color: colors.icon, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.6)' : '#6b7280', lineHeight: 1.5 }}>{body}</div>
        {action && (
          <button
            onClick={action.onClick}
            style={{
              marginTop: 8,
              fontSize: 12,
              fontWeight: 600,
              color: colors.text,
              background: 'none',
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              padding: '3px 10px',
              cursor: 'pointer',
            }}
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        onClick={handleDismiss}
        title="Zavrieť"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: dark ? 'rgba(255,255,255,0.3)' : '#9ca3af',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
