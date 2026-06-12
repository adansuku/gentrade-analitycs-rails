import { useState } from 'react';
import { authFetch } from '../lib/api';

const API_BASE = '';

export default function useClientData() {
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [clientProposals, setClientProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);

  const loadMaterials = async (clientId) => {
    try {
      setMaterialsLoading(true);
      const response = await authFetch(`${API_BASE}/api/v1/clients/${clientId}/materials`);
      const data = await response.json();
      setMaterials(data.materials || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      setMaterials([]);
    } finally {
      setMaterialsLoading(false);
    }
  };

  const loadProposals = async (clientId) => {
    try {
      setProposalsLoading(true);
      const response = await authFetch(`${API_BASE}/api/v1/clients/${clientId}/proposals`);
      const data = await response.json();
      setClientProposals(data.proposals || []);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      setClientProposals([]);
    } finally {
      setProposalsLoading(false);
    }
  };

  const addMaterial = async (clientId, payload) => {
    try {
      const response = await authFetch(`${API_BASE}/api/v1/clients/${clientId}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data?.id) {
        setMaterials(prev => [data, ...prev]);
      }
    } catch (error) {
      console.error('Error adding material:', error);
    }
  };

  const uploadFile = async (clientId, file) => {
    if (!file) return;
    setUploadProgress([{ step: 'uploading', message: 'Subiendo archivo...' }]);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await authFetch(`${API_BASE}/api/v1/clients/${clientId}/materials/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data?.material) setMaterials(prev => [data.material, ...prev]);
      if (data?.transcript) setMaterials(prev => [data.transcript, ...prev]);
    } catch (error) {
      console.error('Error uploading material:', error);
    } finally {
      setTimeout(() => setUploadProgress([]), 3000);
    }
  };

  const deleteMaterial = async (clientId, materialId) => {
    try {
      await authFetch(`${API_BASE}/api/v1/clients/${clientId}/materials/${materialId}`, {
        method: 'DELETE'
      });
      setMaterials(prev => prev.filter(m => m.id !== materialId));
    } catch (error) {
      console.error('Error deleting material:', error);
    }
  };

  return {
    materials, materialsLoading, loadMaterials,
    clientProposals, proposalsLoading, loadProposals,
    addMaterial, uploadFile, deleteMaterial, uploadProgress,
    setMaterials,
  };
}
