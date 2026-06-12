import { useState, useEffect } from 'react';
import { authFetch } from '../../lib/api';
import { API_BASE } from '../../lib/constants';
import tokens from './workspace/tokens';
import { Icons } from '../ui/Icons';

const AD_TYPES = ['meta_ads', 'google_ads', 'tiktok_ads'];
const platformLabels = { meta_ads: 'Meta Ads', google_ads: 'Google Ads', tiktok_ads: 'TikTok Ads' };
// Key used in targets.adSpend — short name without _ads suffix
const platformKey = (type) => type.replace('_ads', '').replace('_', '');

/**
 * Parse Spanish number format to JavaScript number
 * Examples:
 *   "4.783" → 4783 (dot as thousand separator)
 *   "4,783" → 4.783 (comma as decimal separator)
 *   "1.234,56" → 1234.56 (dot=thousand, comma=decimal)
 *   "1,234.56" → 1234.56 (comma=thousand, dot=decimal)
 *   "4783" → 4783 (no separators)
 */
function parseSpanishNumber(str) {
  if (!str || str.trim() === '') return NaN;
  const cleaned = str.trim().replace(/€/g, '').replace(/\s/g, '');
  const hasDot = cleaned.includes('.');
  const hasComma = cleaned.includes(',');

  if (!hasDot && !hasComma) {
    // No separators - parse directly
    return parseFloat(cleaned);
  }

  if (hasDot && !hasComma) {
    // Only dot - check if it's thousand separator or decimal
    const parts = cleaned.split('.');
    if (parts.length === 2 && parts[1].length === 3) {
      // "4.783" → likely thousand separator
      return parseFloat(cleaned.replace(/\./g, ''));
    }
    // Otherwise treat as decimal
    return parseFloat(cleaned);
  }

  if (hasComma && !hasDot) {
    // Only comma - treat as decimal separator
    return parseFloat(cleaned.replace(',', '.'));
  }

  // Both separators present - determine which is decimal
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  if (lastComma > lastDot) {
    // Comma is decimal: "1.234,56" → 1234.56
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  } else {
    // Dot is decimal: "1,234.56" → 1234.56
    return parseFloat(cleaned.replace(/,/g, ''));
  }
}

