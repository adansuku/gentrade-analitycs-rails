import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icons from '../ui/Icons';
import useGeneralChat from '../../hooks/useGeneralChat';
import { APP_NAME } from '../../lib/constants';

export default function AppShell({ children, onLogout, theme, toggleTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingNewProposal, setPendingNewProposal] = useState(false);

  const {
    generalChatMessages, generalChatInput, generalChatLoading, generalChatError,
    chatOpen, setChatOpen, setGeneralChatInput, handleGeneralChatSend,
  } = useGeneralChat();

  const isProposalFlow = location.pathname.startsWith('/clientes/') || location.pathname.startsWith('/propuestas');

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo" onClick={() => navigate('/')}>
          <img src="/logo.svg" alt={APP_NAME} style={{ height: 36 }} />
        </div>

        {/* Main Navigation */}
        <nav className="main-nav">
          <button
            className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            <Icons.Home />
            <span>Inicio</span>
          </button>
          <button
            className={`nav-item ${location.pathname.startsWith('/clientes') ? 'active' : ''}`}
            onClick={() => {
              setPendingNewProposal(false);
              navigate('/clientes');
            }}
          >
            <Icons.Users />
            <span>Clientes</span>
          </button>
          <button
            className={`nav-item ${location.pathname === '/intelligence' ? 'active' : ''}`}
            onClick={() => navigate('/intelligence')}
          >
            <Icons.Activity />
            <span>Intelligence</span>
          </button>
          <button
            className={`nav-item ${location.pathname === '/pipeline' ? 'active' : ''}`}
            onClick={() => navigate('/pipeline')}
          >
            <Icons.Columns />
            <span>Pipeline</span>
          </button>
          <button
            className={`nav-item ${location.pathname === '/productos' ? 'active' : ''}`}
            onClick={() => navigate('/productos')}
          >
            <Icons.Package />
            <span>Productos</span>
          </button>
          <button
            className={`nav-item ${location.pathname === '/metricas' ? 'active' : ''}`}
            onClick={() => navigate('/metricas')}
          >
            <Icons.BarChart />
            <span>Metricas</span>
          </button>
          <button
            className={`nav-item ${location.pathname === '/logs' ? 'active' : ''}`}
            onClick={() => navigate('/logs')}
          >
            <Icons.List />
            <span>Logs</span>
          </button>
          <button
            className={`nav-item nav-cta ${pendingNewProposal || isProposalFlow ? 'active' : ''}`}
            onClick={() => {
              setPendingNewProposal(true);
              navigate('/clientes');
            }}
          >
            <Icons.Plus />
            <span>Nueva propuesta</span>
          </button>
        </nav>

        <div className="header-actions">
          <button onClick={() => navigate('/admin/users')} className="theme-toggle" aria-label="Usuarios" title="Gestión de usuarios">
            <Icons.Users />
          </button>
          <button onClick={() => navigate('/ayuda')} className="theme-toggle" aria-label="Ayuda">
            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>?</span>
          </button>
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Cambiar tema">
            {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
          </button>
          <button onClick={onLogout} className="logout-button" aria-label="Cerrar sesion">
            <Icons.LogOut />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {children}
      </main>

      {/* Floating Chat Widget */}
      {chatOpen && (
        <div className="floating-chat">
          <div className="floating-chat-header">
            <div>
              <h3>Asistente IA</h3>
              <span>Pregunta lo que necesites</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="close-button" aria-label="Cerrar">
              <Icons.X />
            </button>
          </div>
          <div className="floating-chat-body">
            {generalChatMessages.length === 0 ? (
              <div className="home-chat-empty premium-state">
                <Icons.MessageText />
                <p>Escribe tu consulta</p>
                <span>Ej: "Resume este email", "Preparame un pitch", "Que es el ROI?"</span>
              </div>
            ) : (
              <div className="home-chat-messages">
                {generalChatMessages.map((message, index) => (
                  <div key={index} className={`home-chat-message ${message.role}`}>
                    <span>{message.role === 'user' ? 'Tu' : 'IA'}</span>
                    <p>{message.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {generalChatError && (
            <div className="home-chat-error">{generalChatError}</div>
          )}
          <div className="floating-chat-input">
            <textarea
              value={generalChatInput}
              onChange={(e) => setGeneralChatInput(e.target.value)}
              placeholder="Escribe tu pregunta..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGeneralChatSend();
                }
              }}
              autoFocus
            />
            <button
              onClick={handleGeneralChatSend}
              disabled={!generalChatInput.trim() || generalChatLoading}
              className="floating-chat-send"
            >
              {generalChatLoading ? '...' : <Icons.Send />}
            </button>
          </div>
        </div>
      )}
      <button
        className={`floating-chat-fab ${chatOpen ? 'active' : ''}`}
        onClick={() => setChatOpen(!chatOpen)}
        aria-label="Abrir asistente IA"
        title="Asistente IA"
      >
        {chatOpen ? <Icons.X /> : <Icons.MessageText />}
      </button>
    </div>
  );
}
