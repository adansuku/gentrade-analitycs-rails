import { useState, useEffect } from 'react';
import Icons from '../components/ui/Icons';
import { authFetch } from '../lib/api';

const API_BASE = '';

function MetricsScreen() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const r = await authFetch(`${API_BASE}/api/logs/metrics`);
        const data = await r.json();
        setMetrics(data);
      } catch { setMetrics(null); }
      finally { setLoading(false); }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="clients-screen">
        <div className="clients-loading">Cargando metricas…</div>
      </div>
    );
  }

  const totalCalls24h = metrics?.callsLast24h ?? 0;
  const totalCallsAll = metrics?.totalCalls ?? 0;
  const totalTokens = metrics?.totalTokens ?? 0;
  const estimatedCost = metrics?.estimatedCost?.allTime ?? 0;
  const avgResponseTime = metrics?.avgResponseTimeMs ?? 0;
  const categories = metrics?.callsByCategory || {};

  const maxCategoryCalls = Math.max(...Object.values(categories).map(c => typeof c === 'number' ? c : c.calls || 0), 1);

  return (
    <div className="clients-screen">
      <div className="clients-header">
        <div>
          <h1>Metricas IA</h1>
          <p>Uso y rendimiento del motor de inteligencia artificial</p>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metrics-card">
          <div className="metrics-card-icon" style={{ color: 'var(--accent-primary)' }}><Icons.Zap /></div>
          <div>
            <strong>{totalCalls24h.toLocaleString()}</strong>
            <span>Llamadas LLM (24h)</span>
          </div>
        </div>
        <div className="metrics-card">
          <div className="metrics-card-icon" style={{ color: 'var(--accent-success)' }}><Icons.Activity /></div>
          <div>
            <strong>{totalCallsAll.toLocaleString()}</strong>
            <span>Llamadas totales</span>
          </div>
        </div>
        <div className="metrics-card">
          <div className="metrics-card-icon" style={{ color: '#a855f7' }}><Icons.BarChart /></div>
          <div>
            <strong>{totalTokens.toLocaleString()}</strong>
            <span>Tokens totales</span>
          </div>
        </div>
        <div className="metrics-card">
          <div className="metrics-card-icon" style={{ color: 'var(--accent-warning)' }}><Icons.DollarSign /></div>
          <div>
            <strong>${estimatedCost.toFixed(4)}</strong>
            <span>Coste estimado (USD)</span>
          </div>
        </div>
        <div className="metrics-card">
          <div className="metrics-card-icon" style={{ color: 'var(--accent-primary-light)' }}><Icons.Clock /></div>
          <div>
            <strong>{(avgResponseTime / 1000).toFixed(1)}s</strong>
            <span>Tiempo medio de respuesta</span>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="metrics-section">
        <h3>Llamadas por categoria</h3>
        <div className="metrics-bars">
          {Object.entries(categories).length === 0 ? (
            <div className="proposals-empty premium-empty" style={{ padding: 24 }}>
              <Icons.BarChart />
              <p>Sin datos de categorias</p>
              <span>Los datos aparecen al usar funciones de IA</span>
            </div>
          ) : (
            Object.entries(categories).map(([cat, val]) => {
              const calls = typeof val === 'number' ? val : val.calls || 0;
              return (
                <div key={cat} className="metrics-bar-row">
                  <span className="metrics-bar-label">{cat}</span>
                  <div className="metrics-bar-track">
                    <div
                      className="metrics-bar-fill"
                      style={{ width: `${(calls / maxCategoryCalls) * 100}%` }}
                    />
                  </div>
                  <span className="metrics-bar-value">{calls.toLocaleString()}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default MetricsScreen;
