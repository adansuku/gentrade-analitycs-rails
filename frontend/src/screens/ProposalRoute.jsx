import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProposalScreen from './ProposalScreen';
import { authFetch } from '../lib/api';

const API_BASE = '';

function ProposalRoute({
  currentProposalId, currentProposal, extractedInfo,
  chatMessages, sending, selectedClient,
  setCurrentProposal, setCurrentProposalId, setChatMessages, setExtractedInfo,
  onSave, onSendMessage, proposalVersions, setProposalVersions
}) {
  const params = useParams();
  const id = String(params.id || '');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [localProposal, setLocalProposal] = useState(null);

  useEffect(() => {
    console.log('ProposalRoute: id from params:', params.id, 'type:', typeof params.id);
    console.log('ProposalRoute: id variable:', id);
    if (!id) {
      console.error('Empty id, navigating to clientes');
      navigate('/clientes');
      return;
    }
    // Always fetch the proposal from the API to ensure we have the latest data
    setLoading(true);
    authFetch(`${API_BASE}/api/v1/proposals/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => {
        console.log('Proposal data:', data);
        if (data?.versions?.length) {
          const content = data.versions[0].content;
          console.log('Setting proposal content, length:', content?.length);
          setCurrentProposal(content);
          setCurrentProposalId(data.id);
          setChatMessages(data.messages || []);
          setProposalVersions(data.versions || []);
          setExtractedInfo({
            clientId: data.clientId,
            clientSlug: data.client?.slug || data.clientId,
            clientName: data.client?.name,
            company: data.client?.company || null,
            email: data.client?.email || null,
          });
          setLocalProposal(content);
        } else {
          console.warn('No versions found in proposal:', data);
          navigate('/clientes');
        }
      })
      .catch((err) => {
        console.error('Error loading proposal:', err);
        navigate('/clientes');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  // Also update local when currentProposal changes (after chat edit)
  useEffect(() => {
    if (currentProposal && currentProposalId) {
      setLocalProposal(currentProposal);
    }
  }, [currentProposal]);

  if (loading || !localProposal) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#9ca3af' }}>
        Cargando propuesta…
      </div>
    );
  }

  return (
    <ProposalScreen
      proposalId={currentProposalId}
      proposal={localProposal}
      extractedInfo={extractedInfo}
      onBack={() => {
        const clientRef = selectedClient?.slug || selectedClient?.id || extractedInfo?.clientSlug || extractedInfo?.clientId;
        navigate(clientRef ? `/clientes/${clientRef}` : '/clientes');
      }}
      onSave={onSave}
      onSendMessage={onSendMessage}
      messages={chatMessages}
      sending={sending}
      versions={proposalVersions}
    />
  );
}

export default ProposalRoute;
