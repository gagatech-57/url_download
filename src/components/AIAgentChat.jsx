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
        
        if (lower.includes('how') || lower.includes('use') || lower.includes('download') || lower.includes('work')) {
          replyText = 'To download, simply copy a link from YouTube, Instagram, X (Twitter), or Pinterest and paste it into the main input box. Click "Fetch Media" to fetch the stream. After fetching, you can select whether you want to save it as an MP3 audio file or an MP4 video file. I will automatically prefix the filename with "GagaStreama_" and save it directly to your device!';
        } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') || lower.includes('greeting')) {
          replyText = 'Hello there! I am GagaAI, your built-in media download assistant. You can ask me how to download files, what platforms we support, or how your download history and profiles are saved. What would you like to know?';
        } else if (lower.includes('platform') || lower.includes('support') || lower.includes('site') || lower.includes('youtube') || lower.includes('instagram') || lower.includes('pinterest') || lower.includes('twitter')) {
          replyText = 'GagaStreama fully supports YouTube (both video downloads and high-quality MP3 audio extractions), Instagram (reels, videos, and post photos), X/Twitter (videos), and Pinterest (images/pins). Simply paste the link to start!';
        } else if (lower.includes('music') || lower.includes('audio') || lower.includes('mp3') || lower.includes('play') || lower.includes('thumb')) {
          replyText = 'When you download in MP3 format, our backend fetches the audio stream and the video cover thumbnail. It embeds the thumbnail directly into the MP3 file tags using node-id3. When you open the MP3 in Samsung Music, Apple Music, VLC, or Spotify, the original video thumbnail will show up beautifully as the album art!';
        } else if (lower.includes('db') || lower.includes('database') || lower.includes('mongo') || lower.includes('store') || lower.includes('save') || lower.includes('log')) {
          replyText = 'Your downloads and profile registrations are securely stored in the MongoDB Atlas database. The server connects to the "swiftmarket" database and logs details inside "url_downloads" (user, url, filename, format, timestamp) and "url_users" (name, email, avatar, lastLogin) collections.';
        } else if (lower.includes('n8n') || lower.includes('agent') || lower.includes('webhook')) {
          replyText = 'You can connect me to a custom AI workflow agent by clicking the gear icon (⚙️) above and pasting your n8n AI Chat trigger webhook URL. If you save the URL, I will query your workflow model for all responses!';
        } else if (lower.includes('prefix') || lower.includes('name') || lower.includes('filename')) {
          replyText = 'Yes! All downloaded media files are automatically prefixed with "GagaStreama_" (e.g. GagaStreama_YouTube_video.mp4). The backend sets this in the Content-Disposition header before serving the file, so it is saved correctly across all devices.';
        } else {
          replyText = 'GagaStreama is a premium, high-speed downloader. To get started, paste your YouTube, Instagram, X, or Pinterest link in the input box above and click "Fetch Media". Let me know if you have any questions about downloading audio/video or about our features!';
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
