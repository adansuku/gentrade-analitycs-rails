import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../lib/api';

const API_BASE = '';

async function pollProposal(proposalId, predicate, interval = 2000, timeout = 120000) {
  const start = Date.now();
  const poll = async () => {
    if (Date.now() - start > timeout) throw new Error('Timeout waiting for proposal');
    const res = await authFetch(`${API_BASE}/api/v1/proposals/${proposalId}`);
    const data = await res.json();
    if (predicate(data)) return data;
    await new Promise(r => setTimeout(r, interval));
    return poll();
  };
  return poll();
}

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
    if (options.customSections?.trim()) {
      body.customSections = options.customSections.trim();
    }
    if (Array.isArray(options.materialIds) && options.materialIds.length > 0) {
      body.material_ids = options.materialIds;
    }

    try {
      const response = await authFetch(`${API_BASE}/api/v1/clients/${selectedClient.id}/proposals/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.status === 202) {
        const data = await response.json();
        const proposalId = data.proposal.id;
        setProgressSteps([{ step: 'generating', message: 'Generando propuesta con IA...' }]);
        setProcessingStage('generating');

        const proposalData = await pollProposal(
          proposalId,
          (p) => p.status === 'generated' || p.status === 'draft'
        );

        if (proposalData.status === 'generated') {
          applyComplete({
            content: proposalData.current_version?.content || '',
            proposalId: proposalData.id,
          });
        } else {
          throw new Error(proposalData.metadata?.error || 'Error al generar la propuesta');
        }
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Error al generar la propuesta');
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
      const response = await authFetch(`${API_BASE}/api/v1/proposals/${currentProposalId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (response.status === 202) {
        setChatMessages(prev => [
          ...prev,
          { role: 'user', content: message },
          { role: 'assistant', content: 'Editando propuesta...' },
        ]);

        const prevVersions = await pollProposal(currentProposalId, () => true);
        const prevCount = prevVersions.version_count || 0;

        const proposalData = await pollProposal(
          currentProposalId,
          (p) => (p.version_count || 0) > prevCount
        );

        setCurrentProposal(proposalData.current_version?.content || '');
        setChatMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: `Propuesta actualizada (versión ${proposalData.version_count})`,
            fullContent: proposalData.current_version?.content,
          };
          return updated;
        });
        setProposalVersions(prev => [
          {
            version: proposalData.version_count,
            content: proposalData.current_version?.content,
            id: `v${proposalData.version_count}`,
          },
          ...prev,
        ]);
      } else {
        const data = await response.json();
        if (data.content) {
          setCurrentProposal(data.content);
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
      await authFetch(`${API_BASE}/api/v1/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'reviewed' }),
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
      const response = await authFetch(`${API_BASE}/api/v1/proposals/${proposalId}`, { method: 'DELETE' });
      if (response.ok && selectedClient) {
        loadProposals(selectedClient.id);
      }
    } catch (error) {
      console.error('Error deleting proposal:', error);
    }
  };

  const handleChangeProposalStatus = async (proposalId, newStatus) => {
    try {
      await authFetch(`${API_BASE}/api/v1/proposals/${proposalId}`, {
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