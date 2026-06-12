import { useState, useEffect, useRef } from 'react';
import { Icons } from '../ui/Icons';
import { Button } from '@/components/ui/button';
import { formatDate, formatProposalStatus } from '../../lib/formatters';
import { RecommendationsPanel } from './RecommendationsPanel';

const TEMPLATES = [
  { value: 'general', label: 'General', description: 'Propuesta comercial estandar' },
  { value: 'consultoria', label: 'Consultoria', description: 'Servicios de consultoria y asesoria' },
  { value: 'desarrollo_web', label: 'Desarrollo Web', description: 'Proyectos de desarrollo web y apps' },
  { value: 'marketing', label: 'Marketing', description: 'Campanas y estrategias de marketing' },
  { value: 'servicios', label: 'Servicios', description: 'Prestacion de servicios profesionales' },
];

const CUSTOM_TEMPLATES_KEY = 'gentrade_custom_templates';

function loadCustomTemplates() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_TEMPLATES_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCustomTemplates(templates) {
  try {
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
  } catch {
    // localStorage unavailable (private browsing) — silently skip
  }
}

function TemplateModal({ template, onSave, onClose }) {
  const [label, setLabel] = useState(template?.label || '');
  const [description, setDescription] = useState(template?.description || '');
  const [sections, setSections] = useState(template?.sections || '');
  const canSave = label.trim() && sections.trim();

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 14, padding: 28, width: 480, maxWidth: '95vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
          {template ? 'Editar plantilla' : 'Nueva plantilla'}
        </h3>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#6b7280', marginBottom: 5 }}>
            Nombre *
          </label>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Ej: Laboratorio EMC"
            style={{
              width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb',
              borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
            }}
            autoFocus
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#6b7280', marginBottom: 5 }}>
            Descripcion
          </label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Ej: Ensayos de compatibilidad electromagnética"
            style={{
              width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb',
              borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#6b7280', marginBottom: 5 }}>
            Secciones * <span style={{ fontWeight: 400 }}>(una por linea)</span>
          </label>
          <textarea
            value={sections}
            onChange={e => setSections(e.target.value)}
            placeholder={'Objeto del ensayo\nNormativa aplicable\nCondiciones de muestra\nPresupuesto\nPlazo y condiciones'}
            rows={6}
            style={{
              width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb',
              borderRadius: 8, fontSize: '0.875rem', outline: 'none', resize: 'vertical',
              fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5,
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px', borderRadius: 8, border: '1.5px solid #e5e7eb',
              background: '#fff', fontSize: '0.875rem', cursor: 'pointer', color: '#374151',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => canSave && onSave({ label: label.trim(), description: description.trim(), sections: sections.trim() })}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: canSave ? '#1b5e3b' : '#c5dece',
              color: '#fff', fontSize: '0.875rem', cursor: canSave ? 'pointer' : 'not-allowed', fontWeight: 500,
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'FINAL', label: 'Final' },
  { value: 'SENT', label: 'Enviada' },
];

function getStatusBadgeStyle(status) {
  switch (status) {
    case 'FINAL':
      return {
        background: '#dcfce7',
        color: '#15803d',
        border: '1px solid #bbf7d0',
      };
    case 'SENT':
    case 'ENVIADA':
      return {
        background: '#dbeafe',
        color: '#1d4ed8',
        border: '1px solid #bfdbfe',
      };
    default:
      return {
        background: '#f3f4f6',
        color: '#6b7280',
        border: '1px solid #e5e7eb',
      };
  }
}

function ProposalCard({
  proposal,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onOpenProposal,
  onDeleteProposal,
  onChangeStatus,
}) {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const badgeStyle = getStatusBadgeStyle(proposal.status);
  const versionCount = proposal.versions?.length || proposal.versionCount || 1;
  const lastModified = proposal.updatedAt || proposal.createdAt;

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        padding: 16,
        borderRadius: 10,
        border: '1px solid #e5e7eb',
        background: isHovered ? '#f9fafb' : '#fff',
        transition: 'background 0.15s, box-shadow 0.15s',
        boxShadow: isHovered ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
        position: 'relative',
      }}
    >
      {/* Top row: title + badge + version */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span
          style={{
            fontSize: '0.925rem',
            fontWeight: 500,
            color: '#111827',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0,
          }}
        >
          {proposal.title || 'Propuesta sin titulo'}
        </span>
        <span
          style={{
            ...badgeStyle,
            fontSize: '0.7rem',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 9999,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {formatProposalStatus(proposal.status)}
        </span>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: '#6b7280',
            background: '#f3f4f6',
            padding: '2px 7px',
            borderRadius: 6,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          v{versionCount}
        </span>
      </div>

      {/* Date row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#9ca3af', fontSize: '0.78rem', marginBottom: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icons.Clock />
          Creada: {formatDate(proposal.createdAt)}
        </span>
        {lastModified !== proposal.createdAt && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icons.Edit />
            Modificada: {formatDate(lastModified)}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button
          onClick={(e) => { e.stopPropagation(); onOpenProposal(proposal.id); }}
          className="rounded-full"
          style={{ gap: 6, padding: '8px 16px', fontSize: '0.8125rem' }}
        >
          <Icons.Edit /> Editar
        </Button>
        <Button
          variant="outline"
          onClick={(e) => { e.stopPropagation(); onOpenProposal(proposal.id); }}
          className="rounded-full"
          style={{ gap: 6, padding: '8px 16px', fontSize: '0.8125rem' }}
        >
          <Icons.Eye /> Ver
        </Button>

        {/* Status dropdown */}
        <div style={{ position: 'relative' }}>
          <Button
            type="button"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); setStatusDropdownOpen(!statusDropdownOpen); }}
            className="rounded-full"
            style={{ gap: 6, padding: '8px 16px', fontSize: '0.8125rem' }}
          >
            Estado <Icons.ChevronDown />
          </Button>
          {statusDropdownOpen && (
            <div
              style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4,
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 20,
                minWidth: 140, overflow: 'hidden',
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (opt.value !== proposal.status) {
                      onChangeStatus(proposal.id, opt.value);
                    }
                    setStatusDropdownOpen(false);
                  }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 14px', border: 'none', fontSize: '0.8rem',
                    background: opt.value === proposal.status ? '#f3f4f6' : '#fff',
                    fontWeight: opt.value === proposal.status ? 600 : 400,
                    color: '#374151', cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = opt.value === proposal.status ? '#f3f4f6' : '#fff'; }}
                >
                  {opt.label}
                  {opt.value === proposal.status && ' \u2713'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Delete button */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={(e) => { e.stopPropagation(); onDeleteProposal(proposal.id); }}
          title="Eliminar propuesta"
          style={{
            opacity: isHovered ? 1 : 0,
            pointerEvents: isHovered ? 'auto' : 'none',
            transition: 'opacity 0.15s',
          }}
          className="text-gray-400 hover:text-red-500"
        >
          <Icons.Trash />
        </Button>
      </div>
    </div>
  );
}

