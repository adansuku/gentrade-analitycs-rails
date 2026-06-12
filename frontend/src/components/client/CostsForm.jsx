import { useState, useEffect } from 'react';
import { authFetch } from '../../lib/api';
import { API_BASE } from '../../lib/constants';
import tokens from './workspace/tokens';
import { Icons } from '../ui/Icons';

export default function CostsForm({ clientId, yearMonth, onClose, onSaved }) {
  const [feePercent, setFeePercent] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [feeMonthlyBudget, setFeeMonthlyBudget] = useState('');
  const [fixedCosts, setFixedCosts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    authFetch(`${API_BASE}/api/clients/${clientId}/reports/costs/${yearMonth}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.costs) {
          setFeePercent(d.costs.feePercent ?? '');
          setTotalBudget(d.costs.totalBudget ?? '');
          setFeeMonthlyBudget(d.costs.feeMonthlyBudget ?? '');
          if (d.costs.fixedCosts) setFixedCosts(d.costs.fixedCosts.map(fc => ({ name: fc.name, monthly: String(fc.monthly) })));
        }
      })
      .catch(() => {});
  }, [clientId, yearMonth]);

  const handleSave = async () => {
    setError(null);
    const costs = {};

    if (feePercent !== '') {
      const v = Number(feePercent);
      if (isNaN(v) || v < 0 || v > 100) { setError('Fee debe ser entre 0 y 100'); return; }
      costs.feePercent = v;
    }
    if (totalBudget !== '') {
      const v = Number(totalBudget);
      if (isNaN(v) || v <= 0) { setError('Presupuesto total debe ser positivo'); return; }
      costs.totalBudget = v;
    }
    if (feeMonthlyBudget !== '') {
      const v = Number(feeMonthlyBudget);
      if (isNaN(v) || v <= 0) { setError('Presupuesto fee debe ser positivo'); return; }
      costs.feeMonthlyBudget = v;
    }

    const parsedFixed = [];
    for (const fc of fixedCosts) {
      if (fc.name && fc.monthly !== '') {
        const v = Number(fc.monthly);
        if (isNaN(v) || v <= 0) { setError(`Coste de ${fc.name} debe ser positivo`); return; }
        parsedFixed.push({ name: fc.name, monthly: v });
      }
    }
    if (parsedFixed.length > 0) costs.fixedCosts = parsedFixed;

    if (Object.keys(costs).length === 0) { setError('Define al menos un coste'); return; }

    setSaving(true);
    try {
      await authFetch(`${API_BASE}/api/clients/${clientId}/reports/costs/${yearMonth}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costs }),
      });
      onSaved?.();
      onClose?.();
    } catch {
      setError('Error al guardar costes');
    } finally {
      setSaving(false);
    }
  };

  const addFixed = () => setFixedCosts([...fixedCosts, { name: '', monthly: '' }]);
  const removeFixed = (i) => setFixedCosts(fixedCosts.filter((_, idx) => idx !== i));
  const updateFixed = (i, field, value) => {
    const copy = [...fixedCosts];
    copy[i] = { ...copy[i], [field]: value };
    setFixedCosts(copy);
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
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div style={{ background: tokens.surface, borderRadius: tokens.radius.lg, padding: tokens.space[6], width: 460, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space[5] }}>
          <h3 style={{ margin: 0, fontSize: 16, color: tokens.ink }}>Costes e inversión — {yearMonth}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.inkMuted }}>
            <Icons.X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space[4] }}>
          <div>
            <label style={{ fontSize: 13, color: tokens.inkSoft, display: 'block', marginBottom: tokens.space[1] }}>Fee de agencia (%)</label>
            <input type="number" min="0" max="100" step="1" value={feePercent} onChange={(e) => setFeePercent(e.target.value)} style={inputStyle} placeholder="20" />
          </div>

          <div>
            <label style={{ fontSize: 13, color: tokens.inkSoft, display: 'block', marginBottom: tokens.space[1] }}>Presupuesto total mensual (€)</label>
            <input type="number" min="0" step="0.01" value={totalBudget} onChange={(e) => setTotalBudget(e.target.value)} style={inputStyle} placeholder="9000" />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space[2] }}>
              <label style={{ fontSize: 13, color: tokens.inkSoft }}>Costes fijos mensuales</label>
              <button onClick={addFixed} style={{ ...btnStyle(false), padding: `2px ${tokens.space[2]}px`, fontSize: 12 }}>+ Coste</button>
            </div>
            {fixedCosts.map((fc, i) => (
              <div key={i} style={{ display: 'flex', gap: tokens.space[2], marginBottom: tokens.space[2] }}>
                <input value={fc.name} onChange={(e) => updateFixed(i, 'name', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="Connectif" />
                <input type="number" min="0" step="0.01" value={fc.monthly} onChange={(e) => updateFixed(i, 'monthly', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="353" />
                <button onClick={() => removeFixed(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.danger, fontSize: 16 }}>×</button>
              </div>
            ))}
          </div>
        </div>

        {error && <div style={{ marginTop: tokens.space[3], color: tokens.danger, fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', gap: tokens.space[2], marginTop: tokens.space[5], justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnStyle(false)}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={btnStyle(true)}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
