import { Icons } from '../components/ui/Icons';

const keyframes = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.08); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

export function ProcessingScreen({ stage, steps = [] }) {
  const lastStep = steps.length > 0 ? steps[steps.length - 1] : null;
  const percent = lastStep?.percent || 0;

  return (
    <>
      <style>{keyframes}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #312e81 0%, #4338ca 40%, #2a7d54 100%)',
          zIndex: 50,
        }}
      >
        {/* Subtle decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-5%',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-15%',
            left: '-8%',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 480,
            width: '100%',
            padding: '0 24px',
          }}
        >
          {/* Animated spinner area */}
          <div
            style={{
              position: 'relative',
              width: 96,
              height: 96,
              marginBottom: 32,
            }}
          >
            {/* Outer spinning ring */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '3px solid rgba(255,255,255,0.15)',
                borderTopColor: 'rgba(255,255,255,0.9)',
                animation: 'spin 1.2s linear infinite',
              }}
            />
            {/* Inner pulsing circle with icon */}
            <div
              style={{
                position: 'absolute',
                inset: 12,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            >
              <Icons.Sparkles />
            </div>
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 8px 0',
              letterSpacing: '-0.02em',
              textAlign: 'center',
            }}
          >
            La IA esta trabajando...
          </h2>
          <p
            style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.6)',
              margin: '0 0 32px 0',
              textAlign: 'center',
            }}
          >
            Generando tu propuesta comercial
          </p>

          {/* Progress bar */}
          <div
            style={{
              width: '100%',
              height: 6,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.15)',
              marginBottom: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 3,
                background: 'linear-gradient(90deg, #c5dece, #e0e7ff)',
                width: `${percent}%`,
                transition: 'width 0.5s ease',
                backgroundSize: '200% 100%',
                animation: percent > 0 && percent < 100 ? 'shimmer 2s linear infinite' : 'none',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 28,
              alignSelf: 'flex-end',
            }}
          >
            {percent}%
          </span>

          {/* Step-by-step progress indicators */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}
          >
            {steps.length === 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '12px 0',
                  animation: 'fadeInUp 0.3s ease',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#ffffff',
                    flexShrink: 0,
                  }}
                >
                  1
                </div>
                <span
                  style={{
                    fontSize: 15,
                    color: 'rgba(255,255,255,0.85)',
                    paddingTop: 4,
                  }}
                >
                  Iniciando...
                </span>
              </div>
            )}

            {steps.map((s, i) => {
              const isLast = i === steps.length - 1;
              const isDone = !isLast || s.step === 'done';

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '10px 0',
                    animation: 'fadeInUp 0.35s ease',
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  }}
                >
                  {/* Step icon */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: isDone
                        ? 'rgba(167,243,208,0.25)'
                        : 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 600,
                      color: isDone ? '#6ee7b7' : '#ffffff',
                      flexShrink: 0,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {isDone ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>

                  {/* Step content */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      paddingTop: 3,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        color: isDone
                          ? 'rgba(255,255,255,0.55)'
                          : 'rgba(255,255,255,0.9)',
                        fontWeight: isDone ? 400 : 500,
                        transition: 'color 0.3s ease',
                      }}
                    >
                      {s.message}
                    </span>
                    {s.details && (
                      <span
                        style={{
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.4)',
                        }}
                      >
                        {s.details.materials} materiales &middot; {s.details.purchases} compras &middot; {s.details.preferences} preferencias
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export default ProcessingScreen;
