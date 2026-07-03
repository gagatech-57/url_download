import React, { useState, useEffect } from 'react';
import { DownloadCloud, History, Settings as SettingsIcon, LogOut, X, User, ShieldAlert, ArrowRight } from 'lucide-react';
import PremiumBackground from './components/PremiumBackground';
import Downloader from './components/Downloader';
import HistoryList from './components/HistoryList';
import Settings from './components/Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState('download');
  const [customApi, setCustomApi] = useState(() => {
    return localStorage.getItem('custom_cobalt_api') || '';
  });
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('downloader_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Google OAuth States
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('gaga_downloader_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [googleClientId, setGoogleClientId] = useState(() => {
    const saved = localStorage.getItem('google_client_id');
    if (saved === '445479469792-c4chf40h95v88gph32fbl2g3focigkch.apps.googleusercontent.com' || !saved) {
      localStorage.setItem('google_client_id', '236388446658-8f1d98ucg3pignbua6ej8r2v69g0qfbs.apps.googleusercontent.com');
      return '236388446658-8f1d98ucg3pignbua6ej8r2v69g0qfbs.apps.googleusercontent.com';
    }
    return saved;
  });
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const decodeJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const syncUserToDb = async (userData) => {
    try {
      await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
    } catch (e) {
      console.error("Failed to sync user to database:", e);
    }
  };

  useEffect(() => {
    if (user) {
      syncUserToDb(user);
    }
  }, []);

  const handleCredentialResponse = (response) => {
    try {
      const payload = decodeJwt(response.credential);
      if (payload) {
        const loggedInUser = {
          name: payload.name,
          email: payload.email,
          avatar: payload.picture
        };
        setUser(loggedInUser);
        localStorage.setItem('gaga_downloader_user', JSON.stringify(loggedInUser));
        syncUserToDb(loggedInUser);
      }
    } catch (e) {
      console.error("Failed to parse Google credentials:", e);
    }
  };

  useEffect(() => {
    const renderGoogleBtn = () => {
      if (window.google && !user) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleCredentialResponse
          });
          
          const btnContainer = document.getElementById("google-signin-btn");
          if (btnContainer) {
            window.google.accounts.id.renderButton(
              btnContainer,
              { 
                theme: "outline", 
                size: "large",
                type: "icon",
                shape: "circle"
              }
            );
          }
        } catch (err) {
          console.error("Google Sign-In initialization failed:", err);
        }
      }
    };

    renderGoogleBtn();

    const interval = setInterval(() => {
      if (window.google) {
        renderGoogleBtn();
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [user, googleClientId]);

  const handleDemoLogin = () => {
    const demoUser = {
      name: 'Stefani Germanotta',
      email: 'stefani.g@gmail.com',
      avatar: 'https://i.pravatar.cc/150?img=49'
    };
    setUser(demoUser);
    localStorage.setItem('gaga_downloader_user', JSON.stringify(demoUser));
    syncUserToDb(demoUser);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('gaga_downloader_user');
    setShowProfileMenu(false);
  };

  const handleAddHistory = async (filename, type, downloadUrl) => {
    const newItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      filename,
      type,
      downloadUrl,
      timestamp: Date.now()
    };
    const updated = [newItem, ...history];
    setHistory(updated);
    localStorage.setItem('downloader_history', JSON.stringify(updated));

    // Extract original URL from proxy URL query parameter if present
    let originalUrl = downloadUrl;
    try {
      if (downloadUrl.startsWith('/api/proxy')) {
        const urlParams = new URLSearchParams(downloadUrl.split('?')[1]);
        originalUrl = urlParams.get('url') || downloadUrl;
      }
    } catch (e) {}

    // Log the download to MongoDB
    try {
      await fetch('/api/download/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user ? user.email : 'guest',
          url: originalUrl,
          filename,
          format: type
        })
      });
    } catch (err) {
      console.error("Failed to log download to database:", err);
    }
  };

  return (
    <div className="app-container">
      {/* Floating Animated Background Effects */}
      <PremiumBackground />

      {/* Main Glassmorphic Panel */}
      <div className="glass-panel">
        
        {/* User Profile Widget */}
        <div className="user-profile-widget">
          {user ? (
            <div style={{ position: 'relative' }}>
              <div 
                className="google-avatar-ring" 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <img 
                  src={user.avatar || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                  alt={user.name} 
                  className="google-avatar-img" 
                />
              </div>
              
              {showProfileMenu && (
                <div className="profile-dropdown">
                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} 
                  />
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff', textAlign: 'center' }}>{user.name}</div>
                  <div className="profile-dropdown-email">{user.email}</div>
                  
                  <button 
                    onClick={handleLogout} 
                    className="btn-primary" 
                    style={{ width: '100%', marginTop: '0.5rem', padding: '0.4rem 0', height: '32px', fontSize: '0.8rem', background: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)', border: 'none', borderRadius: '6px', boxShadow: 'none' }}
                  >
                    <LogOut size={12} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                onClick={handleDemoLogin}
                className="btn-small demo-login-btn"
                style={{ 
                  fontSize: '0.7rem', 
                  padding: '0.2rem 0.5rem', 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  border: '1px dashed var(--border-color)', 
                  color: 'var(--text-secondary)',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                <span className="demo-text">Demo Login</span>
                <span className="demo-icon-only" style={{ display: 'none' }}>Demo</span>
              </button>
              <div className="google-avatar-ring" style={{ position: 'relative' }}>
                <div 
                  id="google-signin-btn" 
                  style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%', 
                    opacity: 0.01, 
                    zIndex: 2, 
                    cursor: 'pointer',
                    overflow: 'hidden',
                    borderRadius: '50%'
                  }}
                ></div>
                <div style={{ zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', borderRadius: '50%', background: '#0c0d14' }}>
                  <User size={18} style={{ color: 'var(--primary)' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Header Section */}
        <header className="app-header">
          <div className="logo-container">
            <DownloadCloud size={40} className="logo-icon" />
            <h1 className="app-title">GagaStreama</h1>
          </div>
          <p className="app-subtitle">
            Premium media downloader. Instantly save audio (MP3), video (MP4), and images from YouTube and Instagram.
          </p>
        </header>

        {/* Main Tab Render */}
        <main>
          <Downloader
            customApi={customApi}
            onAddHistory={handleAddHistory}
          />
        </main>

        <footer style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#475569', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
          GagaStreama Downloader Core © 2026. Built with speed, safety, and privacy in mind.
        </footer>
      </div>
    </div>
  );
}
