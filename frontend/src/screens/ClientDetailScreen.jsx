import { useState, useEffect, useRef } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import useClientSections from '../hooks/useClientSections.js';
import { Icons } from '../components/ui/Icons';
import { API_BASE } from '../lib/constants.js';
import { authFetch } from '../lib/api.js';
import MaterialTextPreview from '../components/ui/MaterialTextPreview';

// Section components
import { ClientHeader } from '../components/client/ClientHeader';
import WorkspaceLayout from '../components/client/workspace/WorkspaceLayout';
import WorkspaceSidebar from '../components/client/workspace/WorkspaceSidebar';
import { tokens } from '../components/client/workspace/tokens';
import { MaterialsSection } from '../components/client/MaterialsSection';
import { ProposalsSection } from '../components/client/ProposalsSection';
import { PurchasesSection } from '../components/client/PurchasesSection';
import { PreferencesSection } from '../components/client/PreferencesSection';
import { IntegrationsSection } from '../components/client/IntegrationsSection';
import { SummarySection } from '../components/client/SummarySection';
import { OpportunitiesSection } from '../components/client/OpportunitiesSection';
import MarketingActionsSection from '../components/client/MarketingActionsSection';
import ReportsTab from '../components/client/ReportsTab';
import { ClientChatPanel } from '../components/client/ClientChatPanel';

