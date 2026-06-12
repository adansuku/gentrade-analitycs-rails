import { useState, useEffect, useRef } from 'react';
import { Icons } from '../../ui/Icons';
import { tokens } from './tokens';

function useIsNarrow(breakpoint = tokens.breakpoint) {
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isNarrow;
}

export default function WorkspaceLayout({ topbar, sidebar, children }) {
  const isNarrow = useIsNarrow();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  useEffect(() => {
    if (!isNarrow) setDrawerOpen(false);
  }, [isNarrow]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: tokens.canvas,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          height: tokens.topbarHeight,
          background: tokens.surface,
          borderBottom: `1px solid ${tokens.border}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 12,
        }}
      >
        {isNarrow && (
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setDrawerOpen((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              background: 'transparent',
              border: `1px solid ${tokens.border}`,
              borderRadius: tokens.radius.sm,
              color: tokens.ink,
              cursor: 'pointer',
            }}
          >
            <Icons.Menu />
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>{topbar}</div>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {!isNarrow && sidebar}

        {isNarrow && drawerOpen && (
          <>
            <div
              onClick={() => setDrawerOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(28,25,23,0.35)',
                zIndex: 30,
              }}
            />
            <div
              ref={drawerRef}
              style={{
                position: 'fixed',
                top: 0,
                bottom: 0,
                left: 0,
                width: tokens.sidebarWidth,
                zIndex: 31,
                boxShadow: '0 10px 40px rgba(28,25,23,0.18)',
              }}
            >
              {sidebar}
            </div>
          </>
        )}

        <main
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: tokens.mainMaxWidth,
              margin: '0 auto',
              padding: isNarrow ? '20px 16px 48px' : '28px 32px 64px',
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
