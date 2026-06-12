import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';

// Extracted hooks
import useTheme from './hooks/useTheme';
import useAuth from './hooks/useAuth';
import useClientData from './hooks/useClientData';
import useProposalFlow from './hooks/useProposalFlow';

// Context
import { AppProvider, useApp } from './context/AppContext';

// Layout
import AppShell from './components/layout/AppShell';

// Screens
import LoginScreen from './screens/LoginScreen';
import LandingPage from './screens/LandingPage';
import OAuthCallback from './components/OAuthCallback';
import DashboardScreen from './screens/DashboardScreen';
import DashboardIntelligence from './screens/DashboardIntelligence';
import ClientsScreen from './screens/ClientsScreen';
import ClientDetailRoute from './screens/ClientDetailRoute';
import ProposalRoute from './screens/ProposalRoute';
import ProcessingScreen from './screens/ProcessingScreen';
import PipelineScreen from './screens/PipelineScreen';
import ProductsScreen from './screens/ProductsScreen';
import MetricsScreen from './screens/MetricsScreen';
import LogsScreen from './screens/LogsScreen';
import HelpScreen from './screens/HelpScreen';
import AdminUsersScreen from './screens/AdminUsersScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATED APP ROUTES
// ═══════════════════════════════════════════════════════════════

function AppRoutes() {
  const navigate = useNavigate();
  const { selectedClient, setSelectedClient } = useApp();
  const [pendingEditClient, setPendingEditClient] = useState(null);
  const [pendingNewProposal, setPendingNewProposal] = useState(false);

  const clientData = useClientData();
  const proposalFlow = useProposalFlow({
    selectedClient,
    loadProposals: clientData.loadProposals,
  });

  const handleClientChange = (client) => {
    setSelectedClient(client);
    if (client) {
      clientData.loadMaterials(client.id);
      clientData.loadProposals(client.id);
      proposalFlow.setExtractedInfo({
        clientId: client.id,
        clientName: client.name,
        company: client.company || null,
      });
    } else {
      clientData.setMaterials([]);
    }
  };

  const handleOpenClient = (client) => {
    handleClientChange(client);
    setPendingNewProposal(false);
    navigate(`/clientes/${client.slug || client.id}`);
  };

  const handleEditClientFromDetail = () => {
    if (!selectedClient) return;
    setPendingEditClient(selectedClient);
    navigate('/clientes');
  };

  const handleAddMaterial = async (payload) => {
    if (!selectedClient) return;
    await clientData.addMaterial(selectedClient.id, payload);
  };

  const handleUploadFile = async (file) => {
    if (!selectedClient) return;
    await clientData.uploadFile(selectedClient.id, file);
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!selectedClient) return;
    await clientData.deleteMaterial(selectedClient.id, materialId);
  };

  if (proposalFlow.generating) {
    return <ProcessingScreen stage={proposalFlow.processingStage} steps={proposalFlow.progressSteps} />;
  }

  return (
    <Routes>
      <Route path="/" element={
        <DashboardScreen onOpenClient={handleOpenClient} />
      } />

      <Route path="/intelligence" element={
        <DashboardIntelligence />
      } />

      <Route path="/clientes" element={
        <ClientsScreen
          onOpenClient={handleOpenClient}
          initialEditClient={pendingEditClient}
          onEditCleared={() => setPendingEditClient(null)}
          mode={pendingNewProposal ? 'proposal' : 'manage'}
        />
      } />

      <Route path="/clientes/:id" element={
        <ClientDetailRoute
          selectedClient={selectedClient}
          setSelectedClient={setSelectedClient}
          setExtractedInfo={proposalFlow.setExtractedInfo}
          loadMaterials={clientData.loadMaterials}
          loadProposals={clientData.loadProposals}
          materials={clientData.materials}
          materialsLoading={clientData.materialsLoading}
          onAddMaterial={handleAddMaterial}
          onUploadFile={handleUploadFile}
          onDeleteMaterial={handleDeleteMaterial}
          onGenerateProposal={proposalFlow.handleGenerateProposal}
          generating={proposalFlow.generating}
          proposals={clientData.clientProposals}
          proposalsLoading={clientData.proposalsLoading}
          onDeleteProposal={proposalFlow.handleDeleteProposal}
          onChangeStatus={proposalFlow.handleChangeProposalStatus}
          uploadProgress={clientData.uploadProgress}
          onEditClient={handleEditClientFromDetail}
        />
      } />

      <Route path="/propuestas/:id" element={
        <ProposalRoute
          currentProposalId={proposalFlow.currentProposalId}
          currentProposal={proposalFlow.currentProposal}
          extractedInfo={proposalFlow.extractedInfo}
          chatMessages={proposalFlow.chatMessages}
          sending={proposalFlow.sending}
          selectedClient={selectedClient}
          setCurrentProposal={proposalFlow.setCurrentProposal}
          setCurrentProposalId={proposalFlow.setCurrentProposalId}
          setChatMessages={proposalFlow.setChatMessages}
          setExtractedInfo={proposalFlow.setExtractedInfo}
          onSave={proposalFlow.handleSaveProposal}
          onSendMessage={proposalFlow.handleSendMessage}
          proposalVersions={proposalFlow.proposalVersions}
          setProposalVersions={proposalFlow.setProposalVersions}
        />
      } />

      <Route path="/pipeline" element={<PipelineScreen />} />
      <Route path="/metricas" element={<MetricsScreen />} />
      <Route path="/productos" element={<ProductsScreen />} />
      <Route path="/logs" element={<LogsScreen />} />
      <Route path="/ayuda" element={<HelpScreen />} />
      <Route path="/admin/users" element={<AdminUsersScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATED APP (Provider + Shell + Routes)
// ═══════════════════════════════════════════════════════════════

function AuthenticatedApp({ onLogout, theme, toggleTheme }) {
  return (
    <AppProvider>
      <AppShell onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
        <AppRoutes />
      </AppShell>
    </AppProvider>
  );
}

// ═══════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════

function App() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, login, logout } = useAuth();

  // OAuth callback popup (no auth needed)
  if (window.location.pathname === '/oauth-callback') {
    return <OAuthCallback />;
  }

  // Public password reset routes
  if (window.location.pathname === '/forgot-password') {
    return <ForgotPasswordScreen theme={theme} toggleTheme={toggleTheme} />;
  }

  if (window.location.pathname.startsWith('/reset-password/')) {
    return <ResetPasswordScreen theme={theme} toggleTheme={toggleTheme} />;
  }

  // Hidden admin access
  const adminPath = import.meta.env.VITE_ADMIN_PATH || '/gentrade-panel-engine';
  const isAdminRoute = window.location.pathname === adminPath;

  if (isAuthenticated) {
    return <AuthenticatedApp onLogout={logout} theme={theme} toggleTheme={toggleTheme} />;
  }

  if (isAdminRoute) {
    return <LoginScreen onLogin={login} theme={theme} toggleTheme={toggleTheme} />;
  }

  return <LandingPage />;
}

export default App;
