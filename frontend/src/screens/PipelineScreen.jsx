import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import Icons from '../components/ui/Icons';
import { Button } from '@/components/ui/button';
import { PIPELINE_STAGES } from '../lib/materialUtils';
import { authFetch } from '../lib/api';

const API_BASE = '';

/* ── Inline Draggable Card ── */
function InlineDraggableCard({ client, stageKey }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: client.id,
    data: { client, fromStage: stageKey },
  });

  const style = {
    background: '#fff',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    padding: '14px 16px',
    marginBottom: 8,
    cursor: 'grab',
    transition: 'box-shadow 0.15s, border-color 0.15s',
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 100 : 'auto',
    ...(transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      tabIndex={0}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#c5dece';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(79,70,229,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: '#1b5e3b10', color: '#1b5e3b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: '0.75rem', fontWeight: 700,
        }}>
          {(client.name || '?').charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontWeight: 600, fontSize: '0.875rem', color: '#111827',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {client.name}
          </div>
          {client.company && (
            <div style={{
              fontSize: '0.75rem', color: '#6b7280', marginTop: 1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {client.company}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <span style={{
          fontSize: '0.6875rem', color: '#6b7280', background: '#f3f4f6',
          borderRadius: 6, padding: '2px 8px', fontWeight: 500,
        }}>
          {client.proposalCount || 0} prop.
        </span>
        <span style={{
          fontSize: '0.6875rem', color: '#6b7280', background: '#f3f4f6',
          borderRadius: 6, padding: '2px 8px', fontWeight: 500,
        }}>
          {client.materialCount || 0} mat.
        </span>
      </div>
    </div>
  );
}

/* ── Inline Droppable Column ── */
function InlineDroppableColumn({ stage, clients }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.key });

  return (
    <div style={{
      minWidth: 280,
      maxWidth: 320,
      flex: '1 0 280px',
      background: '#f8f9fb',
      borderRadius: 12,
      border: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Column header */}
      <div style={{
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: '1px solid #e5e7eb',
        background: '#fff',
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: stage.color, flexShrink: 0,
        }} />
        <span style={{
          fontWeight: 600, fontSize: '0.8125rem', color: '#111827',
          flex: 1,
        }}>
          {stage.label}
        </span>
        <span style={{
          fontSize: '0.75rem', fontWeight: 600, color: '#6b7280',
          background: '#f3f4f6', borderRadius: 10,
          padding: '2px 10px', minWidth: 24, textAlign: 'center',
        }}>
          {clients.length}
        </span>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          padding: 10,
          minHeight: 120,
          overflowY: 'auto',
          transition: 'background 0.15s',
          background: isOver ? 'rgba(79,70,229,0.04)' : 'transparent',
          borderRadius: isOver ? '0 0 12px 12px' : undefined,
        }}
      >
        {clients.length === 0 ? (
          <div style={{
            textAlign: 'center', color: '#9ca3af', fontSize: '0.8125rem',
            padding: '32px 12px',
            border: '2px dashed #e5e7eb', borderRadius: 10,
          }}>
            Arrastra clientes aqui
          </div>
        ) : (
          clients.map(client => (
            <InlineDraggableCard key={client.id} client={client} stageKey={stage.key} />
          ))
        )}
      </div>
    </div>
  );
}

/* ── Main Pipeline Screen ── */
function PipelineScreen() {
  const [pipelineData, setPipelineData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchPipeline = async () => {
    try {
      const r = await authFetch(`${API_BASE}/api/clients/pipeline`);
      const data = await r.json();
      if (data.pipeline) {
        const grouped = {};
        for (const [key, val] of Object.entries(data.pipeline)) {
          grouped[key] = val.clients || [];
        }
        setPipelineData(grouped);
      }
    } catch {
      setPipelineData({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPipeline(); }, []);

  const handleDragStart = (event) => {
    setActiveCard(event.active.data.current?.client || null);
  };

  const handleDragEnd = async (event) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const fromStage = active.data.current?.fromStage;
    const toStage = over.id;
    const clientId = active.id;

    if (fromStage === toStage) return;

    // Optimistic update
    setPipelineData(prev => {
      const next = { ...prev };
      const client = (next[fromStage] || []).find(c => c.id === clientId);
      if (client) {
        next[fromStage] = (next[fromStage] || []).filter(c => c.id !== clientId);
        next[toStage] = [...(next[toStage] || []), { ...client, status: toStage }];
      }
      return next;
    });

    // Persist
    try {
      await authFetch(`${API_BASE}/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: toStage }),
      });
    } catch (err) {
      console.error('Error moving client:', err);
      fetchPipeline(); // Revert on error
    }
  };

  const totalClients = Object.values(pipelineData).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      {/* Hero header */}
      <div style={{
        background: 'linear-gradient(135deg, #1b5e3b 0%, #0f4a2a 50%, #0a2f1c 100%)',
        padding: '40px 32px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -60, right: -40,
          width: 260, height: 260, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: '30%',
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 8 }}>
            Pipeline comercial
          </div>
          <h1 style={{
            color: '#fff', fontSize: '1.75rem', fontWeight: 700,
            letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1.2,
          }}>
            Pipeline comercial
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9375rem', marginBottom: 28, maxWidth: 480 }}>
            {totalClients} clientes en el embudo. Arrastra para cambiar de etapa.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              onClick={fetchPipeline}
              style={{
                background: '#fff', color: '#1b5e3b', border: 'none',
                fontWeight: 600, padding: '10px 20px', fontSize: '0.875rem',
                borderRadius: 8, cursor: 'pointer',
              }}
            >
              <Icons.RefreshCw /> Actualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Stage summary bar — overlapping hero */}
      <div style={{ maxWidth: 1100, margin: '-24px auto 0', padding: '0 32px', position: 'relative', zIndex: 2 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${PIPELINE_STAGES.length}, 1fr)`,
          gap: 1,
          background: '#e5e7eb', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          {PIPELINE_STAGES.map((stage) => {
            const count = (pipelineData[stage.key] || []).length;
            return (
              <div key={stage.key} style={{
                background: '#fff', padding: '16px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: stage.color, flexShrink: 0,
                }} />
                <div>
                  <div style={{
                    fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.1,
                    letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {count}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#6b7280', fontWeight: 500, marginTop: 2 }}>
                    {stage.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Kanban board */}
      <div style={{ padding: '28px 32px 48px' }}>
        {loading ? (
          <div style={{
            textAlign: 'center', color: '#6b7280', fontSize: '0.9375rem',
            padding: '64px 0',
          }}>
            Cargando pipeline...
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div style={{
              display: 'flex',
              gap: 16,
              overflowX: 'auto',
              paddingBottom: 8,
              WebkitOverflowScrolling: 'touch',
            }}>
              {PIPELINE_STAGES.map((stage) => (
                <InlineDroppableColumn
                  key={stage.key}
                  stage={stage}
                  clients={pipelineData[stage.key] || []}
                />
              ))}
            </div>
            <DragOverlay>
              {activeCard ? (
                <div style={{
                  background: '#fff',
                  borderRadius: 10,
                  border: '1px solid #c5dece',
                  padding: '14px 16px',
                  boxShadow: '0 12px 32px rgba(79,70,229,0.18)',
                  width: 280,
                  opacity: 0.95,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: '#1b5e3b10', color: '#1b5e3b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontSize: '0.75rem', fontWeight: 700,
                    }}>
                      {(activeCard.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>
                        {activeCard.name}
                      </div>
                      {activeCard.company && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 1 }}>
                          {activeCard.company}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}

export { PipelineScreen };
export default PipelineScreen;
