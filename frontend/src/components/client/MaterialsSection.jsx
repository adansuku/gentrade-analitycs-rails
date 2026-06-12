import { useState } from 'react';
import { Icons } from '../ui/Icons';
import { Button } from '@/components/ui/button';
import { formatDuration, formatDate, formatMaterialType } from '../../lib/formatters';
import { getMaterialIcon, getMaterialIconColor, organizeMaterials } from '../../lib/materialUtils';
import MaterialTextPreview from '../ui/MaterialTextPreview';

const ALL_MATERIAL_TYPES = ['EMAIL', 'CSV', 'XLSX', 'AUDIO', 'TRANSCRIPT', 'PDF', 'TXT', 'DOCX', 'NOTE', 'OTHER'];

function formatFileSize(bytes) {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MaterialsSection({
  materials,
  materialsLoading,
  onAddMaterial,
  onUploadFile,
  onDeleteMaterial,
  uploadProgress,
  searchQuery,
  setSearchQuery,
  searchResults,
  setSearchResults,
  searching,
  onSemanticSearch,
  isRecording,
  audioBlob,
  audioUrl,
  duration,
  error,
  onRecordClick,
  onPlayPause,
  onSaveAudio,
  isPlaying,
  audioRef,
  resetRecording,
  showTextInput,
  setShowTextInput,
  textContent,
  setTextContent,
  materialType,
  setMaterialType,
  materialTitle,
  setMaterialTitle,
  onTextSubmit,
  driveConfigured,
  driveAuthenticated,
  showDrivePicker,
  setShowDrivePicker,
  driveFiles,
  driveLoading,
  driveSearch,
  setDriveSearch,
  driveFolderStack,
  driveImporting,
  onConnectDrive,
  onDisconnectDrive,
  onDriveSearch,
  onNavigateDriveFolder,
  onNavigateDriveBack,
  onDriveImport,
  onOpenDrivePicker,
  viewerOpen,
  activeMaterial,
  onOpenMaterial,
  onCloseMaterial,
  prevMaterial,
  nextMaterial,
  renderMaterialPreview,
  fileInputRef,
  onFileUpload,
}) {
  // Shared styles
  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid #e5e7eb', fontSize: '0.875rem',
    background: '#f8f9fb', color: '#111827', outline: 'none',
    transition: 'border-color 0.15s',
  };

  const selectStyle = {
    ...inputStyle, appearance: 'none',
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%239ca3af\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32,
  };

  const getMaterialIconBg = (type) => {
    const colors = {
      EMAIL: '#eff6ff', AUDIO: '#f5f3ff', TRANSCRIPT: '#faf5ff',
      PDF: '#fef2f2', CSV: '#ecfdf5', XLSX: '#ecfdf5',
      TXT: '#f9fafb', DOCX: '#eff6ff', NOTE: '#fffbeb', OTHER: '#f9fafb',
    };
    return colors[type] || '#f9fafb';
  };

  // T019: Type filter state
  const [activeTypeFilter, setActiveTypeFilter] = useState(null);

  // Compute type counts for filter chips
  const typeCounts = {};
  for (const m of materials) {
    const t = m.type || 'OTHER';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  // ========================
  // TEXT INPUT MODAL
  // ========================
  if (showTextInput) {
    return (
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Modal overlay */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px', borderBottom: '1px solid #f0f1f5',
            }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: 0 }}>Agregar material</h2>
              <button
                onClick={() => setShowTextInput(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: '#9ca3af', display: 'flex', borderRadius: 6,
                }}
                aria-label="Cerrar"
              >
                <Icons.X />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px', overflow: 'auto', flex: 1 }}>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 20, marginTop: 0 }}>
                Pega emails, notas, transcripciones o cualquier texto relevante
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: 6 }}>Tipo de material</label>
                  <select value={materialType} onChange={(e) => setMaterialType(e.target.value)} style={selectStyle}>
                    <option value="NOTE">Nota</option>
                    <option value="EMAIL">Email</option>
                    <option value="TRANSCRIPT">Transcripcion</option>
                    <option value="TXT">Texto</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: 6 }}>Titulo (opcional)</label>
                  <input
                    type="text"
                    value={materialTitle}
                    onChange={(e) => setMaterialTitle(e.target.value)}
                    placeholder="Ej. Email de Juan"
                    style={inputStyle}
                  />
                </div>
              </div>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                style={{
                  ...inputStyle, minHeight: 200, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
                }}
                placeholder={'Ejemplo:\n\nCliente: Hola, necesitamos automatizar nuestro proceso de ventas. Perdemos mucho tiempo en seguimientos manuales.\n\nYo: Perfecto, puedo ayudarte. Que herramientas usais actualmente?\n\nCliente: Usamos un CRM basico, pero no tiene automatizaciones. Nuestro equipo de 10 comerciales pierde horas cada semana en tareas repetitivas...'}
                autoFocus
              />
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 24px', borderTop: '1px solid #f0f1f5',
            }}>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{textContent.length} caracteres</span>
              <Button
                onClick={onTextSubmit}
                disabled={!textContent.trim()}
                style={{
                  background: !textContent.trim() ? '#e5e7eb' : '#1b5e3b', color: !textContent.trim() ? '#9ca3af' : '#fff',
                  border: 'none', fontWeight: 600, padding: '10px 20px', fontSize: '0.875rem', borderRadius: 8,
                  cursor: !textContent.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                <Icons.Check />
                Guardar material
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========================
  // MATERIALS TAB CONTENT
  // ========================
  return (
    <>
      <div style={{ padding: 20 }}>
        {/* Upload progress */}
        {uploadProgress.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {uploadProgress.map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                fontSize: '0.8125rem', color: i === uploadProgress.length - 1 ? '#1b5e3b' : '#059669',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: i === uploadProgress.length - 1 ? '#1b5e3b' : '#059669',
                }} />
                <span>{p.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* T021: Quick action bar */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto',
          paddingBottom: 4,
        }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', background: '#1b5e3b', color: '#fff',
              border: 'none', borderRadius: 10, cursor: 'pointer',
              fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(27, 94, 59, 0.25)', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#0f4a2a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#1b5e3b'; }}
          >
            <Icons.Upload />
            Subir archivo
          </button>
          <button
            onClick={onRecordClick}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', background: isRecording ? '#c84545' : '#f7f4ef',
              color: isRecording ? '#fff' : '#1b5e3b',
              border: isRecording ? 'none' : '1px solid rgba(17, 18, 16, 0.08)', borderRadius: 10, cursor: 'pointer',
              fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
          >
            {isRecording ? <Icons.Stop /> : <Icons.Mic />}
            {isRecording ? 'Detener' : 'Grabar audio'}
          </button>
          <button
            onClick={() => setShowTextInput(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', background: '#faf3e4',
              color: '#a87a1f', border: '1px solid rgba(200, 150, 58, 0.3)', borderRadius: 10,
              cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem',
              whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
          >
            <Icons.Edit />
            Escribir nota
          </button>
          {driveConfigured && (
            <button
              onClick={onOpenDrivePicker}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', background: '#eaf3ed',
                color: '#1b5e3b', border: '1px solid #c5dece', borderRadius: 10,
                cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem',
                whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2L2 19.5h20L12 2z" fill="#4285F4" opacity="0.8"/>
                <path d="M2 19.5l5-8.5h10l5 8.5H2z" fill="#0F9D58" opacity="0.8"/>
                <path d="M7 11L12 2l5 9H7z" fill="#FBBC04" opacity="0.8"/>
              </svg>
              Importar de Drive
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.pdf,.txt,.docx,audio/*"
          onChange={onFileUpload}
          style={{ display: 'none' }}
        />

        {/* Semantic search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#f8f9fb', borderRadius: 8, padding: '4px 12px', marginBottom: 16,
          border: '1px solid #e5e7eb',
        }}>
          <span style={{ color: '#9ca3af' }}><Icons.Search /></span>
          <input
            type="text"
            placeholder="Busqueda semantica en materiales..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSemanticSearch(); }}
            style={{
              flex: 1, border: 'none', background: 'none', outline: 'none',
              padding: '8px 0', fontSize: '0.875rem', color: '#111827',
            }}
          />
          {searchQuery && (
            <button
              onClick={onSemanticSearch}
              disabled={searching}
              style={{
                background: '#1b5e3b', color: '#fff', border: 'none', borderRadius: 6,
                padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {searching ? '...' : 'Buscar'}
            </button>
          )}
          {searchResults && (
            <button
              onClick={() => { setSearchResults(null); setSearchQuery(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2, display: 'flex' }}
              aria-label="Cerrar"
            >
              <Icons.X />
            </button>
          )}
        </div>

        {/* Search results */}
        {searchResults && (
          <div style={{ marginBottom: 16 }}>
            <strong style={{ fontSize: '0.8125rem', color: '#374151' }}>{searchResults.length} resultados</strong>
            {searchResults.map((r, i) => (
              <div key={i} style={{
                padding: '10px 12px', marginTop: 8, background: '#f8f9fb', borderRadius: 8,
                border: '1px solid #e5e7eb',
              }}>
                <p style={{ fontSize: '0.8125rem', color: '#374151', margin: '0 0 4px', lineHeight: 1.5 }}>
                  {r.text?.slice(0, 200)}&hellip;
                </p>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  {r.materialTitle || r.materialType || 'Material'} - Score: {r.score?.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Audio recorder */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          padding: '20px 0', marginBottom: 16,
        }}>
          <button
            onClick={onRecordClick}
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: isRecording ? '#ef4444' : '#1b5e3b',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', position: 'relative',
              boxShadow: isRecording ? '0 0 0 8px rgba(239,68,68,0.15)' : '0 4px 12px rgba(79,70,229,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {isRecording ? <Icons.Stop /> : <Icons.Mic />}
            {isRecording && (
              <div style={{
                position: 'absolute', inset: -8, borderRadius: '50%',
                border: '2px solid rgba(239,68,68,0.4)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            )}
          </button>
          <div style={{ fontSize: '0.8125rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
            {isRecording ? (
              <>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
                  display: 'inline-block', animation: 'pulse 1s ease-in-out infinite',
                }} />
                Grabando... {formatDuration(duration)}
              </>
            ) : audioBlob ? (
              `Grabacion completada - ${formatDuration(duration)}`
            ) : (
              'Pulsa para grabar una llamada o nota de voz'
            )}
          </div>
          {error && <div style={{ fontSize: '0.8125rem', color: '#ef4444' }}>{error}</div>}
        </div>

        {/* Audio preview */}
        {audioUrl && !isRecording && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', background: '#f8f9fb', borderRadius: 8,
            border: '1px solid #e5e7eb', marginBottom: 12,
          }}>
            <audio ref={audioRef} src={audioUrl} onEnded={() => {}} />
            <button
              onClick={onPlayPause}
              style={{
                width: 36, height: 36, borderRadius: '50%', background: '#1b5e3b', color: '#fff',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Icons.Pause /> : <Icons.Play />}
            </button>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.8125rem', color: '#374151', display: 'block' }}>Escuchar grabacion</span>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{formatDuration(duration)}</span>
            </div>
            <button
              onClick={resetRecording}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 4, display: 'flex' }}
              aria-label="Eliminar"
            >
              <Icons.Trash />
            </button>
          </div>
        )}

        {audioBlob && !isRecording && (
          <Button
            onClick={onSaveAudio}
            style={{
              width: '100%', background: '#1b5e3b', color: '#fff', border: 'none',
              fontWeight: 600, padding: '10px 20px', fontSize: '0.875rem', borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <Icons.Check />
            Guardar audio
          </Button>
        )}

        {/* T019: Type filter bar */}
        {materials.length > 0 && (
          <div style={{
            display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto',
            paddingBottom: 4, flexWrap: 'wrap',
          }}>
            <button
              onClick={() => setActiveTypeFilter(null)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 20, border: 'none',
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                background: activeTypeFilter === null ? '#1b5e3b' : '#f3f4f6',
                color: activeTypeFilter === null ? '#fff' : '#6b7280',
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              Todos
              <span style={{
                background: activeTypeFilter === null ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
                borderRadius: 10, padding: '1px 7px', fontSize: '0.6875rem',
                color: activeTypeFilter === null ? '#fff' : '#6b7280',
              }}>{materials.length}</span>
            </button>
            {ALL_MATERIAL_TYPES.filter(t => typeCounts[t]).map(type => {
              const isActive = activeTypeFilter === type;
              const iconColor = getMaterialIconColor(type);
              return (
                <button
                  key={type}
                  onClick={() => setActiveTypeFilter(isActive ? null : type)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 20, border: 'none',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                    background: isActive ? iconColor : '#f3f4f6',
                    color: isActive ? '#fff' : '#6b7280',
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}
                >
                  {formatMaterialType(type)}
                  <span style={{
                    background: isActive ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
                    borderRadius: 10, padding: '1px 7px', fontSize: '0.6875rem',
                    color: isActive ? '#fff' : '#6b7280',
                  }}>{typeCounts[type]}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Materials list */}
        <div style={{ minHeight: 300 }}>
          {materialsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
              <div style={{ height: 12, background: '#f3f4f6', borderRadius: 6, width: '100%' }} />
              <div style={{ height: 12, background: '#f3f4f6', borderRadius: 6, width: '60%' }} />
              <div style={{ height: 48, background: '#f3f4f6', borderRadius: 8, width: '100%', marginTop: 8 }} />
            </div>
          ) : materials.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9ca3af' }}>
              <div style={{ marginBottom: 8 }}><Icons.FileText /></div>
              <p style={{ fontWeight: 600, color: '#6b7280', margin: '0 0 4px' }}>Sin materiales todavia</p>
              <span style={{ fontSize: '0.8125rem' }}>Sube emails, documentos, audios o pega texto del cliente. La IA los usara para generar la propuesta.</span>
            </div>
          ) : (() => {
            const filteredMaterials = activeTypeFilter ? materials.filter(m => (m.type || 'OTHER') === activeTypeFilter) : materials;
            const { audioPairs, otherGroups } = organizeMaterials(filteredMaterials);
            return (
              <>
                {/* Audio + Transcription pairs */}
                {audioPairs.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 0', marginBottom: 4,
                      fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      <Icons.Mic />
                      <span>Audios y transcripciones</span>
                      <span style={{
                        background: '#f3f4f6', borderRadius: 10, padding: '2px 8px',
                        fontSize: '0.6875rem', fontWeight: 600, color: '#6b7280',
                      }}>{audioPairs.length}</span>
                    </div>
                    {audioPairs.map(({ audio, transcript }) => (
                      <div
                        key={audio.id}
                        onClick={() => onOpenMaterial({ ...audio, _transcript: transcript })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                          border: '1px solid transparent', transition: 'all 0.15s',
                          marginBottom: 4,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fb'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: getMaterialIconBg('AUDIO'), color: getMaterialIconColor('AUDIO'),
                        }}>
                          <Icons.Mic />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827', marginBottom: 2 }}>{audio.title || 'Audio'}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#9ca3af' }}>
                            {transcript && (
                              <span style={{
                                background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: 4, fontSize: '0.6875rem', fontWeight: 500,
                              }}>Transcrito</span>
                            )}
                            {audio.embeddingStatus === 'done' && (
                              <span style={{
                                background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: 4, fontSize: '0.6875rem', fontWeight: 500,
                              }}>Indexado</span>
                            )}
                            <span>{formatDate(audio.createdAt)}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteMaterial(audio.id); if (transcript) onDeleteMaterial(transcript.id); }}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 4, display: 'flex',
                            opacity: 0, transition: 'opacity 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = '#ef4444'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; e.currentTarget.style.color = '#d1d5db'; }}
                          aria-label="Eliminar audio"
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Other materials grouped by type */}
                {otherGroups.map(group => (
                  <div key={group.type} style={{ marginBottom: 16 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 0', marginBottom: 4,
                      fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {(() => { const Icon = getMaterialIcon(group.type); return <Icon />; })()}
                      <span>{group.label}</span>
                      <span style={{
                        background: '#f3f4f6', borderRadius: 10, padding: '2px 8px',
                        fontSize: '0.6875rem', fontWeight: 600, color: '#6b7280',
                      }}>{group.materials.length}</span>
                    </div>
                    {group.materials.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => onOpenMaterial(m)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                          border: '1px solid transparent', transition: 'all 0.15s',
                          marginBottom: 4,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fb'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: getMaterialIconBg(m.type), color: getMaterialIconColor(m.type),
                        }}>
                          {(() => { const Icon = getMaterialIcon(m.type); return <Icon />; })()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827', marginBottom: 2 }}>{m.title || m.type}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#9ca3af' }}>
                            {m.embeddingStatus && m.embeddingStatus !== 'pending' && (
                              <span style={{
                                padding: '1px 6px', borderRadius: 4, fontSize: '0.6875rem', fontWeight: 500,
                                background: m.embeddingStatus === 'done' ? '#dcfce7' : m.embeddingStatus === 'processing' ? '#fef3c7' : '#fee2e2',
                                color: m.embeddingStatus === 'done' ? '#15803d' : m.embeddingStatus === 'processing' ? '#d97706' : '#dc2626',
                              }}>
                                {m.embeddingStatus === 'done' ? 'Indexado' : m.embeddingStatus === 'processing' ? 'Indexando...' : m.embeddingStatus === 'failed' ? 'Error' : ''}
                              </span>
                            )}
                            <span>{formatDate(m.createdAt)}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteMaterial(m.id); }}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 4, display: 'flex',
                            opacity: 0, transition: 'opacity 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = '#ef4444'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; e.currentTarget.style.color = '#d1d5db'; }}
                          aria-label="Eliminar"
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      </div>

      {/* ===================== MATERIAL VIEWER OVERLAY ===================== */}
      {viewerOpen && (
        <div
          onClick={onCloseMaterial}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '90vh',
              display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              overflow: 'hidden', overscrollBehavior: 'contain',
            }}
          >
            {/* Viewer header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 24px', borderBottom: '1px solid #f0f1f5',
            }}>
              <div>
                <strong style={{ fontSize: '0.9375rem', color: '#111827', display: 'block' }}>{activeMaterial?.title || 'Material'}</strong>
                <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>{formatMaterialType(activeMaterial?.type || '')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => prevMaterial && onOpenMaterial(prevMaterial)}
                  disabled={!prevMaterial}
                  style={{
                    background: 'none', border: '1px solid #e5e7eb', borderRadius: 6,
                    padding: '6px 8px', cursor: prevMaterial ? 'pointer' : 'not-allowed',
                    color: prevMaterial ? '#374151' : '#d1d5db', display: 'flex',
                  }}
                  title="Anterior"
                  aria-label="Anterior"
                >
                  <Icons.ArrowLeft />
                </button>
                <button
                  onClick={() => nextMaterial && onOpenMaterial(nextMaterial)}
                  disabled={!nextMaterial}
                  style={{
                    background: 'none', border: '1px solid #e5e7eb', borderRadius: 6,
                    padding: '6px 8px', cursor: nextMaterial ? 'pointer' : 'not-allowed',
                    color: nextMaterial ? '#374151' : '#d1d5db', display: 'flex',
                  }}
                  title="Siguiente"
                  aria-label="Siguiente"
                >
                  <Icons.ArrowRight />
                </button>
                <button
                  onClick={onCloseMaterial}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 4, color: '#9ca3af', display: 'flex', marginLeft: 4,
                  }}
                  aria-label="Cerrar"
                >
                  <Icons.X />
                </button>
              </div>
            </div>
            {/* Viewer body */}
            <div style={{ padding: '16px 24px', overflow: 'auto', flex: 1 }}>
              {renderMaterialPreview()}
            </div>
          </div>
        </div>
      )}

      {/* ===================== GOOGLE DRIVE PICKER MODAL ===================== */}
      {showDrivePicker && (
        <div
          onClick={() => setShowDrivePicker(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '80vh',
              display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              overflow: 'hidden',
            }}
          >
            {/* Drive header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 24px', borderBottom: '1px solid #f0f1f5',
            }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: 0 }}>Google Drive</h2>
                <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                  {driveAuthenticated
                    ? driveFolderStack.length > 0
                      ? driveFolderStack.map(f => f.name).join(' / ')
                      : 'Tus archivos y carpetas compartidas'
                    : 'Conecta tu cuenta de Google'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {driveAuthenticated && (
                  <button
                    onClick={onDisconnectDrive}
                    style={{
                      background: 'none', border: '1px solid #e5e7eb', borderRadius: 6,
                      padding: '4px 10px', fontSize: '0.75rem', color: '#6b7280', cursor: 'pointer',
                    }}
                  >
                    Desconectar
                  </button>
                )}
                <button
                  onClick={() => setShowDrivePicker(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, display: 'flex' }}
                  aria-label="Cerrar"
                >
                  <Icons.X />
                </button>
              </div>
            </div>

            {!driveAuthenticated ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 16px', display: 'block' }} aria-hidden="true">
                  <path d="M12 2L2 19.5h20L12 2z" fill="#4285F4" opacity="0.8"/>
                  <path d="M2 19.5l5-8.5h10l5 8.5H2z" fill="#0F9D58" opacity="0.8"/>
                  <path d="M7 11L12 2l5 9H7z" fill="#FBBC04" opacity="0.8"/>
                </svg>
                <p style={{ marginBottom: 8, fontWeight: 600, color: '#111827' }}>Conecta tu cuenta de Google</p>
                <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: 24 }}>
                  Inicia sesion con tu cuenta @2bedigital.com para acceder a los archivos compartidos del equipo.
                </p>
                <button
                  onClick={onConnectDrive}
                  style={{
                    width: '100%', border: 'none', borderRadius: 12, padding: '14px 24px',
                    fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: 10,
                    background: 'linear-gradient(135deg, #4285F4, #34A853)', color: 'white',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/></svg>
                  Conectar con Google
                </button>
              </div>
            ) : (
              <>
                {/* Drive search */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  margin: '16px 24px 0', background: '#f8f9fb', borderRadius: 8,
                  padding: '4px 12px', border: '1px solid #e5e7eb',
                }}>
                  <span style={{ color: '#9ca3af' }}><Icons.Search /></span>
                  <input
                    type="text"
                    value={driveSearch}
                    onChange={(e) => setDriveSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onDriveSearch(); }}
                    placeholder="Buscar archivos..."
                    style={{
                      flex: 1, border: 'none', background: 'none', outline: 'none',
                      padding: '8px 0', fontSize: '0.875rem', color: '#111827',
                    }}
                  />
                </div>

                {driveFolderStack.length > 0 && (
                  <button
                    onClick={onNavigateDriveBack}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      margin: '12px 24px 0', background: 'none', border: 'none',
                      color: '#1b5e3b', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', padding: 0,
                    }}
                  >
                    <Icons.ArrowLeft /> Volver
                  </button>
                )}

                {/* Drive file list */}
                <div style={{ padding: '12px 24px', overflow: 'auto', flex: 1 }}>
                  {driveLoading ? (
                    <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: '0.875rem' }}>Cargando archivos...</div>
                  ) : driveFiles.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: '0.875rem' }}>No se encontraron archivos</div>
                  ) : (
                    driveFiles.map(file => (
                      <div
                        key={file.id}
                        onClick={() => file.isFolder ? onNavigateDriveFolder(file) : onDriveImport(file)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                          border: '1px solid transparent', transition: 'all 0.15s',
                          marginBottom: 2,
                          opacity: driveImporting === file.id ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fb'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                      >
                        <div style={{ fontSize: '1.25rem', width: 28, textAlign: 'center' }}>
                          {file.isFolder ? '\ud83d\udcc1' : file.mimeType?.includes('audio') ? '\ud83c\udf99\ufe0f' : file.mimeType?.includes('pdf') ? '\ud83d\udcc4' : file.mimeType?.includes('spreadsheet') || file.mimeType?.includes('csv') ? '\ud83d\udcca' : '\ud83d\udcce'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ fontSize: '0.875rem', color: '#111827', display: 'block' }}>{file.name}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                            {file.isFolder ? 'Carpeta' : file.size ? `${(file.size / 1024).toFixed(0)} KB` : ''}
                            {file.modifiedTime ? ` \u00b7 ${new Date(file.modifiedTime).toLocaleDateString('es-ES')}` : ''}
                          </span>
                        </div>
                        <div>
                          {driveImporting === file.id ? (
                            <span style={{ fontSize: '0.75rem', color: '#1b5e3b', fontWeight: 500 }}>Importando...</span>
                          ) : file.isFolder ? (
                            <span style={{ color: '#9ca3af' }}><Icons.ArrowRight /></span>
                          ) : (
                            <span style={{
                              fontSize: '0.75rem', color: '#1b5e3b', fontWeight: 600,
                              background: '#f5f3ff', padding: '4px 10px', borderRadius: 6,
                            }}>Importar</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pulse animation for recording */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
      `}</style>
    </>
  );
}

export default MaterialsSection;
