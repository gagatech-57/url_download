import React from 'react';
import { History, Trash2, Download, ExternalLink, Music, Video, Image, Film } from 'lucide-react';

export default function HistoryList({ history, setHistory }) {
  const getIcon = (type) => {
    switch (type) {
      case 'audio':
        return <Music size={18} style={{ color: '#fbbf24' }} />;
      case 'video':
        return <Video size={18} style={{ color: '#f43f5e' }} />;
      case 'image':
        return <Image size={18} style={{ color: '#10b981' }} />;
      default:
        return <Film size={18} style={{ color: '#94a3b8' }} />;
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all download history?')) {
      setHistory([]);
      localStorage.removeItem('downloader_history');
    }
  };

  const handleDeleteItem = (id) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('downloader_history', JSON.stringify(updated));
  };

  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString();
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="history-container">
      <div className="history-header">
        <div className="history-title" style={{ color: '#fbbf24' }}>
          <History size={20} className="logo-icon" style={{ animation: 'none' }} />
          <span>Download History</span>
        </div>
        {history.length > 0 && (
          <button onClick={handleClearAll} className="clear-history-btn">
            <Trash2 size={14} />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <History size={36} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
          <p>No downloads yet</p>
          <span style={{ fontSize: '0.8rem', color: '#475569' }}>Your successfully downloaded items will appear here.</span>
        </div>
      ) : (
        <div style={{ maxHeight: '360px', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {history.map((item) => (
            <div key={item.id} className="history-item">
              <div className="history-icon-wrapper">
                {getIcon(item.type)}
              </div>
              <div className="history-info">
                <div className="history-name" title={item.filename}>
                  {item.filename || 'Untitled Media'}
                </div>
                <div className="history-meta">
                  <span style={{ textTransform: 'capitalize' }}>{item.type}</span>
                  <span>•</span>
                  <span>{formatDate(item.timestamp)}</span>
                </div>
              </div>
              <div className="history-actions">
                <a
                  href={item.downloadUrl}
                  download={item.filename}
                  className="btn-icon"
                  title="Redownload"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download size={15} />
                </a>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="btn-icon delete-btn"
                  title="Remove from history"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
