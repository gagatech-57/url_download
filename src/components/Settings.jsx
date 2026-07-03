import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Server, ShieldCheck, HelpCircle, Save, RotateCw, AlertTriangle } from 'lucide-react';

export default function Settings({ customApi, setCustomApi, googleClientId, setGoogleClientId, onDemoLogin }) {
  const [inputValue, setInputValue] = useState(customApi);
  const [clientIdInput, setClientIdInput] = useState(googleClientId);
  const [backendStatus, setBackendStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setBackendStatus(data);
      } else {
        setBackendStatus({ status: 'offline', error: 'Failed to retrieve stats' });
      }
    } catch (e) {
      setBackendStatus({ status: 'offline', error: 'Connection refused' });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setCustomApi(inputValue);
    localStorage.setItem('custom_cobalt_api', inputValue);
    
    setGoogleClientId(clientIdInput);
    localStorage.setItem('google_client_id', clientIdInput);
    
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSelectPreset = (url) => {
    setInputValue(url);
  };

  const presetInstances = [
    { name: 'melon.clxxped.lol', url: 'https://melon.clxxped.lol' },
    { name: 'nuko-c.meowing.de', url: 'https://nuko-c.meowing.de' },
    { name: 'subito-c.meowing.de', url: 'https://subito-c.meowing.de' },
    { name: 'api.qwkuns.me', url: 'https://api.qwkuns.me' }
  ];

  return (
    <div className="settings-container">
      <div className="picker-title" style={{ color: '#fbbf24', marginBottom: '1.5rem' }}>
        <SettingsIcon size={22} className="logo-icon" style={{ animation: 'none' }} />
        <span>Application Settings</span>
      </div>

      <form onSubmit={handleSave}>
        <div className="settings-group">
          <label className="settings-label" htmlFor="custom-api">
            Custom Cobalt Server URL Override
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              id="custom-api"
              type="text"
              className="settings-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="e.g. https://api.cobalt.tools (Leave blank for auto-proxy)"
            />
          </div>
          <p className="settings-desc">
            If the default automatic proxy server experiences high load or rate limits, you can override it with a community-hosted Cobalt instance. Leave blank to use the server's load-balanced auto proxy pool.
          </p>
        </div>

        <div className="settings-group" style={{ marginTop: '1.5rem' }}>
          <label className="settings-label" htmlFor="google-client-id">
            Google OAuth Client ID
          </label>
          <input
            id="google-client-id"
            type="text"
            className="settings-input"
            value={clientIdInput}
            onChange={(e) => setClientIdInput(e.target.value)}
            placeholder="YOUR_CLIENT_ID.apps.googleusercontent.com"
            style={{ width: '100%' }}
          />
          <p className="settings-desc">
            To use a real Google Sign-In popup selector, create a free OAuth Client ID in the <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#fbbf24', textDecoration: 'underline' }}>Google Cloud Console</a>. Add your app's web origin (e.g., <code>http://localhost:5000</code>) to the <b>Authorized JavaScript Origins</b> list.
          </p>
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem', height: '42px', borderRadius: '8px' }}>
          <Save size={16} />
          <span style={{ fontSize: '0.9rem' }}>Save All Settings</span>
        </button>
      </form>

      {saveSuccess && (
        <div className="alert-box alert-success" style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>
          <ShieldCheck size={18} className="alert-icon" />
          <span>API settings updated successfully!</span>
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <span className="settings-label" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          Quick-select Working Presets
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {presetInstances.map((preset) => (
            <button
              key={preset.url}
              type="button"
              className="btn-small"
              onClick={() => handleSelectPreset(preset.url)}
              style={{
                borderColor: inputValue === preset.url ? '#fbbf24' : 'rgba(255,255,255,0.08)',
                background: inputValue === preset.url ? 'rgba(251,191,36,0.1)' : 'transparent',
                fontSize: '0.8rem'
              }}
            >
              {preset.name}
            </button>
          ))}
          <button
            type="button"
            className="btn-small"
            onClick={() => handleSelectPreset('')}
            style={{
              borderColor: inputValue === '' ? '#10b981' : 'rgba(255,255,255,0.08)',
              background: inputValue === '' ? 'rgba(16,185,129,0.1)' : 'transparent',
              fontSize: '0.8rem',
              color: '#34d399'
            }}
          >
            Reset (Auto Proxy)
          </button>
        </div>
      </div>

      <div className="settings-group" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className="settings-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
            <Server size={16} /> Backend Status Tracker
          </span>
          <button 
            onClick={fetchStatus} 
            className="btn-icon" 
            disabled={loadingStatus}
            title="Refresh Status"
          >
            <RotateCw size={14} className={loadingStatus ? 'logo-icon' : ''} />
          </button>
        </div>

        {backendStatus ? (
          <div className="backend-info-grid">
            <div>
              <div className="info-label">Server Connection</div>
              <div className="info-val">
                <span className="status-badge">
                  <span className={`status-dot ${backendStatus.status === 'online' ? 'online' : ''}`} style={{ backgroundColor: backendStatus.status === 'online' ? '#10b981' : '#ef4444' }}></span>
                  <span style={{ color: backendStatus.status === 'online' ? '#34d399' : '#f87171' }}>
                    {backendStatus.status === 'online' ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </span>
              </div>
            </div>
            {backendStatus.status === 'online' && (
              <>
                <div>
                  <div className="info-label">Active Media Nodes</div>
                  <div className="info-val" style={{ color: '#fff' }}>{backendStatus.nodesCount || 0} nodes online</div>
                </div>
                <div>
                  <div className="info-label">Dynamic Node Cache Age</div>
                  <div className="info-val">{backendStatus.cacheAgeSeconds}s ago</div>
                </div>
                <div>
                  <div className="info-label">Main Services Supported</div>
                  <div className="info-val" style={{ textTransform: 'capitalize', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {backendStatus.servicesSupported?.filter(s => s !== 'Frontend').slice(0, 5).join(', ') || 'N/A'}
                  </div>
                </div>
              </>
            )}
            {backendStatus.status !== 'online' && (
              <div style={{ gridColumn: 'span 2', color: '#f87171', fontSize: '0.8rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                <AlertTriangle size={12} /> Connection to local backend server failed. Make sure you are running the backend server.
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Checking backend diagnostics...</div>
        )}
      </div>

      {/* Developer Mode fallback Sign-in */}
      <div className="settings-section" style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span className="settings-label" style={{ margin: 0 }}>
            Developer / Mock Sign-In Mode
          </span>
        </div>
        <button 
          type="button" 
          onClick={onDemoLogin} 
          className="btn-primary" 
          style={{ width: '100%', height: '40px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', boxShadow: 'none' }}
        >
          Simulate Google Login (Skip Setup)
        </button>
        <p className="settings-desc" style={{ marginTop: '0.5rem' }}>
          Click this button to quickly mock a logged-in Google session. Useful for immediate testing of avatar highlights, history, and user settings menus without needing custom API origins.
        </p>
      </div>
    </div>
  );
}