export function ProposalsSection({
  clientId,
  proposals,
  proposalsLoading,
  onOpenProposal,
  onDeleteProposal,
  onGenerateProposal,
  onChangeStatus,
  generating,
  materials,
  selectedTemplate,
  setSelectedTemplate,
  materialsCount = 0,
  connectedIntegrations = [],
  autoFocusTrigger = 0,
}) {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [selectedIntegrations, setSelectedIntegrations] = useState([]);
  const templateRef = useRef(null);
  const [customTemplates, setCustomTemplates] = useState(loadCustomTemplates);
  const [customSections, setCustomSections] = useState('');
  const [selectedCustomTemplateId, setSelectedCustomTemplateId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState([]);
  const [materialsChecklistOpen, setMaterialsChecklistOpen] = useState(true);

  useEffect(() => {
    if (autoFocusTrigger > 0 && templateRef.current) {
      templateRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [autoFocusTrigger]);

  useEffect(() => {
    setSelectedMaterialIds((materials || []).map(m => m.id));
  }, [materials]);

  // Sync selected integrations when they load async
  useEffect(() => {
    if (connectedIntegrations.length > 0 && selectedIntegrations.length === 0) {
      setSelectedIntegrations(connectedIntegrations.map(i => i.type));
    }
  }, [connectedIntegrations]);

  const toggleIntegration = (type) => {
    setSelectedIntegrations(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const canGenerate = materials && materials.length > 0 && selectedMaterialIds.length > 0 && !generating;

  const handleSaveTemplate = ({ label, description, sections }) => {
    const id = editingTemplate?.id || crypto.randomUUID();
    const updated = editingTemplate
      ? customTemplates.map(t => t.id === editingTemplate.id ? { id, label, description, sections } : t)
      : [...customTemplates, { id, label, description, sections }];
    setCustomTemplates(updated);
    saveCustomTemplates(updated);
    if (!editingTemplate) {
      setSelectedTemplate('');
      setCustomSections(sections);
      setSelectedCustomTemplateId(id);
    } else if (editingTemplate.id === selectedCustomTemplateId) {
      setCustomSections(sections);
    }
    setModalOpen(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (id) => {
    if (!confirm('Eliminar esta plantilla?')) return;
    const updated = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(updated);
    saveCustomTemplates(updated);
    if (selectedCustomTemplateId === id) {
      setCustomSections('');
      setSelectedCustomTemplateId(null);
      setSelectedTemplate('general');
    }
  };

  const handleSelectPredefined = (value) => {
    setSelectedTemplate(value);
    setCustomSections('');
    setSelectedCustomTemplateId(null);
  };

  const handleSelectCustom = (template) => {
    setSelectedTemplate('');
    setCustomSections(template.sections);
    setSelectedCustomTemplateId(template.id);
  };

  const handleGenerate = () => {
    onGenerateProposal(selectedTemplate || 'general', {
      includeIntegrations: selectedIntegrations,
      customSections: customSections || undefined,
      materialIds: selectedMaterialIds,
      totalMaterials: (materials || []).length,
    });
  };

  const generateButton = (label, size = 'lg') => (
    <Button
      size={size}
      disabled={!canGenerate}
      onClick={handleGenerate}
      style={{ borderRadius: 999, padding: size === 'lg' ? '10px 24px' : '8px 18px', gap: 8, fontSize: size === 'lg' ? '0.9375rem' : '0.8125rem' }}
    >
      {generating ? (
        <>
          <span
            style={{
              display: 'inline-block',
              width: 16,
              height: 16,
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          Generando...
        </>
      ) : (
        <>
          <Icons.Sparkles />
          {label}
        </>
      )}
    </Button>
  );

  if (proposalsLoading) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ height: 24, width: 120, background: '#e5e7eb', borderRadius: 6 }} />
          <div style={{ height: 32, width: 160, background: '#e5e7eb', borderRadius: 8 }} />
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              padding: 16,
              marginBottom: 12,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
            }}
          >
            <div style={{ height: 16, width: '60%', background: '#e5e7eb', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 12, width: '30%', background: '#e5e7eb', borderRadius: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, color: '#111827' }}>
          Propuestas
        </h3>
        {generateButton('Generar nueva propuesta')}
      </div>

      {/* Template selector */}
      <div ref={templateRef} style={{ marginBottom: 20, scrollMarginTop: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#6b7280' }}>Plantilla</label>
          <button
            type="button"
            onClick={() => { setEditingTemplate(null); setModalOpen(true); }}
            title="Nueva plantilla personalizada"
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px',
              borderRadius: 6, border: '1.5px solid #e5e7eb', background: '#fff',
              fontSize: '0.75rem', color: '#1b5e3b', fontWeight: 500, cursor: 'pointer',
            }}
          >
            + Nueva
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TEMPLATES.map((t) => {
            const isSelected = selectedTemplate === t.value && !customSections;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => handleSelectPredefined(t.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderRadius: 8, border: `1.5px solid ${isSelected ? '#1b5e3b' : '#e5e7eb'}`,
                  background: isSelected ? '#eef2ff' : '#fff', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.12s',
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: isSelected ? '#1b5e3b' : '#d1d5db',
                  transition: 'background 0.12s',
                }} />
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: isSelected ? '#0f4a2a' : '#374151' }}>{t.label}</div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{t.description}</div>
                </div>
              </button>
            );
          })}
          {customTemplates.map((t) => {
            const isSelected = selectedCustomTemplateId === t.id;
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                  borderRadius: 8, border: `1.5px solid ${isSelected ? '#059669' : '#e5e7eb'}`,
                  background: isSelected ? '#ecfdf5' : '#fff', transition: 'all 0.12s',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleSelectCustom(t)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: isSelected ? '#059669' : '#d1d5db', transition: 'background 0.12s',
                  }} />
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: isSelected ? '#065f46' : '#374151' }}>
                      {t.label} <span style={{ fontSize: '0.65rem', background: '#d1fae5', color: '#065f46', borderRadius: 4, padding: '1px 5px', marginLeft: 4 }}>personalizada</span>
                    </div>
                    {t.description && <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{t.description}</div>}
                  </div>
                </button>
                <button
                  type="button"
                  title="Editar"
                  onClick={() => { setEditingTemplate(t); setModalOpen(true); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9ca3af', lineHeight: 1 }}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  title="Eliminar"
                  onClick={() => handleDeleteTemplate(t.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9ca3af', lineHeight: 1 }}
                >
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {modalOpen && (
        <TemplateModal
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => { setModalOpen(false); setEditingTemplate(null); }}
        />
      )}

      {/* Integration data selector */}
      {connectedIntegrations.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#6b7280' }}>
              Fuentes de datos
            </label>
            <button
              type="button"
              onClick={() => {
                const allSelected = selectedIntegrations.length === connectedIntegrations.length;
                setSelectedIntegrations(allSelected ? [] : connectedIntegrations.map(i => i.type));
              }}
              style={{ fontSize: '0.7rem', color: '#1b5e3b', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {selectedIntegrations.length === connectedIntegrations.length ? 'Quitar todo' : 'Añadir todo'}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {connectedIntegrations.map(integration => {
              const isSelected = selectedIntegrations.includes(integration.type);
              const iconMap = { google_analytics: Icons.BarChart3, shopify: Icons.ShoppingCart, google_ads: Icons.Campaign, meta_ads: Icons.Bullhorn, tiktok_ads: Icons.Campaign, mailchimp: Icons.Mail, stripe: Icons.DollarSign, holded: Icons.FileText };
              const colorMap = { google_analytics: '#4285F4', shopify: '#96BF48', google_ads: '#4285F4', meta_ads: '#1877F2', tiktok_ads: '#000', mailchimp: '#FFE01B', stripe: '#635BFF', holded: '#00B4D8' };
              const IconComp = iconMap[integration.type] || Icons.Zap;
              const color = colorMap[integration.type] || '#6b7280';
              return (
                <button
                  key={integration.id}
                  type="button"
                  onClick={() => toggleIntegration(integration.type)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '12px 14px', borderRadius: 12, width: 80,
                    border: isSelected ? `2px solid ${color}` : '2px solid #e5e7eb',
                    background: isSelected ? `${color}08` : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    opacity: isSelected ? 1 : 0.5,
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: isSelected ? `${color}15` : '#f3f4f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}>
                    <IconComp style={{ width: 20, height: 20, color: isSelected ? color : '#9ca3af' }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: isSelected ? '#374151' : '#9ca3af', textAlign: 'center', lineHeight: 1.2 }}>
                    {integration.label?.replace('Google ', 'G.').replace('Analytics', 'Analytics')}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedIntegrations.length > 0 && (
            <span style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icons.Zap style={{ width: 12, height: 12 }} />
              {selectedIntegrations.length} fuente{selectedIntegrations.length !== 1 ? 's' : ''} incluida{selectedIntegrations.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Material selection checklist */}
      {materials && materials.length > 1 && (
        <div style={{ marginBottom: 16, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setMaterialsChecklistOpen(o => !o)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', background: '#f8f9fb', border: 'none', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#6b7280' }}>
              Materiales a incluir
              <span style={{
                marginLeft: 8, fontSize: '0.7rem', background: selectedMaterialIds.length === 0 ? '#fef2f2' : '#eef2ff',
                color: selectedMaterialIds.length === 0 ? '#dc2626' : '#1b5e3b',
                padding: '1px 7px', borderRadius: 99, fontWeight: 600,
              }}>
                {selectedMaterialIds.length}/{materials.length}
              </span>
            </span>
            <span style={{ fontSize: '0.7rem', color: '#9ca3af', transform: materialsChecklistOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
          </button>
          {materialsChecklistOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#f0f1f5' }}>
              {materials.map(m => {
                const checked = selectedMaterialIds.includes(m.id);
                const typeColors = { PDF: '#dc2626', TXT: '#374151', CSV: '#059669', XLSX: '#059669', AUDIO: '#7c3aed', TRANSCRIPT: '#7c3aed', NOTE: '#d97706', EMAIL: '#2563eb', DOCX: '#374151', OTHER: '#6b7280' };
                const typeColor = typeColors[m.type] || '#6b7280';
                return (
                  <label
                    key={m.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                      background: checked ? '#fff' : '#f8f9fb', cursor: 'pointer',
                      opacity: checked ? 1 : 0.5, transition: 'all 0.1s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setSelectedMaterialIds(prev =>
                        prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                      )}
                      style={{ accentColor: '#1b5e3b', width: 14, height: 14, cursor: 'pointer' }}
                    />
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                      background: `${typeColor}15`, color: typeColor, flexShrink: 0,
                    }}>
                      {m.type}
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: '#111827', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.title || m.filePath?.split('/').pop() || 'Sin título'}
                    </span>
                    {m.size && (
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af', flexShrink: 0 }}>
                        {m.size < 1024 ? `${m.size} B` : m.size < 1048576 ? `${Math.round(m.size / 1024)} KB` : `${(m.size / 1048576).toFixed(1)} MB`}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty state (T024 - more prominent CTA) */}
      {(!proposals || proposals.length === 0) && (
        <div
          style={{
            textAlign: 'center',
            padding: '64px 32px',
            border: '2px dashed #d1d5db',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #fafafa 0%, #f3f4f6 100%)',
          }}
        >
          <div style={{ color: '#1b5e3b', marginBottom: 16, fontSize: '2rem' }}>
            <Icons.Sparkles />
          </div>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>
            Este cliente aun no tiene propuestas
          </p>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: '0 auto 24px', maxWidth: 420, lineHeight: 1.5 }}>
            {materials && materials.length > 0
              ? 'Genera tu primera propuesta comercial a partir de los materiales importados. La IA analizara todo el contexto y creara una propuesta profesional.'
              : 'Importa materiales primero (documentos, notas, emails) para poder generar una propuesta automatica con IA.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {generateButton('Generar primera propuesta')}
          </div>
        </div>
      )}

      {/* Proposal cards */}
      {proposals && proposals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              isHovered={hoveredCard === proposal.id}
              onMouseEnter={() => setHoveredCard(proposal.id)}
              onMouseLeave={() => setHoveredCard(null)}
              onOpenProposal={onOpenProposal}
              onDeleteProposal={onDeleteProposal}
              onChangeStatus={onChangeStatus}
            />
          ))}
        </div>
      )}

      {/* Recommendations Panel — full variant */}
      <div style={{ marginTop: 32 }}>
        <RecommendationsPanel
          clientId={clientId}
          variant="full"
          materialsCount={materialsCount}
        />
      </div>

      {/* Spinner keyframe animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
