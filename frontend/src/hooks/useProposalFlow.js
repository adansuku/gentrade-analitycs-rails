import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../lib/api';

const API_BASE = '';

export default function useProposalFlow({ selectedClient, loadProposals }) {
  const navigate = useNavigate();
  const [processingStage, setProcessingStage] = useState('generating');
  const [currentProposal, setCurrentProposal] = useState('');
  const [currentProposalId, setCurrentProposalId] = useState(null);
  const [extractedInfo, setExtractedInfo] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [progressSteps, setProgressSteps] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [proposalVersions, setProposalVersions] = useState([]);

  const applyComplete = (data) => {
    setCurrentProposal(data.content);
    setCurrentProposalId(data.proposalId);
    setChatMessages([]);
    setExtractedInfo({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      company: selectedClient.company || null,
    });
    navigate(`/propuestas/${data.proposalSlug || data.proposalId}`);
    loadProposals(selectedClient.id);
  };

  const handleGenerateProposal = async (template = 'general', options = {}) => {
    if (!selectedClient) return;
    setProgressSteps([]);
    setProcessingStage('condensing');
    setGenerating(true);

    const body = { tone: 'profesional', template };
    if (options.includeIntegrations && options.includeIntegrations.length > 0) {
      body.includeIntegrations = options.includeIntegrations;
    }
    if (options.customSections?.trim()) {
      body.customSections = options.customSections.trim();
    }
    if (Array.isArray(options.materialIds) && options.materialIds.length > 0 && options.materialIds.length < (options.totalMaterials ?? Infinity)) {
      body.materialIds = options.materialIds;
    }

    try {
      const response = await authFetch(`${API_BASE}/api/clients/${selectedClient.id}/proposals/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify(body),
      });

      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processSseChunk = (chunk) => {
          if (!chunk.trim()) return;

          let event = '';
          const dataLines = [];
          for (const line of chunk.split(/\r?\n/)) {
            if (line.startsWith('event:')) {
              event = line.slice('event:'.length).trim();
            } else if (line.startsWith('data:')) {
              dataLines.push(line.slice('data:'.length).replace(/^\s*/, ''));
            }
          }

          const dataStr = dataLines.join('\n');
          if (!dataStr) return;

          const data = JSON.parse(dataStr);
          const kind = event || data.event || data.type;

          if (kind === 'progress' || data.step) {
            setProgressSteps(prev => [...prev, data]);
            if (data.step) setProcessingStage(data.step);
            return;
          }

          if (kind === 'complete' || (data.content && (data.proposalId || data.proposalSlug))) {
            applyComplete(data);
            return;
          }

          if (kind === 'error' || data.error) {
            throw new Error(data.message || data.error || 'Error al generar la propuesta');
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse SSE: split on double newline (event boundary)
          const parts = buffer.split(/\r?\n\r?\n/);
          buffer = parts.pop() || '';

          for (const part of parts) {
            processSseChunk(part);
          }
        }

        // Flush any trailing event if present.
        if (buffer.trim()) {
          processSseChunk(buffer);
        }
      } else {
        const data = await response.json();
        if (data.content) {
          applyComplete(data);
        } else {
          throw new Error('No se recibio contenido');
        }
      }
    } catch (error) {
      console.error('Error generating proposal:', error);
      alert(`Error al generar la propuesta: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSendMessage = async (message) => {
    if (!currentProposalId) return;
    setSending(true);
    try {
      const response = await authFetch(`${API_BASE}/api/proposals/${currentProposalId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();

      if (data.content) {
        setCurrentProposal(data.content);
        // Update versions list with new version
        if (data.version) {
          setProposalVersions(prev => [
            { version: data.version, content: data.content, id: `v${data.version}` },
            ...prev,
          ]);
        }
        setChatMessages(prev => [
          ...prev,
          { role: 'user', content: message },
          { role: 'assistant', content: `Propuesta actualizada (version ${data.version || 'nueva'}).`, fullContent: data.content },
        ]);
      }
    } catch (error) {
      console.error('Error applying chat:', error);
    } finally {
      setSending(false);
    }
  };

  const handleSaveProposal = async (proposal) => {
    if (!proposal?.id) {
      navigate('/');
      return;
    }
    try {
      await authFetch(`${API_BASE}/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FINAL' }),
      });
    } catch (error) {
      console.error('Error saving proposal:', error);
    }
    if (selectedClient) {
      loadProposals(selectedClient.id);
      navigate(`/clientes/${selectedClient.slug || selectedClient.id}`);
    } else {
      navigate('/');
    }
  };

  const handleDeleteProposal = async (proposalId) => {
    if (!confirm('Seguro que quieres eliminar esta propuesta?')) return;
    try {
      const response = await authFetch(`${API_BASE}/api/proposals/${proposalId}`, { method: 'DELETE' });
      if (response.ok && selectedClient) {
        loadProposals(selectedClient.id);
      }
    } catch (error) {
      console.error('Error deleting proposal:', error);
    }
  };

  const handleChangeProposalStatus = async (proposalId, newStatus) => {
    try {
      await authFetch(`${API_BASE}/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (selectedClient) {
        loadProposals(selectedClient.id);
      }
    } catch (error) {
      console.error('Error changing proposal status:', error);
    }
  };

  const handleOpenProposal = (proposalId) => {
    navigate(`/propuestas/${proposalId}`);
  };

  return {
    currentProposal, setCurrentProposal,
    currentProposalId, setCurrentProposalId,
    extractedInfo, setExtractedInfo,
    generating, progressSteps, processingStage,
    chatMessages, setChatMessages, sending,
    proposalVersions, setProposalVersions,
    handleGenerateProposal, handleSendMessage,
    handleSaveProposal, handleDeleteProposal, handleChangeProposalStatus, handleOpenProposal,
  };
}
