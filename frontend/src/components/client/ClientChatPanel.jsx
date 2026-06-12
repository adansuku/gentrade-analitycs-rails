import { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';

/**
 * ClientChatPanel - Chat contextual sobre datos del cliente
 * Permite hacer preguntas sobre campañas, materiales, propuestas, etc.
 */
export function ClientChatPanel({ clientId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Cargar historial al montar
  useEffect(() => {
    loadChatHistory();
  }, [clientId]);

  const loadChatHistory = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/chat/history`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error cargando historial:', err);
      // No mostrar error, simplemente empezar con chat vacío
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setError(null);

    // Agregar mensaje del usuario optimistamente
    const tempUserMsg = { role: 'user', content: userMessage, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await fetch(`/api/clients/${clientId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al enviar mensaje');
      }

      const data = await res.json();

      // Reemplazar mensajes con el historial completo del servidor
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Error en chat:', err);
      setError(err.message || 'Error al procesar la pregunta. Intenta de nuevo.');

      // Remover mensaje optimista en caso de error
      setMessages(prev => prev.filter(m => m !== tempUserMsg));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Icons.MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Chat Contextual</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Pregunta sobre campañas, métricas, materiales y propuestas
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <Icons.MessageText className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No hay mensajes aún.</p>
            <p className="text-xs mt-1">
              Prueba preguntar: "¿Cuál es el ROAS de Meta?" o "¿Qué objetivos tiene el cliente?"
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <Icons.Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                <p className="text-xs mt-1 opacity-60">
                  {new Date(msg.createdAt).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <Icons.User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Icons.Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Icons.AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-100">Error</p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta sobre el cliente..."
            disabled={loading}
            rows={2}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 self-end"
          >
            {loading ? (
              <>
                <Icons.Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Icons.Send className="w-4 h-4" />
                Enviar
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Pulsa Enter para enviar, Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}
