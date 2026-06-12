/**
 * SocialWidget — Social media & Google Business display
 * Shows profile stats, recent posts grid, and reviews summary
 */

import { Icons } from '../ui/Icons';

const cardStyle = {
  background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden',
};
const headerStyle = {
  padding: '16px 20px', borderBottom: '1px solid #f0f1f5',
  display: 'flex', alignItems: 'center', gap: 10,
};

function MetricCard({ label, value }) {
  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}

function StarRating({ rating }) {
  const full = Math.floor(rating || 0);
  const half = (rating || 0) - full >= 0.5;
  return (
    <span style={{ color: '#f59e0b', fontSize: '1rem', letterSpacing: 2 }}>
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
    </span>
  );
}

export default function SocialWidget({ data }) {
  if (!data) {
    return (
      <div style={{ ...cardStyle, padding: 32, textAlign: 'center', color: '#9ca3af' }}>
        <Icons.Heart />
        <p style={{ marginTop: 8 }}>Sin datos de redes sociales</p>
      </div>
    );
  }

  const { profile = {}, media = [], insights = {}, reviews = {} } = data;
  const isGoogle = profile.type === 'google_business';
  const statsColumns = isGoogle ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)';

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ec489912', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icons.Heart />
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{profile.name || 'Redes Sociales'}</div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{isGoogle ? 'Google Business' : 'Instagram'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: statsColumns, gap: 0, padding: '0 20px' }}>
        {isGoogle ? (
          <>
            <MetricCard label="Valoracion media" value={`${(reviews.averageRating ?? 0).toFixed(1)} / 5`} />
            <MetricCard label="Total resenas" value={(reviews.totalReviews ?? 0).toLocaleString()} />
            <MetricCard label="Visitas perfil" value={(insights.profileViews ?? 0).toLocaleString()} />
          </>
        ) : (
          <>
            <MetricCard label="Seguidores" value={(profile.followers ?? 0).toLocaleString()} />
            <MetricCard label="Publicaciones" value={(profile.mediaCount ?? 0).toLocaleString()} />
            <MetricCard label="Engagement" value={`${(insights.engagementRate ?? 0).toFixed(1)}%`} />
          </>
        )}
      </div>

      {media.length > 0 && (
        <div style={{ padding: '8px 20px 16px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Publicaciones recientes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {media.slice(0, 6).map((m, i) => (
              <div key={i} style={{ borderRadius: 8, overflow: 'hidden', background: '#f3f4f6', position: 'relative', aspectRatio: '1' }}>
                {m.thumbnail ? (
                  <img src={m.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.7rem' }}>
                    Sin imagen
                  </div>
                )}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                  padding: '12px 6px 4px', display: 'flex', gap: 8,
                  fontSize: '0.65rem', color: '#fff', fontWeight: 600,
                }}>
                  {m.likes != null && <span>♥ {m.likes}</span>}
                  {m.comments != null && <span>💬 {m.comments}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reviews.items?.length > 0 && (
        <div style={{ padding: '8px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280' }}>Resenas</div>
            {reviews.averageRating && <StarRating rating={reviews.averageRating} />}
          </div>
          {reviews.items.slice(0, 3).map((r, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: i < 2 ? '1px solid #f3f4f6' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ fontWeight: 600, color: '#374151' }}>{r.author || 'Anonimo'}</span>
                <StarRating rating={r.rating} />
              </div>
              {r.text && <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '4px 0 0', lineHeight: 1.4 }}>{r.text}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
