import { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Icons } from '../components/ui/Icons';
import { Button } from '@/components/ui/button';
import { EditorToolbar } from '../components/ui/EditorToolbar';
import { mdToHtml } from '../lib/mdToHtml.js';
import { formatDuration } from '../lib/formatters';
import { authFetch } from '../lib/api';

const API_BASE = '';

export function ProposalScreen({ proposalId, proposal, extractedInfo, onBack, onSave, onSendMessage, messages, sending, versions = [] }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [exporting, setExporting] = useState(false);
  const proposalRef = useRef(null);
  const chatEndRef = useRef(null);

  // Version history
  const [selectedVersionIdx, setSelectedVersionIdx] = useState(0);
  const [displayContent, setDisplayContent] = useState(proposal || '');

  // Sync displayContent when proposal prop changes
  useEffect(() => {
    if (proposal) {
      setDisplayContent(proposal);
    }
  }, [proposal]);

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');

  // Version comparison
  const [showComparison, setShowComparison] = useState(false);
  const [compareVersionA, setCompareVersionA] = useState(0);
  const [compareVersionB, setCompareVersionB] = useState(1);

  // Version history panel
  const [historialOpen, setHistorialOpen] = useState(true);

  // Initialize version selection
  useEffect(() => {
    if (versions.length > 0) {
      setSelectedVersionIdx(0);
      setDisplayContent(versions[0].content);
    }
  }, [versions.length]);

  // Update display when proposal changes from chat — force editor refresh
  useEffect(() => {
    if (proposal && proposal !== displayContent) {
      setDisplayContent(proposal);
      if (editor) {
        editor.commands.setContent(mdToHtml(proposal));
      }
    }
  }, [proposal]);

  const handleVersionChange = (idx) => {
    setSelectedVersionIdx(idx);
    if (versions[idx]) {
      setDisplayContent(versions[idx].content);
    }
  };

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Email handlers
  useEffect(() => {
    if (showEmailModal) {
      setEmailTo(extractedInfo?.email || '');
      setEmailSubject(`Propuesta comercial - ${extractedInfo?.clientName || 'Cliente'}`);
      setEmailMessage(`Estimado/a ${extractedInfo?.clientName || ''},\n\nAdjunto encontrara nuestra propuesta comercial preparada especialmente para usted.\n\nQuedo a su disposicion para cualquier consulta.\n\nSaludos cordiales`);
      setEmailStatus('');
    }
  }, [showEmailModal]);

  const handleSendEmail = async () => {
    setEmailSending(true);
    setEmailStatus('');
    try {
      const r = await authFetch(`${API_BASE}/api/proposals/${proposalId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo, subject: emailSubject, message: emailMessage }),
      });
      if (r.ok) {
        setEmailStatus('success');
        setTimeout(() => setShowEmailModal(false), 2000);
      } else {
        const data = await r.json().catch(() => ({}));
        setEmailStatus(data.message || 'Error al enviar el email');
      }
    } catch {
      setEmailStatus('Error de conexion al enviar el email');
    } finally {
      setEmailSending(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Escribe la propuesta aqui…' }),
    ],
    content: mdToHtml(displayContent || proposal),
    editable: editing,
  });

  // Update editor content when displayContent changes
  useEffect(() => {
    if (editor && displayContent) {
      editor.commands.setContent(mdToHtml(displayContent));
    }
  }, [displayContent, editor]);

  // Toggle editable mode
  useEffect(() => {
    if (editor) {
      editor.setEditable(editing);
    }
  }, [editing, editor]);

  const handleCopy = async () => {
    const text = editor ? editor.getText() : proposal;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPdf = async () => {
    if (!proposalRef.current) return;
    setExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const clientName = extractedInfo?.clientName || 'cliente';
      const date = new Date().toISOString().split('T')[0];
      await html2pdf()
        .set({
          margin: [15, 15, 15, 15],
          filename: `propuesta-${clientName}-${date}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        })
        .from(proposalRef.current)
        .save();
    } catch (err) {
      console.error('Error exporting PDF:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = () => {
    const content = editing ? (editor ? editor.getText() : displayContent) : displayContent;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `propuesta-${extractedInfo?.clientName || 'cliente'}-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    onSave({
      id: proposalId,
      content: editor ? editor.getText() : proposal,
      clientId: extractedInfo?.clientId,
      clientName: extractedInfo?.clientName,
      company: extractedInfo?.company,
      createdAt: new Date().toISOString()
    });
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !proposalId) return;
    await onSendMessage(chatInput.trim());
    setChatInput('');
  };

  // Editable title
  const defaultTitle = extractedInfo?.clientName
    ? `Propuesta para ${extractedInfo.clientName}`
    : 'Propuesta comercial';
  const [proposalTitle, setProposalTitle] = useState(defaultTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const titleInputRef = useRef(null);

  useEffect(() => {
    setProposalTitle(defaultTitle);
  }, [extractedInfo?.clientName]);

  const saveTitle = async () => {
    setEditingTitle(false);
    if (proposalId && proposalTitle.trim()) {
      try {
        await authFetch(`${API_BASE}/api/proposals/${proposalId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: proposalTitle.trim() }),
        });
      } catch (err) {
        console.error('Error saving title:', err);
      }
    }
  };

  const heroDescription = [extractedInfo?.clientName, extractedInfo?.company]
    .filter(Boolean)
    .join(' — ');

  const iconBtnStyle = {
    width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.1)', color: '#fff', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s',
  };

  const iconBtnActiveStyle = {
    ...iconBtnStyle,
    background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)',
  };

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1b5e3b 0%, #0f4a2a 50%, #0a2f1c 100%)',
        padding: '40px 32px 48px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -40, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: '30%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 8 }}>
            Propuesta comercial
          </div>
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={proposalTitle}
              onChange={(e) => setProposalTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setProposalTitle(defaultTitle); setEditingTitle(false); } }}
              autoFocus
              style={{
                color: '#fff', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em',
                lineHeight: 1.2, marginBottom: 8, background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8,
                padding: '4px 12px', outline: 'none', width: '100%', fontFamily: 'inherit',
              }}
            />
          ) : (
            <h1
              onClick={() => setEditingTitle(true)}
              style={{
                color: '#fff', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em',
                marginBottom: 8, lineHeight: 1.2, cursor: 'pointer',
                borderBottom: '1px dashed rgba(255,255,255,0.3)', paddingBottom: 4,
              }}
              title="Click para editar el titulo"
            >
              {proposalTitle}
            </h1>
          )}
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9375rem', marginBottom: 28, maxWidth: 480 }}>
            {heroDescription || 'Propuesta generada con IA'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Back button */}
            <button
              onClick={onBack}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.3)', background: 'transparent',
                color: '#fff', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Icons.ArrowLeft />
              Volver al cliente
            </button>

            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

            {/* Edit toggle */}
            <button
              onClick={() => setEditing(!editing)}
              style={{
                ...(editing ? iconBtnActiveStyle : iconBtnStyle),
                width: 'auto', padding: '0 14px', gap: 6,
                fontSize: '0.8125rem', fontWeight: 500,
              }}
            >
              <Icons.Edit />
              {editing ? 'Editando' : 'Editar'}
            </button>

            {/* Copy */}
            <button
              onClick={handleCopy}
              style={{
                ...iconBtnStyle,
                width: 'auto', padding: '0 14px', gap: 6,
                fontSize: '0.8125rem', fontWeight: 500,
              }}
            >
              {copied ? <Icons.Check /> : <Icons.Copy />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              style={{
                ...iconBtnStyle,
                width: 'auto', padding: '0 14px', gap: 6,
                fontSize: '0.8125rem', fontWeight: 500,
              }}
            >
              <Icons.Download />
              Descargar
            </button>

            {/* Export PDF */}
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              style={{
                ...iconBtnStyle,
                width: 'auto', padding: '0 14px', gap: 6,
                fontSize: '0.8125rem', fontWeight: 500,
                ...(exporting ? { opacity: 0.5, pointerEvents: 'none' } : {}),
              }}
            >
              <Icons.FileText />
              {exporting ? 'Exportando...' : 'PDF'}
            </button>

            {/* Email */}
            <button
              onClick={() => setShowEmailModal(true)}
              style={{
                ...iconBtnStyle,
                width: 'auto', padding: '0 14px', gap: 6,
                fontSize: '0.8125rem', fontWeight: 500,
              }}
            >
              <Icons.Mail />
              Email
            </button>

            {/* Version selector */}
            {versions.length > 0 && (
              <>
                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8125rem' }}>Version:</span>
                  <select
                    value={selectedVersionIdx}
                    onChange={(e) => handleVersionChange(Number(e.target.value))}
                    style={{
                      background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 6, padding: '4px 8px', fontSize: '0.8125rem', cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {versions.map((v, i) => (
                      <option key={v.id || i} value={i} style={{ color: '#0a2f1c' }}>
                        v{v.version}{i === 0 ? ' (actual)' : ''}{v.createdAt ? ` · ${new Date(v.createdAt).toLocaleDateString('es-ES')}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Compare button */}
            {versions.length >= 2 && (
              <button
                onClick={() => setShowComparison(!showComparison)}
                style={{
                  ...(showComparison ? iconBtnActiveStyle : iconBtnStyle),
                  width: 'auto', padding: '0 14px', gap: 6,
                  fontSize: '0.8125rem', fontWeight: 500,
                }}
                title="Comparar versiones"
              >
                <Icons.Eye />
                Comparar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 32px 48px' }}>
        {/* Main layout: proposal + chat side by side */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Proposal Content Card */}
          <div style={{ flex: '1 1 600px', minWidth: 0 }}>
            <div style={{
              background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}>
              {/* Editor toolbar when editing */}
              {editing && (
                <div style={{
                  borderBottom: '1px solid #e5e7eb', padding: '8px 16px',
                  background: '#f9fafb',
                }}>
                  <EditorToolbar editor={editor} />
                </div>
              )}

              {/* Proposal text */}
              <div
                ref={proposalRef}
                style={{
                  padding: '32px 32px 40px',
                  minHeight: 400,
                  outline: editing ? '2px solid #1b5e3b' : 'none',
                  outlineOffset: -2,
                  borderRadius: editing ? 0 : undefined,
                  transition: 'outline 0.15s',
                }}
                className="proposal-markdown"
              >
                <EditorContent editor={editor} />
              </div>

              {/* Save button at the bottom of the card */}
              <div style={{
                borderTop: '1px solid #e5e7eb', padding: '16px 32px',
                display: 'flex', justifyContent: 'flex-end', background: '#f9fafb',
              }}>
                <Button
                  onClick={handleSave}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'linear-gradient(135deg, #1b5e3b 0%, #0f4a2a 100%)',
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '10px 24px', fontSize: '0.875rem', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Icons.Check />
                  Guardar propuesta
                </Button>
              </div>
            </div>
          </div>

          {/* AI Chat Panel */}
          <div style={{ flex: '0 0 360px', minWidth: 300 }}>
            <div style={{
              background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
              display: 'flex', flexDirection: 'column', height: 600,
            }}>
              {/* Chat header */}
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#111827', marginBottom: 2 }}>
                  Editar con IA
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                  Describe que quieres cambiar y la IA actualizara la propuesta
                </div>
              </div>

              {/* Chat messages */}
              <div style={{
                flex: 1, overflow: 'auto', padding: '16px 16px 8px',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                {messages && messages.length > 0 ? (
                  messages.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div style={{
                        maxWidth: '85%',
                        padding: '10px 14px',
                        borderRadius: 12,
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                        ...(m.role === 'user'
                          ? {
                            background: '#1b5e3b', color: '#fff',
                            borderBottomRightRadius: 4,
                          }
                          : {
                            background: '#f3f4f6', color: '#374151',
                            borderBottomLeftRadius: 4,
                          }
                        ),
                      }}>
                        <div style={{
                          fontSize: '0.6875rem', fontWeight: 600, marginBottom: 4,
                          color: m.role === 'user' ? 'rgba(255,255,255,0.7)' : '#9ca3af',
                        }}>
                          {m.role === 'user' ? 'Tu' : 'IA'}
                        </div>
                        <div>{m.content}</div>
                        {m.role === 'assistant' && m.fullContent && (
                          <button
                            onClick={() => {
                              setDisplayContent(m.fullContent);
                              if (editor) {
                                editor.commands.setContent(mdToHtml(m.fullContent));
                              }
                              setSelectedVersionIdx(0);
                            }}
                            style={{
                              marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '6px 12px', borderRadius: 6,
                              background: '#1b5e3b', color: '#fff', border: 'none',
                              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            <Icons.Check />
                            Aplicar al editor
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#9ca3af', textAlign: 'center', padding: '24px 16px',
                  }}>
                    <div style={{ marginBottom: 12, opacity: 0.5 }}>
                      <Icons.MessageText />
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: 6 }}>
                      Sin ediciones todavia
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#9ca3af', lineHeight: 1.5 }}>
                      Ej: &quot;Haz el resumen mas corto&quot;, &quot;Anade una seccion de ROI&quot;, &quot;Cambia el tono a mas formal&quot;
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div style={{
                borderTop: '1px solid #e5e7eb', padding: '12px 16px',
              }}>
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ej: Haz el resumen mas corto y enfatiza el ROI..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleChatSend();
                    }
                  }}
                  style={{
                    width: '100%', minHeight: 60, maxHeight: 120, resize: 'vertical',
                    border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px',
                    fontSize: '0.875rem', lineHeight: 1.5, outline: 'none',
                    fontFamily: 'inherit', background: '#f9fafb',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1b5e3b'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginTop: 8,
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {chatInput.length} caracteres
                  </span>
                  <Button
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || sending}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: (!chatInput.trim() || sending) ? '#e5e7eb' : 'linear-gradient(135deg, #1b5e3b 0%, #0f4a2a 100%)',
                      color: (!chatInput.trim() || sending) ? '#9ca3af' : '#fff',
                      border: 'none', borderRadius: 8,
                      padding: '8px 16px', fontSize: '0.8125rem', fontWeight: 600,
                      cursor: (!chatInput.trim() || sending) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Icons.Sparkles />
                    {sending ? 'Aplicando cambios...' : 'Enviar'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Version History Panel */}
            {versions.length > 0 && (
              <div style={{
                marginTop: 16, background: '#fff', borderRadius: 12,
                border: '1px solid #e5e7eb', overflow: 'hidden',
              }}>
                <button
                  type="button"
                  onClick={() => setHistorialOpen(o => !o)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: historialOpen ? '1px solid #e5e7eb' : 'none',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#111827' }}>
                    Historial de versiones
                  </span>
                  <span style={{
                    color: '#9ca3af', fontSize: '0.75rem',
                    display: 'inline-block', transform: historialOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s',
                  }}>▼</span>
                </button>
                {historialOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {versions.map((v, i) => {
                      const isSelected = selectedVersionIdx === i;
                      const isLatest = i === 0;
                      const isOriginal = i === versions.length - 1 && versions.length > 1;
                      return (
                        <button
                          key={v.id || i}
                          type="button"
                          onClick={() => handleVersionChange(i)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 20px', border: 'none',
                            background: isSelected ? '#eef2ff' : '#fff',
                            cursor: 'pointer', textAlign: 'left',
                            borderBottom: i < versions.length - 1 ? '1px solid #f3f4f6' : 'none',
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f9fafb'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#eef2ff' : '#fff'; }}
                        >
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                            background: isSelected ? '#1b5e3b' : '#e5e7eb',
                            color: isSelected ? '#fff' : '#6b7280', flexShrink: 0,
                          }}>
                            v{v.version ?? i + 1}
                          </span>
                          <span style={{ fontSize: '0.8125rem', color: isSelected ? '#0f4a2a' : '#374151', flex: 1 }}>
                            {isLatest ? 'Actual' : isOriginal ? 'Original' : `Versión ${v.version ?? i + 1}`}
                          </span>
                          {v.createdAt && (
                            <span style={{ fontSize: '0.7rem', color: '#9ca3af', flexShrink: 0 }}>
                              {new Date(v.createdAt).toLocaleDateString('es-ES')}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Version Comparison */}
        {showComparison && versions.length >= 2 && (
          <div style={{
            marginTop: 24, background: '#fff', borderRadius: 12,
            border: '1px solid #e5e7eb', overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', margin: 0 }}>
                Comparar versiones
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <select
                  value={compareVersionA}
                  onChange={(e) => setCompareVersionA(Number(e.target.value))}
                  style={{
                    border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 8px',
                    fontSize: '0.8125rem', outline: 'none', background: '#fff',
                  }}
                >
                  {versions.map((v, i) => <option key={i} value={i}>v{v.version}</option>)}
                </select>
                <span style={{ color: '#9ca3af', fontSize: '0.8125rem' }}>vs</span>
                <select
                  value={compareVersionB}
                  onChange={(e) => setCompareVersionB(Number(e.target.value))}
                  style={{
                    border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 8px',
                    fontSize: '0.8125rem', outline: 'none', background: '#fff',
                  }}
                >
                  {versions.map((v, i) => <option key={i} value={i}>v{v.version}</option>)}
                </select>
                <button
                  onClick={() => setShowComparison(false)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#6b7280', padding: 4, display: 'flex',
                  }}
                  aria-label="Cerrar comparacion"
                >
                  <Icons.X />
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 0 }}>
              <div style={{ flex: 1, borderRight: '1px solid #e5e7eb' }}>
                <div style={{
                  padding: '8px 16px', background: '#f3f4f6',
                  fontSize: '0.8125rem', fontWeight: 600, color: '#1b5e3b',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  v{versions[compareVersionA]?.version ?? compareVersionA + 1}
                </div>
                <div style={{ padding: '24px' }} className="proposal-markdown">
                  <div dangerouslySetInnerHTML={{ __html: mdToHtml(versions[compareVersionA]?.content || '') }} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  padding: '8px 16px', background: '#f3f4f6',
                  fontSize: '0.8125rem', fontWeight: 600, color: '#1b5e3b',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  v{versions[compareVersionB]?.version ?? compareVersionB + 1}
                </div>
                <div style={{ padding: '24px' }} className="proposal-markdown">
                  <div dangerouslySetInnerHTML={{ __html: mdToHtml(versions[compareVersionB]?.content || '') }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div
          onClick={() => setShowEmailModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16, maxWidth: 520, width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
            }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                Enviar por email
              </h2>
              <button
                onClick={() => setShowEmailModal(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#6b7280', padding: 4, display: 'flex', borderRadius: 6,
                }}
                aria-label="Cerrar"
              >
                <Icons.X />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Destinatario *
                </label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="email@ejemplo.com"
                  autoFocus
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                    borderRadius: 8, fontSize: '0.875rem', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Asunto
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Asunto del email"
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                    borderRadius: 8, fontSize: '0.875rem', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Mensaje
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={5}
                  placeholder="Escribe el mensaje..."
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                    borderRadius: 8, fontSize: '0.875rem', outline: 'none',
                    fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {emailStatus === 'success' && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: '#ecfdf5', color: '#059669', fontSize: '0.875rem',
                  fontWeight: 500, marginBottom: 12,
                }}>
                  Email enviado correctamente
                </div>
              )}
              {emailStatus && emailStatus !== 'success' && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: '#fef2f2', color: '#dc2626', fontSize: '0.875rem',
                  fontWeight: 500, marginBottom: 12,
                }}>
                  {emailStatus}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              padding: '16px 24px', borderTop: '1px solid #e5e7eb', background: '#f9fafb',
            }}>
              <Button
                onClick={() => setShowEmailModal(false)}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: '1px solid #d1d5db',
                  background: '#fff', color: '#374151', fontSize: '0.875rem',
                  fontWeight: 500, cursor: 'pointer',
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={!emailTo.trim() || emailSending}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: (!emailTo.trim() || emailSending)
                    ? '#e5e7eb'
                    : 'linear-gradient(135deg, #1b5e3b 0%, #0f4a2a 100%)',
                  color: (!emailTo.trim() || emailSending) ? '#9ca3af' : '#fff',
                  fontSize: '0.875rem', fontWeight: 600, cursor: (!emailTo.trim() || emailSending) ? 'not-allowed' : 'pointer',
                }}
              >
                <Icons.Send />
                {emailSending ? 'Enviando...' : 'Enviar email'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProposalScreen;