export function ClientDetailScreen({
  selectedClient,
  onBack,
  onEditClient,
  materials,
  materialsLoading = false,
  loadMaterials,
  onAddMaterial,
  onUploadFile,
  onDeleteMaterial,
  onGenerateProposal,
  generating,
  proposals,
  proposalsLoading = false,
  onOpenProposal,
  onDeleteProposal,
  onChangeStatus,
  uploadProgress = []
}) {
  // ─── Audio recorder ──────────────────────────────────────────────
  const {
    isRecording, audioBlob, audioUrl, duration, error,
    startRecording, stopRecording, resetRecording
  } = useAudioRecorder();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // ─── Section navigation ──────────────────────────────────────────
  const { activeSection, setActiveSection, getSectionCounts } = useClientSections('summary');

  // ─── Materials state ─────────────────────────────────────────────
  const [showTextInput, setShowTextInput] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [materialType, setMaterialType] = useState('NOTE');
  const [materialTitle, setMaterialTitle] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeMaterial, setActiveMaterial] = useState(null);
  const [materialPreviewLoading, setMaterialPreviewLoading] = useState(false);
  const fileInputRef = useRef(null);

  // ─── Sentiment & Summary ─────────────────────────────────────────
  const [sentimentSummary, setSentimentSummary] = useState(null);
  const [sentimentLoaded, setSentimentLoaded] = useState(false);
  const [executiveSummary, setExecutiveSummary] = useState(null);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  // ─── Purchases & Preferences ─────────────────────────────────────
  const [purchases, setPurchases] = useState([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [preferences, setPreferences] = useState([]);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [newPurchase, setNewPurchase] = useState({ productId: '', quantity: 1, unitPrice: '' });
  const [newPrefKey, setNewPrefKey] = useState('');
  const [newPrefValue, setNewPrefValue] = useState('');

  // ─── Search ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  // ─── Proposals ───────────────────────────────────────────────────
  const [selectedTemplate, setSelectedTemplate] = useState('general');
  const [connectedIntegrations, setConnectedIntegrations] = useState([]);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [proposalsAutoFocusTrigger, setProposalsAutoFocusTrigger] = useState(0);

  // ─── Google Drive ────────────────────────────────────────────────
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [driveConfigured, setDriveConfigured] = useState(false);
  const [driveSession, setDriveSession] = useState(() => sessionStorage.getItem('driveSession') || '');
  const [driveAuthenticated, setDriveAuthenticated] = useState(false);
  const [driveFiles, setDriveFiles] = useState([]);
  const [driveFolderStack, setDriveFolderStack] = useState([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveSearch, setDriveSearch] = useState('');
  const [driveImporting, setDriveImporting] = useState(null);

  // ═══════════════════════════════════════════════════════════════════
  // EFFECTS — data loading
  // ═══════════════════════════════════════════════════════════════════

  // Sentiment - solo cargar cuando se muestra la sidebar (summary siempre visible)
  const loadSentiment = () => {
    if (!selectedClient || sentimentLoaded) return;
    authFetch(`${API_BASE}/api/insights/sentiment/${selectedClient.id}/summary`)
      .then(r => r.json()).then(d => { setSentimentSummary(d); setSentimentLoaded(true); }).catch(() => {});
  };
  useEffect(() => { loadSentiment(); }, [selectedClient?.id]);

  // Executive summary - solo cargar cuando se entra en la sección summary
  const loadExecutiveSummary = async (force = false) => {
    if (!selectedClient) return;
    // Allow reload if forcing or not yet loaded
    if (!force && summaryLoaded && executiveSummary) return;
    setSummaryLoading(true);
    try {
      const url = force 
        ? `${API_BASE}/api/insights/summary/${selectedClient.id}?force=true`
        : `${API_BASE}/api/insights/summary/${selectedClient.id}`;
      const r = await authFetch(url);
      const data = await r.json();
      setExecutiveSummary(data);
      setSummaryLoaded(true);
    } catch { setExecutiveSummary(null); setSummaryLoaded(true); }
    finally { setSummaryLoading(false); }
  };
  useEffect(() => {
    if (activeSection === 'summary') loadExecutiveSummary();
  }, [activeSection, selectedClient?.id]);

  // Purchases (lazy)
  const loadPurchases = async () => {
    if (!selectedClient) return;
    setPurchasesLoading(true);
    try {
      const r = await authFetch(`${API_BASE}/api/clients/${selectedClient.id}/purchases`);
      setPurchases((await r.json()).purchases || []);
    } catch { setPurchases([]); }
    finally { setPurchasesLoading(false); }
  };

  // Preferences (lazy)
  const loadPreferences = async () => {
    if (!selectedClient) return;
    setPreferencesLoading(true);
    try {
      const r = await authFetch(`${API_BASE}/api/clients/${selectedClient.id}/preferences`);
      setPreferences((await r.json()).preferences || []);
    } catch { setPreferences([]); }
    finally { setPreferencesLoading(false); }
  };

  // Products for purchase form
  const loadProducts = async () => {
    try {
      const r = await authFetch(`${API_BASE}/api/products`);
      setProducts((await r.json()).products || []);
    } catch { setProducts([]); }
  };

  // Connected integrations for proposal generation
  useEffect(() => {
    if (!selectedClient) return;
    authFetch(`${API_BASE}/api/integrations/client/${selectedClient.id}`)
      .then(r => r.json())
      .then(data => {
        const connected = (data.integrations || [])
          .filter(i => i.status === 'connected')
          .map(i => ({
            id: i.id,
            type: i.type,
            label: i.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            resource: i.config?.propertyName || i.config?.shop || i.config?.siteUrl || i.config?.customerId || null,
            config: i.config || null,
            lastSyncAt: i.lastSyncAt || null,
          }));
        setConnectedIntegrations(connected);
      })
      .catch(() => setConnectedIntegrations([]));
  }, [selectedClient?.id]);

  // Lazy load section data
  useEffect(() => {
    if (activeSection === 'purchases') { loadPurchases(); loadProducts(); }
    if (activeSection === 'preferences') { loadPreferences(); }
  }, [activeSection, selectedClient?.id]);

  // Drive status
  useEffect(() => {
    const session = sessionStorage.getItem('driveSession') || '';
    authFetch(`${API_BASE}/api/drive/status?session=${session}`)
      .then(r => r.json())
      .then(d => { setDriveConfigured(d.configured); setDriveAuthenticated(d.authenticated); })
      .catch(() => {});
  }, [driveSession]);

  // Drive OAuth callback — listens via both window.message and BroadcastChannel
  // (BroadcastChannel is the fallback when window.opener is null due to COOP headers)
  useEffect(() => {
    const processedSessions = new Set();
    const handler = (e) => {
      if (e.data?.type !== 'gdrive-auth' || !e.data.sessionId) return;
      if (processedSessions.has(e.data.sessionId)) return; // dedup both channels
      processedSessions.add(e.data.sessionId);
      setDriveSession(e.data.sessionId);
      setDriveAuthenticated(true);
      sessionStorage.setItem('driveSession', e.data.sessionId);
      loadDriveFiles(undefined, undefined, e.data.sessionId);
    };
    window.addEventListener('message', handler);
    const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('gentrade-oauth') : null;
    if (bc) bc.onmessage = handler;
    return () => {
      window.removeEventListener('message', handler);
      if (bc) bc.close();
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  const handleRecordClick = () => { isRecording ? stopRecording() : (resetRecording(), startRecording()); };
  const handlePlayPause = () => {
    if (audioRef.current) { isPlaying ? audioRef.current.pause() : audioRef.current.play(); setIsPlaying(!isPlaying); }
  };
  const handleSaveAudio = async () => {
    if (!audioBlob || !selectedClient) return;
    const file = new File([audioBlob], `grabacion-${Date.now()}.webm`, { type: audioBlob.type || 'audio/webm' });
    await onUploadFile(file);
    resetRecording();
  };
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) { await onUploadFile(file); e.target.value = ''; }
  };
  const handleTextSubmit = async () => {
    if (!textContent.trim() || !selectedClient) return;
    await onAddMaterial({ type: materialType, title: materialTitle || 'Nota', text: textContent.trim(), source: 'manual' });
    setTextContent(''); setMaterialTitle(''); setShowTextInput(false);
  };

  const handleSemanticSearch = async () => {
    if (!selectedClient || !searchQuery.trim()) return;
    setSearching(true);
    try {
      const r = await authFetch(`${API_BASE}/api/insights/search/${selectedClient.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });
      setSearchResults((await r.json()).results || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const handleAddPurchase = async () => {
    if (!selectedClient || !newPurchase.productId) return;
    try {
      const r = await authFetch(`${API_BASE}/api/clients/${selectedClient.id}/purchases`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: newPurchase.productId,
          quantity: parseInt(newPurchase.quantity) || 1,
          unitPrice: newPurchase.unitPrice ? parseFloat(newPurchase.unitPrice) : null,
          totalPrice: newPurchase.unitPrice ? parseFloat(newPurchase.unitPrice) * (parseInt(newPurchase.quantity) || 1) : null,
        }),
      });
      if (r.ok) { setNewPurchase({ productId: '', quantity: 1, unitPrice: '' }); loadPurchases(); }
    } catch (err) { console.error('Error adding purchase:', err); }
  };

  const handleDeletePurchase = async (purchaseId) => {
    if (!selectedClient) return;
    try {
      await authFetch(`${API_BASE}/api/clients/${selectedClient.id}/purchases/${purchaseId}`, { method: 'DELETE' });
      setPurchases(prev => prev.filter(p => p.id !== purchaseId));
    } catch (err) { console.error('Error deleting purchase:', err); }
  };

  const handleSavePreference = async () => {
    if (!selectedClient || !newPrefKey.trim()) return;
    try {
      const r = await authFetch(`${API_BASE}/api/clients/${selectedClient.id}/preferences`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: [{ key: newPrefKey.trim(), value: newPrefValue.trim() }] }),
      });
      if (r.ok) { setNewPrefKey(''); setNewPrefValue(''); loadPreferences(); }
    } catch (err) { console.error('Error saving preference:', err); }
  };

  // Drive helpers
  const loadDriveFiles = async (folderId, query, session) => {
    const sid = session || driveSession;
    if (!sid) return;
    setDriveLoading(true);
    try {
      const params = new URLSearchParams({ session: sid });
      if (folderId) params.set('folderId', folderId);
      if (query) params.set('query', query);
      const r = await authFetch(`${API_BASE}/api/drive/files?${params}`);
      if (r.status === 401) { setDriveAuthenticated(false); sessionStorage.removeItem('driveSession'); return; }
      setDriveFiles((await r.json()).files || []);
    } catch { setDriveFiles([]); }
    finally { setDriveLoading(false); }
  };

  const connectDrive = async () => {
    try {
      const r = await authFetch(`${API_BASE}/api/drive/auth`);
      const data = await r.json();
      if (data.authUrl) {
        setDriveSession(data.sessionId);
        sessionStorage.setItem('driveSession', data.sessionId);
        window.open(data.authUrl, 'gdrive-auth', 'width=500,height=600,popup=yes');
      }
    } catch (err) { console.error('Drive auth error:', err); }
  };

  const disconnectDrive = () => {
    authFetch(`${API_BASE}/api/drive/disconnect`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: driveSession }),
    }).catch(() => {});
    setDriveSession(''); setDriveAuthenticated(false);
    sessionStorage.removeItem('driveSession'); setDriveFiles([]);
  };

  const openDrivePicker = () => {
    setShowDrivePicker(true); setDriveFolderStack([]); setDriveSearch('');
    if (driveAuthenticated) loadDriveFiles();
  };

  const navigateDriveFolder = (folder) => {
    setDriveFolderStack(prev => [...prev, folder]); setDriveSearch('');
    loadDriveFiles(folder.id);
  };

  const navigateDriveBack = () => {
    setDriveFolderStack(prev => {
      const next = prev.slice(0, -1);
      loadDriveFiles(next.length > 0 ? next[next.length - 1].id : undefined);
      return next;
    });
  };

  const handleDriveImport = async (file) => {
    if (!selectedClient || driveImporting) return;
    setDriveImporting(file.id);
    try {
      const r = await authFetch(`${API_BASE}/api/drive/import/${selectedClient.id}?session=${driveSession}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id, fileName: file.name }),
      });
      if (r.status === 401) {
        setDriveAuthenticated(false);
        sessionStorage.removeItem('driveSession');
        return;
      }
      if (r.ok) {
        setShowDrivePicker(false);
        if (loadMaterials) await loadMaterials(selectedClient.id);
      }
    } catch (err) { console.error('Drive import error:', err); }
    finally { setDriveImporting(null); }
  };

  const handleDriveSearch = () => {
    const currentFolder = driveFolderStack.length > 0 ? driveFolderStack[driveFolderStack.length - 1].id : undefined;
    loadDriveFiles(currentFolder, driveSearch);
  };

  // Material viewer helpers
  const handleOpenMaterial = (m) => { setActiveMaterial(m); setViewerOpen(true); };
  const handleCloseMaterial = () => { setViewerOpen(false); setActiveMaterial(null); };

  // Show a loader while heavy previews (PDF/audio) are loading.
  useEffect(() => {
    if (!activeMaterial) {
      setMaterialPreviewLoading(false);
      return;
    }
    const type = activeMaterial.type || '';
    const mime = activeMaterial.mimeType || '';
    const isPdf = type === 'PDF' || mime === 'application/pdf';
    const isAudio = type === 'AUDIO' || mime.startsWith('audio/');
    setMaterialPreviewLoading(isPdf || isAudio);
  }, [activeMaterial?.id]);

  const activeIndex = materials.findIndex((m) => m.id === activeMaterial?.id);
  const prevMaterial = activeIndex > 0 ? materials[activeIndex - 1] : null;
  const nextMaterial = activeIndex >= 0 && activeIndex < materials.length - 1 ? materials[activeIndex + 1] : null;

  const getMaterialUrl = (material) => {
    if (material?.fileUrl) return material.fileUrl;
    const parts = material?.filePath?.split(/[/\\]/);
    const fileName = parts?.[parts.length - 1];
    return fileName ? `${API_BASE}/uploads/${fileName}` : null;
  };

  const renderMaterialPreview = () => {
    if (!activeMaterial) return null;
    const url = getMaterialUrl(activeMaterial);
    const type = activeMaterial.type || '';
    const mime = activeMaterial.mimeType || '';
    const hasText = Boolean(activeMaterial.text);

    const Spinner = () => (
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.65)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>
          <span style={{
            width: 18, height: 18, borderRadius: '50%',
            border: '2px solid #e5e7eb', borderTopColor: '#1b5e3b',
            animation: 'spin 0.8s linear infinite',
            display: 'inline-block',
          }} />
          Cargando…
        </div>
      </div>
    );

    if (type === 'AUDIO' || mime.startsWith('audio/')) {
      const transcript = activeMaterial._transcript;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {url ? (
            <div style={{ position: 'relative' }}>
              <audio
                controls
                src={url}
                style={{ width: '100%' }}
                onCanPlay={() => setMaterialPreviewLoading(false)}
                onLoadedData={() => setMaterialPreviewLoading(false)}
              />
              {materialPreviewLoading && <Spinner />}
            </div>
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Archivo de audio no disponible.</div>
          )}
          {transcript ? (
            <div style={{ background: '#f8f9fb', borderRadius: 8, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Icons.MessageText /><strong style={{ fontSize: '0.875rem' }}>Transcripcion</strong>
                {transcript.metadata?.duration && <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{Math.round(transcript.metadata.duration)}s de audio</span>}
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8125rem', lineHeight: 1.6, color: '#374151', margin: 0 }}>{transcript.text}</pre>
            </div>
          ) : <div style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>Sin transcripcion disponible.</div>}
        </div>
      );
    }
    if (type === 'PDF' || mime === 'application/pdf') {
      return url ? (
        <div style={{ position: 'relative', minHeight: 500 }}>
          <iframe
            key={activeMaterial.id}
            title="PDF"
            src={url}
            style={{ width: '100%', height: '100%', minHeight: 500, border: 'none', borderRadius: 8 }}
            onLoad={() => setMaterialPreviewLoading(false)}
          />
          {materialPreviewLoading && <Spinner />}
        </div>
      ) : (
        <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Archivo PDF no disponible.</div>
      );
    }
    if (type === 'CSV' || type === 'XLSX') return <MaterialTextPreview text={activeMaterial.text} type={type} />;
    if (type === 'TXT' || type === 'TRANSCRIPT' || mime.startsWith('text/') || hasText) {
      return <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8125rem', lineHeight: 1.6, color: '#374151', margin: 0, padding: 16 }}>{activeMaterial.text || 'Sin contenido de texto.'}</pre>;
    }
    return url ? (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Archivo disponible para descarga</span>
        <div style={{ marginTop: 12 }}>
          <a href={url} target="_blank" rel="noreferrer" style={{ color: '#1b5e3b', fontWeight: 600, textDecoration: 'none' }}>Descargar</a>
        </div>
      </div>
    ) : <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Archivo no disponible.</div>;
  };

  // ═══════════════════════════════════════════════════════════════════
  // SECTION NAVIGATION CONFIG
  // ═══════════════════════════════════════════════════════════════════

  const counts = getSectionCounts({
    materials,
    proposals,
    inventory: inventoryCount,
    integrations: connectedIntegrations,
    purchases,
    preferences,
  });

  const sections = [
    { key: 'summary', label: 'Resumen', icon: Icons.BarChart3, count: null, group: 'knowledge' },
    { key: 'materials', label: 'Materiales', icon: Icons.FileText, count: counts.materials, group: 'knowledge' },
    { key: 'purchases', label: 'Compras', icon: Icons.ShoppingCart, count: counts.purchases, group: 'knowledge' },
    { key: 'preferences', label: 'Preferencias', icon: Icons.Settings, count: counts.preferences, group: 'knowledge' },
    { key: 'inventory', label: 'Inventario', icon: Icons.Package, count: counts.inventory, group: 'signals' },
    { key: 'marketing', label: 'Marketing', icon: Icons.Bullhorn, count: null, group: 'signals' },
    { key: 'integrations', label: 'Integraciones', icon: Icons.Zap, count: counts.integrations, group: 'signals' },
    { key: 'reports', label: 'Reportes', icon: Icons.Activity, count: null, group: 'signals' },
    { key: 'chat', label: 'Chat', icon: Icons.MessageCircle, count: null, group: 'signals' },
    { key: 'proposals', label: 'Propuestas', icon: Icons.Sparkles, count: counts.proposals, group: 'action' },
  ];

  const canGenerate = materials && materials.length > 0 && !generating;

  const handleGenerateFromSidebar = () => {
    setActiveSection('proposals');
    setProposalsAutoFocusTrigger((c) => c + 1);
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  const sectionSurfaceStyle = {
    background: tokens.surface,
    borderRadius: tokens.radius.lg,
    border: `1px solid ${tokens.border}`,
    overflow: 'hidden',
  };

  const topbar = (
    <ClientHeader
      client={selectedClient}
      onBack={onBack}
      onEditClient={onEditClient}
    />
  );

  const sidebar = (
    <WorkspaceSidebar
      client={selectedClient}
      sentimentSummary={sentimentSummary}
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onGenerateProposal={handleGenerateFromSidebar}
      generating={generating}
      materialsCount={materials.length}
      proposalsCount={proposals ? proposals.length : 0}
      integrationsCount={connectedIntegrations.length}
      canGenerate={canGenerate}
    />
  );

  return (
    <WorkspaceLayout topbar={topbar} sidebar={sidebar}>
      <div>
        {activeSection === 'summary' && (
          <SummarySection
            clientId={selectedClient?.id}
            client={selectedClient}
            executiveSummary={executiveSummary}
            summaryLoading={summaryLoading}
            summaryExpanded={summaryExpanded}
            setSummaryExpanded={setSummaryExpanded}
            onRegenerateSummary={() => loadExecutiveSummary(true)}
            materialsCount={materials.length}
            proposalsCount={proposals.length}
            purchasesCount={purchases.length}
            lastMaterialAt={materials[0]?.createdAt}
            lastProposalAt={proposals[0]?.createdAt}
            onNavigateSection={setActiveSection}
            onGenerateProposal={onGenerateProposal}
            generating={generating}
          />
        )}

        {activeSection === 'materials' && (
          <div style={sectionSurfaceStyle}>
            <div style={{ padding: 20 }}>
              <MaterialsSection
                materials={materials}
                materialsLoading={materialsLoading}
                onAddMaterial={onAddMaterial}
                onUploadFile={onUploadFile}
                onDeleteMaterial={onDeleteMaterial}
                uploadProgress={uploadProgress}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchResults={searchResults}
                setSearchResults={setSearchResults}
                searching={searching}
                onSemanticSearch={handleSemanticSearch}
                isRecording={isRecording}
                audioBlob={audioBlob}
                audioUrl={audioUrl}
                duration={duration}
                error={error}
                onRecordClick={handleRecordClick}
                onPlayPause={handlePlayPause}
                onSaveAudio={handleSaveAudio}
                isPlaying={isPlaying}
                audioRef={audioRef}
                resetRecording={resetRecording}
                showTextInput={showTextInput}
                setShowTextInput={setShowTextInput}
                textContent={textContent}
                setTextContent={setTextContent}
                materialType={materialType}
                setMaterialType={setMaterialType}
                materialTitle={materialTitle}
                setMaterialTitle={setMaterialTitle}
                onTextSubmit={handleTextSubmit}
                driveConfigured={driveConfigured}
                driveAuthenticated={driveAuthenticated}
                showDrivePicker={showDrivePicker}
                setShowDrivePicker={setShowDrivePicker}
                driveFiles={driveFiles}
                driveLoading={driveLoading}
                driveSearch={driveSearch}
                setDriveSearch={setDriveSearch}
                driveFolderStack={driveFolderStack}
                driveImporting={driveImporting}
                onConnectDrive={connectDrive}
                onDisconnectDrive={disconnectDrive}
                onDriveSearch={handleDriveSearch}
                onNavigateDriveFolder={navigateDriveFolder}
                onNavigateDriveBack={navigateDriveBack}
                onDriveImport={handleDriveImport}
                onOpenDrivePicker={openDrivePicker}
                viewerOpen={viewerOpen}
                activeMaterial={activeMaterial}
                onOpenMaterial={handleOpenMaterial}
                onCloseMaterial={handleCloseMaterial}
                prevMaterial={prevMaterial}
                nextMaterial={nextMaterial}
                renderMaterialPreview={renderMaterialPreview}
                fileInputRef={fileInputRef}
                onFileUpload={handleFileUpload}
              />
            </div>
          </div>
        )}

        {activeSection === 'proposals' && (
          <div style={sectionSurfaceStyle}>
            <div style={{ padding: 20 }}>
              <ProposalsSection
                clientId={selectedClient?.id}
                materialsCount={materials.length}
                proposals={proposals}
                proposalsLoading={proposalsLoading}
                onOpenProposal={onOpenProposal}
                onDeleteProposal={onDeleteProposal}
                onGenerateProposal={onGenerateProposal}
                onChangeStatus={onChangeStatus}
                generating={generating}
                materials={materials}
                selectedTemplate={selectedTemplate}
                setSelectedTemplate={setSelectedTemplate}
                connectedIntegrations={connectedIntegrations}
                autoFocusTrigger={proposalsAutoFocusTrigger}
              />
            </div>
          </div>
        )}

        {activeSection === 'inventory' && (
          <OpportunitiesSection
            clientId={selectedClient?.id}
            connectedIntegrations={connectedIntegrations}
            onCountChange={setInventoryCount}
          />
        )}

        {activeSection === 'marketing' && (
          <MarketingActionsSection
            clientId={selectedClient?.id}
            connectedIntegrations={connectedIntegrations}
          />
        )}

        {activeSection === 'integrations' && (
          <IntegrationsSection clientId={selectedClient?.id} />
        )}

        {activeSection === 'purchases' && (
          <div style={sectionSurfaceStyle}>
            <div style={{ padding: 20 }}>
              <PurchasesSection
                purchases={purchases}
                purchasesLoading={purchasesLoading}
                products={products}
                newPurchase={newPurchase}
                setNewPurchase={setNewPurchase}
                onAddPurchase={handleAddPurchase}
                onDeletePurchase={handleDeletePurchase}
              />
            </div>
          </div>
        )}

        {activeSection === 'preferences' && (
          <div style={sectionSurfaceStyle}>
            <div style={{ padding: 20 }}>
              <PreferencesSection
                preferences={preferences}
                preferencesLoading={preferencesLoading}
                newPrefKey={newPrefKey}
                setNewPrefKey={setNewPrefKey}
                newPrefValue={newPrefValue}
                setNewPrefValue={setNewPrefValue}
                onSavePreference={handleSavePreference}
              />
            </div>
          </div>
        )}

        {activeSection === 'reports' && (
          <div style={sectionSurfaceStyle}>
            <div style={{ padding: 20 }}>
              <ReportsTab clientId={selectedClient?.id} onSectionChange={setActiveSection} />
            </div>
          </div>
        )}

        {activeSection === 'chat' && (
          <div style={{ ...sectionSurfaceStyle, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 20, flex: 1, minHeight: 0 }}>
              <ClientChatPanel clientId={selectedClient?.id} />
            </div>
          </div>
        )}
      </div>

      {/* Pulse animation for recording */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </WorkspaceLayout>
  );
}

export default ClientDetailScreen;
