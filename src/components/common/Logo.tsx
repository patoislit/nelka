interface LogoMarkProps { variant: 'mark'; size?: number; dark?: boolean; }
interface LogoFullProps { variant: 'full'; dark?: boolean; size?: number; }
type LogoProps = LogoMarkProps | LogoFullProps;

export function Logo(props: LogoProps) {
  const dark  = props.dark ?? false;
  const navy  = dark ? '#ffffff' : '#f97316';

  /* ── Mark: rounded square + serif N ──────────────────── */
  if (props.variant === 'mark') {
    const s = props.size ?? 32;
    return (
      <div style={{
        width: s, height: s, borderRadius: s * 0.22,
        background: dark ? 'rgba(255,255,255,0.1)' : '#f97316',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: s * 0.58,
          fontWeight: 700,
          color: dark ? '#f97316' : '#ffffff',
          lineHeight: 1,
          userSelect: 'none',
        }}>N</span>
      </div>
    );
  }

  /* ── Full logo: mark + "nelka" + subtitle ─────────────── */
  const sz = props.size ?? 100;

  return (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 0,
      userSelect: 'none',
    }}>
      {/* Big N mark */}
      <div style={{
        width: sz, height: sz, borderRadius: sz * 0.18,
        background: dark ? 'rgba(255,255,255,0.08)' : '#f97316',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: sz * 0.14,
        boxShadow: dark ? 'none' : '0 4px 20px rgba(249,115,22,0.35)',
      }}>
        <span style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: sz * 0.6,
          fontWeight: 700,
          color: dark ? '#ffffff' : '#ffffff',
          lineHeight: 1,
        }}>N</span>
      </div>

      {/* nelka */}
      <div style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        fontSize: sz * 0.44,
        fontWeight: 400,
        letterSpacing: sz * 0.025 + 'px',
        color: navy,
        lineHeight: 1,
        marginBottom: sz * 0.08,
      }}>
        nelka
      </div>

    </div>
  );
}
