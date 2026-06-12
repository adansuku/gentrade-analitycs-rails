import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClientDetailScreen from './ClientDetailScreen';
import { authFetch } from '../lib/api';

const API_BASE = '';

function ClientDetailRoute({
  selectedClient, setSelectedClient, setExtractedInfo,
  loadMaterials, loadProposals,
  materials, materialsLoading, onAddMaterial, onUploadFile, onDeleteMaterial,
  onGenerateProposal, generating,
  proposals, proposalsLoading, onDeleteProposal, onChangeStatus,
  uploadProgress, onEditClient
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  const isCurrentClient = selectedClient && (
    String(selectedClient.id) === id || String(selectedClient.slug) === id
  );

  useEffect(() => {
    if (!isCurrentClient) {
      authFetch(`${API_BASE}/api/v1/clients/${id}`)
        .then(r => r.json())
        .then(client => {
          if (client?.id) {
            setSelectedClient(client);
            loadMaterials(client.id);
            loadProposals(client.id);
            setExtractedInfo({
              clientId: client.id,
              clientName: client.name,
              company: client.company || null,
            });
            // Redirect to slug URL if currently using ID
            if (client.slug && id !== client.slug) {
              navigate(`/clientes/${client.slug}`, { replace: true });
            }
          } else {
            navigate('/clientes');
          }
        })
        .catch(() => navigate('/clientes'));
    }
  }, [id]);

  if (!isCurrentClient) {
    return <div className="clients-loading">Cargando cliente…</div>;
  }

  return (
    <ClientDetailScreen
      selectedClient={selectedClient}
      onBack={() => navigate('/clientes')}
      onEditClient={onEditClient}
      materials={materials}
      materialsLoading={materialsLoading}
      loadMaterials={loadMaterials}
      onAddMaterial={onAddMaterial}
      onUploadFile={onUploadFile}
      onDeleteMaterial={onDeleteMaterial}
      onGenerateProposal={onGenerateProposal}
      generating={generating}
      proposals={proposals}
      proposalsLoading={proposalsLoading}
      onOpenProposal={(proposalId) => navigate(`/propuestas/${proposalId}`)}
      onDeleteProposal={onDeleteProposal}
      onChangeStatus={onChangeStatus}
      uploadProgress={uploadProgress}
    />
  );
}

export default ClientDetailRoute;