export default function ObjectivesForm({ clientId, yearMonth, onClose, onSaved }) {
  const [revenue, setRevenue] = useState('');
  const [roas, setRoas] = useState('');
  const [adSpendPlatforms, setAdSpendPlatforms] = useState([]);
  const [connectedAdPlatforms, setConnectedAdPlatforms] = useState([]);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load connected ad integrations
    authFetch(`${API_BASE}/api/integrations/client/${clientId}`)
      .then((r) => r.json())
      .then((d) => {
        const integrations = d.integrations || d || [];
        const adPlatforms = integrations
          .filter((i) => AD_TYPES.includes(i.type) && i.status === 'connected')
          .map((i) => ({ type: i.type, key: platformKey(i.type), label: platformLabels[i.type] || i.type }));
        setConnectedAdPlatforms(adPlatforms);
      })
      .catch(() => {});

    // Load existing objectives
    authFetch(`${API_BASE}/api/clients/${clientId}/reports/objectives/${yearMonth}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.targets) {
          setRevenue(d.targets.revenue != null ? String(d.targets.revenue) : '');
          setRoas(d.targets.roas != null ? String(d.targets.roas) : '');
          if (d.targets.adSpend) {
            setAdSpendPlatforms(
              Object.entries(d.targets.adSpend).map(([platform, budget]) => ({ platform, budget: String(budget) }))
            );
          }
        }
      })
      .catch(() => {});
  }, [clientId, yearMonth]);

  const handleCopyPrevious = async () => {
    setCopying(true);
    setError(null);
    try {
      const res = await authFetch(`${API_BASE}/api/clients/${clientId}/reports/objectives/${yearMonth}/copy-previous`, { method: 'POST' });
      const d = await res.json();
      if (d.targets) {
        setRevenue(d.targets.revenue != null ? String(d.targets.revenue) : '');
        setRoas(d.targets.roas != null ? String(d.targets.roas) : '');
        if (d.targets.adSpend) {
          setAdSpendPlatforms(
            Object.entries(d.targets.adSpend).map(([platform, budget]) => ({ platform, budget: String(budget) }))
          );
        }
      } else {
        setError('No hay objetivos del mes anterior');
      }
    } catch {
      setError('Error al copiar objetivos');
    } finally {
      setCopying(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    const targets = {};
    if (revenue !== '') {
      const v = parseSpanishNumber(revenue);
      if (isNaN(v) || v <= 0) { setError('Ingresos debe ser un número positivo'); return; }
      targets.revenue = v;
    }
    if (roas !== '') {
      const v = parseSpanishNumber(roas);
      if (isNaN(v) || v <= 0) { setError('ROAS debe ser un número positivo'); return; }
      targets.roas = v;
    }
    const adSpend = {};
    for (const { platform, budget } of adSpendPlatforms) {
      if (platform && budget !== '') {
        const v = parseSpanishNumber(budget);
        if (isNaN(v) || v <= 0) { setError(`Presupuesto de ${platform} debe ser positivo`); return; }
        adSpend[platform] = v;
      }
    }
    if (Object.keys(adSpend).length > 0) targets.adSpend = adSpend;

    if (Object.keys(targets).length === 0) { setError('Define al menos un objetivo'); return; }

    console.log('Saving objectives:', targets);
    setSaving(true);
    try {
      const response = await authFetch(`${API_BASE}/api/clients/${clientId}/reports/objectives/${yearMonth}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets }),
      });
      console.log('Save response:', await response.json());
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error('Save objectives error:', err);
      setError('Error al guardar objetivos');
    } finally {
      setSaving(false);
    }
  };

  const usedPlatforms = adSpendPlatforms.map((p) => p.platform);
  const availablePlatforms = connectedAdPlatforms.filter((p) => !usedPlatforms.includes(p.key));

  const addPlatform = (key) => setAdSpendPlatforms([...adSpendPlatforms, { platform: key, budget: '' }]);
  const removePlatform = (i) => setAdSpendPlatforms(adSpendPlatforms.filter((_, idx) => idx !== i));
  const updateBudget = (i, value) => {
    const copy = [...adSpendPlatforms];
    copy[i] = { ...copy[i], budget: value };
    setAdSpendPlatforms(copy);
  };

  const inputStyle = {
    padding: `${tokens.space[2]}px ${tokens.space[3]}px`,
    borderRadius: tokens.radius.sm,
    border: `1px solid ${tokens.border}`,
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box',
  };

  const btnStyle = (primary) => ({
    padding: `${tokens.space[2]}px ${tokens.space[4]}px`,
    borderRadius: tokens.radius.md,
    border: primary ? 'none' : `1px solid ${tokens.border}`,
    background: primary ? tokens.accent : tokens.surface,
    color: primary ? '#fff' : tokens.ink,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  });

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div style={{
        background: tokens.surface, borderRadius: tokens.radius.lg, padding: tokens.space[6],
        width: 440, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space[5] }}>
          <h3 style={{ margin: 0, fontSize: 16, color: tokens.ink }}>Objetivos — {yearMonth}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.inkMuted }}>
            <Icons.X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space[4] }}>
          <div>
            <label style={{ fontSize: 13, color: tokens.inkSoft, display: 'block', marginBottom: tokens.space[1] }}>Ingresos objetivo (€)</label>
            <input type="text" value={revenue} onChange={(e) => setRevenue(e.target.value)} style={inputStyle} placeholder="4.783 o 4783" />
            <div style={{ fontSize: 11, color: tokens.inkMuted, marginTop: 4 }}>Usa punto (.) como separador de miles y coma (,) como decimal</div>
          </div>

          <div>
            <label style={{ fontSize: 13, color: tokens.inkSoft, display: 'block', marginBottom: tokens.space[1] }}>ROAS objetivo</label>
            <input type="text" value={roas} onChange={(e) => setRoas(e.target.value)} style={inputStyle} placeholder="4,8 o 4.8" />
          </div>

          <div>
            <label style={{ fontSize: 13, color: tokens.inkSoft, display: 'block', marginBottom: tokens.space[2] }}>Presupuesto Ads por plataforma</label>
            {adSpendPlatforms.map((p, i) => {
              const label = connectedAdPlatforms.find((cp) => cp.key === p.platform)?.label || p.platform;
              return (
                <div key={p.platform} style={{ display: 'flex', gap: tokens.space[2], marginBottom: tokens.space[2], alignItems: 'center' }}>
                  <span style={{ flex: 1, fontSize: 14, color: tokens.ink, fontWeight: 500 }}>{label}</span>
                  <input type="text" value={p.budget} onChange={(e) => updateBudget(i, e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="798 o 1.250" />
                  <button onClick={() => removePlatform(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.danger, fontSize: 16 }}>×</button>
                </div>
              );
            })}
            {availablePlatforms.length > 0 && (
              <div style={{ display: 'flex', gap: tokens.space[2], flexWrap: 'wrap', marginTop: tokens.space[2] }}>
                {availablePlatforms.map((p) => (
                  <button key={p.key} onClick={() => addPlatform(p.key)} style={{ ...btnStyle(false), padding: `4px ${tokens.space[3]}px`, fontSize: 12 }}>
                    + {p.label}
                  </button>
                ))}
              </div>
            )}
            {connectedAdPlatforms.length === 0 && adSpendPlatforms.length === 0 && (
              <p style={{ fontSize: 12, color: tokens.inkMuted, margin: `${tokens.space[2]}px 0 0` }}>No hay plataformas de ads conectadas.</p>
            )}
          </div>
        </div>

        {error && <div style={{ marginTop: tokens.space[3], color: tokens.danger, fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', gap: tokens.space[2], marginTop: tokens.space[5], justifyContent: 'space-between' }}>
          <button onClick={handleCopyPrevious} disabled={copying} style={btnStyle(false)}>
            {copying ? 'Copiando...' : 'Copiar del mes anterior'}
          </button>
          <div style={{ display: 'flex', gap: tokens.space[2] }}>
            <button onClick={onClose} style={btnStyle(false)}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={btnStyle(true)}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
