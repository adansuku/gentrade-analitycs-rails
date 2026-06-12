import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../lib/api';

const AppContext = createContext(null);

const API_BASE = '';

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  const fetchClients = async () => {
    try {
      const response = await authFetch(`${API_BASE}/api/v1/clients`);
      const data = await response.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchDashboard = async () => {
    try {
      const r = await authFetch(`${API_BASE}/api/v1/insights/dashboard`);
      const data = await r.json();
      setDashboardData(data);
    } catch { /* Dashboard data optional */ }
  };

  useEffect(() => {
    fetchClients();
    fetchDashboard();
  }, []);

  const selectClient = (client) => {
    setSelectedClient(client);
    if (client) navigate(`/clientes/${client.slug || client.id}`);
  };

  return (
    <AppContext.Provider value={{
      clients, fetchClients, selectedClient, setSelectedClient, selectClient,
      dashboardData, fetchDashboard, navigate,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
