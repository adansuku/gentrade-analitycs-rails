import { useState, useEffect } from 'react';
import { authFetch } from '../../lib/api';
import { API_BASE } from '../../lib/constants';
import tokens from './workspace/tokens';

function DataPreview({ data }) {
  const [expanded, setExpanded] = useState(false);
  const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const preview = json.length > 120 ? json.slice(0, 120) + '...' : json;

  return (
    <div>
      <pre
        onClick={() => setExpanded(!expanded)}
        style={{ margin: 0, fontSize: 11, color: tokens.inkSoft, cursor: 'pointer', whiteSpace: expanded ? 'pre-wrap' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxHeight: expanded ? 400 : 20, overflowY: expanded ? 'auto' : 'hidden', background: tokens.surfaceAlt, padding: `${tokens.space[1]}px ${tokens.space[2]}px`, borderRadius: tokens.radius.sm }}
      >
        {expanded ? json : preview}
      </pre>
    </div>
  );
}

export default function DataExplorer({ clientId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedInteg, setExpandedInteg] = useState(null);
  const [expandedCat, setExpandedCat] = useState(null);
  const [catData, setCatData] = useState(null);
  const [catLoading, setCatLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    authFetch(`${API_BASE}/api/clients/${clientId}/reports/explorer`)
      .then((r) => r.json())
      .then((d) => setSummary(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  const loadCategoryData = async (integrationId, category, p = 1) => {
    setCatLoading(true);
    setPage(p);
    try {
      const r = await authFetch(`${API_BASE}/api/clients/${clientId}/reports/explorer/${integrationId}?category=${category}&page=${p}&limit=10`);
      setCatData(await r.json());
    } catch {} finally { setCatLoading(false); }
  };

  const handleExpandInteg = (integId) => {
    setExpandedInteg(expandedInteg === integId ? null : integId);
    setExpandedCat(null);
    setCatData(null);
  };

  const handleExpandCat = (integId, cat) => {
    const key = `${integId}:${cat}`;
    if (expandedCat === key) {
      setExpandedCat(null);
      setCatData(null);
    } else {
      setExpandedCat(key);
      loadCategoryData(integId, cat, 1);
    }
  };

  if (loading) {
    return <div style={{ padding: tokens.space[6], textAlign: 'center', color: tokens.inkMuted, fontSize: 14 }}>Cargando Data Explorer...</div>;
  }

  const integrations = summary?.integrations || [];

  if (integrations.length === 0) {
    return (
      <div style={{ padding: tokens.space[6], background: tokens.surfaceAlt, borderRadius: tokens.radius.md, border: `1px solid ${tokens.borderSoft}`, textAlign: 'center', color: tokens.inkMuted, fontSize: 14 }}>
        No hay integraciones con datos almacenados.
      </div>
    );
  }

  return (
    <div>
      {integrations.map((integ) => (
        <div key={integ.integrationId} style={{ marginBottom: tokens.space[3], background: tokens.surface, borderRadius: tokens.radius.md, border: `1px solid ${tokens.border}`, overflow: 'hidden' }}>
          {/* Integration header */}
          <div
            onClick={() => handleExpandInteg(integ.integrationId)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${tokens.space[3]}px ${tokens.space[4]}px`, cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.space[3] }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: tokens.ink }}>{integ.type}</span>
              <span style={{ fontSize: 11, color: integ.status === 'connected' ? '#16a34a' : tokens.inkMuted }}>{integ.status}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.space[3] }}>
              <span style={{ fontSize: 12, color: tokens.inkSoft }}>{integ.totalRecords} registros</span>
              <span style={{ fontSize: 12, color: tokens.inkMuted }}>{integ.categories?.length || 0} categorías</span>
              <span style={{ fontSize: 14, color: tokens.inkMuted }}>{expandedInteg === integ.integrationId ? '▾' : '▸'}</span>
            </div>
          </div>

          {/* Categories */}
          {expandedInteg === integ.integrationId && (
            <div style={{ borderTop: `1px solid ${tokens.borderSoft}`, padding: `0 ${tokens.space[4]}px ${tokens.space[3]}px` }}>
              {(integ.categories || []).map((cat) => {
                const key = `${integ.integrationId}:${cat.name}`;
                const isExpanded = expandedCat === key;
                return (
                  <div key={cat.name} style={{ borderBottom: `1px solid ${tokens.borderSoft}` }}>
                    <div
                      onClick={() => handleExpandCat(integ.integrationId, cat.name)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${tokens.space[2]}px 0`, cursor: 'pointer' }}
                    >
                      <span style={{ fontSize: 13, color: tokens.ink }}>{cat.name}</span>
                      <div style={{ display: 'flex', gap: tokens.space[3], fontSize: 12, color: tokens.inkMuted }}>
                        <span>{cat.count} registros</span>
                        <span>{cat.earliest} → {cat.latest}</span>
                        <span>{isExpanded ? '▾' : '▸'}</span>
                      </div>
                    </div>

                    {/* Data records */}
                    {isExpanded && (
                      <div style={{ padding: `${tokens.space[2]}px 0` }}>
                        {catLoading ? (
                          <div style={{ fontSize: 12, color: tokens.inkMuted, padding: tokens.space[2] }}>Cargando...</div>
                        ) : catData?.records?.length > 0 ? (
                          <div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                              <thead>
                                <tr style={{ borderBottom: `1px solid ${tokens.border}` }}>
                                  <th style={{ textAlign: 'left', padding: tokens.space[1], color: tokens.inkMuted, fontWeight: 500, width: 100 }}>Fecha</th>
                                  <th style={{ textAlign: 'left', padding: tokens.space[1], color: tokens.inkMuted, fontWeight: 500, width: 100 }}>Período</th>
                                  <th style={{ textAlign: 'left', padding: tokens.space[1], color: tokens.inkMuted, fontWeight: 500 }}>Datos</th>
                                </tr>
                              </thead>
                              <tbody>
                                {catData.records.map((rec) => (
                                  <tr key={rec.id} style={{ borderBottom: `1px solid ${tokens.borderSoft}` }}>
                                    <td style={{ padding: tokens.space[1], color: tokens.inkSoft }}>{new Date(rec.fetchedAt).toLocaleDateString('es-ES')}</td>
                                    <td style={{ padding: tokens.space[1], color: tokens.inkSoft }}>{rec.period || '–'}</td>
                                    <td style={{ padding: tokens.space[1] }}><DataPreview data={rec.data} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {/* Pagination */}
                            {catData.totalPages > 1 && (
                              <div style={{ display: 'flex', gap: tokens.space[2], justifyContent: 'center', marginTop: tokens.space[3] }}>
                                <button disabled={page <= 1} onClick={() => loadCategoryData(integ.integrationId, cat.name, page - 1)} style={{ fontSize: 12, color: tokens.accent, background: 'none', border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.sm, padding: `2px ${tokens.space[2]}px`, cursor: 'pointer' }}>← Anterior</button>
                                <span style={{ fontSize: 12, color: tokens.inkMuted, padding: '2px 8px' }}>{page} / {catData.totalPages}</span>
                                <button disabled={page >= catData.totalPages} onClick={() => loadCategoryData(integ.integrationId, cat.name, page + 1)} style={{ fontSize: 12, color: tokens.accent, background: 'none', border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.sm, padding: `2px ${tokens.space[2]}px`, cursor: 'pointer' }}>Siguiente →</button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: tokens.inkMuted, padding: tokens.space[2] }}>Sin registros</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
