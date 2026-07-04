import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Settings as SettingsIcon, MessageSquare, Sparkles } from 'lucide-react';

export default function AIAgentChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(() => {
    return localStorage.getItem('n8n_webhook_url') || '';
  });
  const [webhookInput, setWebhookInput] = useState(webhookUrl);
  
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('gaga_ai_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [
      {
        id: 'welcome',
        sender: 'agent',
        text: 'Hello! I am GagaAI, your media assistant. Paste your link above to get started. How can I help you today?',
        timestamp: Date.now()
      }
    ];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('gaga_ai_chat_history', JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    
    const userMsg = {
      id: Date.now().toString() + '-user',
      sender: 'user',
      text: userText,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsSending(true);

    // If n8n webhook URL is configured
    if (webhookUrl && webhookUrl.trim()) {
      try {
        const response = await fetch(webhookUrl.trim(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: userText,
            chatInput: userText,
            sessionId: 'gaga-chat-session'
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}`);
        }

        const data = await response.json();
        
        // Parse standard n8n output formats
        let replyText = '';
        if (typeof data === 'string') {
          replyText = data;
        } else if (Array.isArray(data)) {
          const item = data[0];
          replyText = item?.output || item?.response || item?.text || JSON.stringify(item);
        } else if (data && typeof data === 'object') {
          replyText = data.output || data.response || data.text || data.message || JSON.stringify(data);
        } else {
          replyText = 'Received empty response from n8n agent.';
        }

        const agentMsg = {
          id: Date.now().toString() + '-agent',
          sender: 'agent',
          text: replyText,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, agentMsg]);

      } catch (err) {
        console.error('n8n Webhook Error:', err);
        const errorMsg = {
          id: Date.now().toString() + '-error',
          sender: 'agent',
          text: `⚠️ Failed to connect to your n8n AI Agent: ${err.message}. Please verify your webhook URL in settings.`,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMsg]);
      } finally {
        setIsSending(false);
      }
    } else {
      // Simulation mode
      setTimeout(() => {
        let replyText = '';
        const lower = userText.toLowerCase();
        
        if (lower.includes('how') && (lower.includes('download') || lower.includes('use'))) {
          replyText = 'To download, copy any YouTube, Instagram, X (Twitter), or Pinterest URL, paste it into the search box, click "Fetch Media", select your quality card (MP3 or MP4), and download. Try copying a clean link without trackers!';
        } else if (lower.includes('platform') || lower.includes('support') || lower.includes('site')) {
          replyText = 'GagaStreama supports downloading media from YouTube (videos & audio), Instagram (reels & photos), X/Twitter (videos), and Pinterest (images/pins).';
        } else if (lower.includes('database') || lower.includes('mongo') || lower.includes('store')) {
          replyText = 'Yes, all successful downloads and user sign-ins are logged into the secure MongoDB Atlas database under "url_downloads" and "url_users" collections!';
        } else if (lower.includes('n8n') || lower.includes('agent') || lower.includes('webhook')) {
          replyText = 'To connect me to n8n, click the gear icon (⚙️) in my header, paste your n8n AI Agent Chat trigger webhook URL, and click save! I will route all chat requests to it instantly.';
        } else {
          replyText = 'I am currently running in simulation mode. To enable my full AI brain, please configure an n8n AI workflow webhook by clicking the gear icon (⚙️) above!';
        }

        const agentMsg = {
          id: Date.now().toString() + '-agent',
          sender: 'agent',
          text: replyText,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, agentMsg]);
        setIsSending(false);
      }, 800);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setWebhookUrl(webhookInput);
    localStorage.setItem('n8n_webhook_url', webhookInput);
    setShowSettings(false);
    
    // Add success confirmation message
    const confirmMsg = {
      id: Date.now().toString() + '-config',
      sender: 'agent',
      text: webhookInput.trim() 
        ? `✅ Successfully linked n8n AI Webhook! Chatting with n8n agent is now active.`
        : `ℹ️ n8n Webhook removed. Switched back to product assistant Simulation Mode.`,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, confirmMsg]);
  };

  const clearChat = () => {
    const defaultWelcome = [
      {
        id: 'welcome',
        sender: 'agent',
        text: 'History cleared. Hello! How can I help you today?',
        timestamp: Date.now()
      }
    ];
    setMessages(defaultWelcome);
    localStorage.setItem('gaga_ai_chat_history', JSON.stringify(defaultWelcome));
  };

  return (
    <div className="gaga-ai-widget">
      {/* Floating Chat Button */}
      {!isOpen && (
        <button 
          className="chat-toggle-btn"
          onClick={() => setIsOpen(true)}
          title="Chat with GagaAI Agent"
        >
          <Bot size={22} />
          <span className="chat-notification-pulse"></span>
        </button>
      )}

      {/* Floating Chat Panel */}
      {isOpen && (
        <div className="chat-panel glass-card">
          {/* Header */}
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div className="chat-header-avatar">
                <Bot size={16} style={{ color: '#000' }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>GagaAI Agent</span>
                  <Sparkles size={10} style={{ color: 'var(--primary)' }} />
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {webhookUrl ? 'n8n Active Agent' : 'Simulation Mode'}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button 
                className="chat-header-action" 
                onClick={() => setShowSettings(!showSettings)}
                title="Configure n8n Webhook"
              >
                <SettingsIcon size={14} />
              </button>
              <button 
                className="chat-header-action" 
                onClick={() => setIsOpen(false)}
                title="Minimize Chat"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Settings Sub-Panel */}
          {showSettings ? (
            <form onSubmit={handleSaveSettings} className="chat-settings-panel">
              <h3 style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                Configure n8n Agent
              </h3>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '0.75rem' }}>
                Enter your n8n AI workflow webhook trigger URL to connect your custom agent model.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Webhook production URL:
                </label>
                <input 
                  type="text" 
                  className="chat-settings-input"
                  placeholder="https://primary.n8n.cloud/webhook/..." 
                  value={webhookInput}
                  onChange={(e) => setWebhookInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button type="submit" className="chat-settings-btn save">
                  Save Changes
                </button>
                <button 
                  type="button" 
                  className="chat-settings-btn cancel"
                  onClick={() => {
                    setWebhookInput(webhookUrl);
                    setShowSettings(false);
                  }}
                >
                  Cancel
                </button>
              </div>

              <div style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', textAlign: 'center' }}>
                <button 
                  type="button" 
                  className="chat-clear-btn" 
                  onClick={clearChat}
                >
                  Clear Chat History
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Message List */}
              <div className="chat-messages-container">
                {messages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`chat-message-bubble ${msg.sender === 'user' ? 'user' : 'agent'}`}
                  >
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                    <span className="chat-message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
                {isSending && (
                  <div className="chat-message-bubble agent typing">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="chat-input-container">
                <input 
                  type="text" 
                  className="chat-input-field"
                  placeholder={webhookUrl ? "Send message to AI agent..." : "Ask a question (Simulation)..."}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isSending}
                />
                <button 
                  type="submit" 
                  className="chat-send-btn"
                  disabled={!inputMessage.trim() || isSending}
                >
                  <Send size={12} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
