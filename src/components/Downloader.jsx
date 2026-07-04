import React, { useState, useEffect, useRef } from 'react';
import { Download, Link as LinkIcon, AlertCircle, FileAudio, FileVideo, Image as ImageIcon, Sparkles, CheckCircle } from 'lucide-react';
import PickerView from './PickerView';

export default function Downloader({ customApi, onAddHistory }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [downloadingFormat, setDownloadingFormat] = useState(null); // 'mp3', 'mp4', 'image'
  const [selectedQuality, setSelectedQuality] = useState('480'); // Default YouTube resolution to 480p
  const [selectedBitrate, setSelectedBitrate] = useState('128');
  const [isUrlDirty, setIsUrlDirty] = useState(false);
  const [isQualityDropdownOpen, setIsQualityDropdownOpen] = useState(false);
  const [isBitrateDropdownOpen, setIsBitrateDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const bitrateDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsQualityDropdownOpen(false);
      }
      if (bitrateDropdownRef.current && !bitrateDropdownRef.current.contains(event.target)) {
        setIsBitrateDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const sanitizeUrl = (urlStr) => {
    try {
      const urlObj = new URL(urlStr.trim());
      if (urlObj.hostname.includes('instagram.com')) {
        urlObj.search = '';
      } else if (urlObj.hostname.includes('youtu.be') || urlObj.hostname.includes('youtube.com')) {
        const v = urlObj.searchParams.get('v');
        urlObj.search = '';
        if (v) {
          urlObj.searchParams.set('v', v);
        }
      } else if (urlObj.hostname.includes('twitter.com') || urlObj.hostname.includes('x.com')) {
        urlObj.search = '';
      } else if (urlObj.hostname.includes('pinterest.com') || urlObj.hostname.includes('pin.it')) {
        urlObj.search = '';
      }
      return urlObj.toString();
    } catch (e) {
      return urlStr.trim();
    }
  };

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
    if (result) {
      setIsUrlDirty(true);
    }
  };

  const getPlatformName = (urlStr) => {
    const lower = urlStr.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'YouTube';
    if (lower.includes('instagram.com')) return 'Instagram';
    if (lower.includes('twitter.com') || lower.includes('x.com')) return 'Twitter/X';
    if (lower.includes('pinterest.com') || lower.includes('pin.it')) return 'Pinterest';
    return 'Social Media';
  };

  const getYouTubeId = (urlStr) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = urlStr.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    const cleanedUrl = sanitizeUrl(url);
    setUrl(cleanedUrl);

    // Platform validation: YouTube, Instagram, X (Twitter), and Pinterest are allowed
    const lowerUrl = cleanedUrl.toLowerCase();
    const isYouTube = lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be');
    const isInstagram = lowerUrl.includes('instagram.com');
    const isTwitter = lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com');
    const isPinterest = lowerUrl.includes('pinterest.com') || lowerUrl.includes('pin.it');

    if (!isYouTube && !isInstagram && !isTwitter && !isPinterest) {
      setError('Only YouTube, Instagram, X (Twitter), and Pinterest URLs are supported.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setIsUrlDirty(false);

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: cleanedUrl,
          downloadMode: 'auto',
          customApiOverride: customApi
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process URL');
      }

      setResult(data);
    } catch (err) {
      console.error('Analyze error:', err);
      setError(err.message || 'An error occurred while connecting to the download server.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to trigger browser download
  const triggerDownload = (downloadUrl, filename) => {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadVideo = async () => {
    if (!result) return;
    setDownloadingFormat('mp4');
    setError(null);

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url,
          downloadMode: 'auto',
          videoQuality: selectedQuality,
          customApiOverride: customApi
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate video stream');
      }

      const streamUrl = data.url;
      const rawFilename = data.filename || `${getPlatformName(url)}_video.mp4`;
      const finalFilename = `GagaStreama_${rawFilename}`;
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}&filename=${encodeURIComponent(finalFilename)}`;
      
      triggerDownload(proxyUrl, finalFilename);
      onAddHistory(finalFilename, 'video', proxyUrl);
    } catch (err) {
      console.error('Video download error:', err);
      setError('Could not download video format: ' + err.message);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleDownloadAudio = async () => {
    if (!result) return;
    setDownloadingFormat('mp3');
    setError(null);

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url,
          downloadMode: 'audio',
          audioFormat: 'mp3',
          audioBitrate: selectedBitrate,
          customApiOverride: customApi
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate audio stream');
      }

      const streamUrl = data.url;
      let rawFilename = data.filename || `${getPlatformName(url)}_audio.mp3`;
      if (!rawFilename.toLowerCase().endsWith('.mp3')) {
        const dotIndex = rawFilename.lastIndexOf('.');
        if (dotIndex !== -1) {
          rawFilename = rawFilename.substring(0, dotIndex) + '.mp3';
        } else {
          rawFilename += '.mp3';
        }
      }

      const finalFilename = `GagaStreama_${rawFilename}`;
      const thumbUrl = getDisplayThumbnail();
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}&filename=${encodeURIComponent(finalFilename)}&thumbnail=${encodeURIComponent(thumbUrl)}`;
      
      triggerDownload(proxyUrl, finalFilename);
      onAddHistory(finalFilename, 'audio', proxyUrl);
    } catch (err) {
      console.error('Audio download error:', err);
      setError('Could not download audio format: ' + err.message);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleDownloadImage = () => {
    if (!result) return;
    setDownloadingFormat('image');

    const ytId = getYouTubeId(url);
    const imageUrl = ytId 
      ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` 
      : (result.thumb || result.url); // Fallback to thumb or URL (for Instagram/TikTok)

    const rawFilename = `${getPlatformName(url)}_thumbnail.jpg`;
    const finalFilename = `GagaStreama_${rawFilename}`;
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(finalFilename)}`;
    
    triggerDownload(proxyUrl, finalFilename);
    onAddHistory(finalFilename, 'image', proxyUrl);
    
    setTimeout(() => setDownloadingFormat(null), 3000);
  };

  // Determine thumbnail to display on the card
  const getDisplayThumbnail = () => {
    if (!result) return '';
    const ytId = getYouTubeId(url);
    if (ytId) {
      return `https://img.youtube.com/vi/${ytId}/0.jpg`;
    }
    return result.thumb || '';
  };

  const isInstagramUrl = url.toLowerCase().includes('instagram.com');
  const isImageFile = result && (
    (result.filename && (
      result.filename.toLowerCase().endsWith('.jpg') ||
      result.filename.toLowerCase().endsWith('.jpeg') ||
      result.filename.toLowerCase().endsWith('.png') ||
      result.filename.toLowerCase().endsWith('.webp') ||
      result.filename.toLowerCase().endsWith('.gif')
    )) ||
    (result.url && (
      result.url.toLowerCase().includes('.jpg') ||
      result.url.toLowerCase().includes('.jpeg') ||
      result.url.toLowerCase().includes('.png') ||
      result.url.toLowerCase().includes('.webp')
    ))
  );

  const isVideoFile = result && !isImageFile && (
    (result.filename && (
      result.filename.toLowerCase().endsWith('.mp4') ||
      result.filename.toLowerCase().endsWith('.mov') ||
      result.filename.toLowerCase().endsWith('.webm')
    )) ||
    (result.url && (
      result.url.toLowerCase().includes('.mp4') ||
      result.url.toLowerCase().includes('.mov') ||
      result.url.toLowerCase().includes('id=')
    )) ||
    // Default to video for single-item Instagram posts (e.g. reels) unless it's known to be a photo
    (isInstagramUrl && result.status !== 'picker')
  );

  return (
    <div className="downloader-container">
      <form onSubmit={handleAnalyze} className="search-container">
        <div className="input-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Paste YouTube, Instagram, X (Twitter), or Pinterest link here..."
            value={url}
            onChange={handleUrlChange}
            disabled={loading}
          />
          <LinkIcon className="input-icon" size={18} />
        </div>
        <button type="submit" className="btn-primary" disabled={loading || !url.trim()}>
          {loading ? (
            <>
              <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', animationDuration: '0.8s' }}></div>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Fetch Media</span>
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="alert-box alert-error">
          <AlertCircle className="alert-icon" size={20} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.15rem' }}>Failed to download</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{error}</div>
          </div>
        </div>
      )}

      {/* RENDER MEDIA CARD OR MULTI-ITEM PICKER */}
      {result && (
        <>
          {isUrlDirty && (
            <div className="alert-box alert-error" style={{ background: 'rgba(251, 191, 36, 0.08)', borderColor: 'rgba(251, 191, 36, 0.25)', color: '#fef08a', marginBottom: '1.5rem', pointerEvents: 'auto' }}>
              <AlertCircle className="alert-icon" size={18} style={{ color: '#fbbf24' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>URL Modified</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Click "Fetch Media" to refresh the download options for your new URL.</div>
              </div>
            </div>
          )}

          <div className={`result-container ${isUrlDirty ? 'url-dirty' : ''}`}>
            {result.status === 'picker' && result.picker ? (
              <PickerView
                pickerItems={result.picker}
                title={getPlatformName(url)}
                onDownloadSuccess={onAddHistory}
              />
            ) : (
              <>
                <div className="picker-title" style={{ marginBottom: '1rem' }}>
                  <CheckCircle size={20} style={{ color: '#10b981' }} />
                  <span>Media Analyzed Successfully</span>
                </div>
                
                <div className="media-card">
                  {getDisplayThumbnail() && (
                    <div className="media-thumbnail-wrapper">
                      <img
                        src={getDisplayThumbnail()}
                        alt="Media Thumbnail"
                        className="media-thumbnail"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="media-info">
                    <div className="media-title" title={result.filename || 'Untitled Media'}>
                      {result.filename || 'Untitled Media'}
                    </div>
                    <div className="media-meta">
                      <span className="badge-platform">
                        <span>{getPlatformName(url)}</span>
                      </span>
                      {result.apiNodeUsed && (
                        <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                          Processed via: {new URL(result.apiNodeUsed).hostname}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="options-grid">
                  {/* MP3 Download Card - Hidden for Instagram */}
                  {!isImageFile && !isInstagramUrl && (
                    <div className="download-option-card primary-option">
                      <div className="option-icon-wrapper">
                        <FileAudio size={22} />
                      </div>
                      <span className="option-label">MP3 Audio</span>
                      
                      <div className="select-wrapper" ref={bitrateDropdownRef} style={{ position: 'relative', width: '100%' }}>
                        <div 
                          className={`custom-select-trigger ${isBitrateDropdownOpen ? 'active' : ''}`}
                          onClick={() => downloadingFormat === null && setIsBitrateDropdownOpen(!isBitrateDropdownOpen)}
                          style={{
                            width: '100%',
                            background: 'rgba(0, 0, 0, 0.45)',
                            border: '1.5px solid var(--border-color)',
                            padding: '0.65rem 1rem',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-primary)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'center',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all var(--transition-fast)'
                          }}
                        >
                          <span>{
                            selectedBitrate === '320' ? '320 kbps (High Quality)' :
                            selectedBitrate === '256' ? '256 kbps (Medium-High)' :
                            selectedBitrate === '128' ? '128 kbps (Standard)' :
                            selectedBitrate === '96' ? '96 kbps (Medium)' :
                            selectedBitrate === '64' ? '64 kbps (Low)' :
                            '8 kbps (Tiny)'
                          }</span>
                          <span className="dropdown-arrow-icon" style={{
                            border: 'solid var(--primary)',
                            borderWidth: '0 2px 2px 0',
                            display: 'inline-block',
                            padding: '3px',
                            transform: isBitrateDropdownOpen ? 'rotate(-135deg)' : 'rotate(45deg)',
                            transition: 'transform var(--transition-fast)',
                            marginLeft: '4px'
                          }}></span>
                        </div>
                        
                        {isBitrateDropdownOpen && (
                          <div 
                            className="custom-dropdown-list glass-card"
                            style={{
                              position: 'absolute',
                              top: '110%',
                              left: 0,
                              right: 0,
                              background: '#0a0b12',
                              border: '1.5px solid var(--primary)',
                              borderRadius: '8px',
                              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.7), 0 0 15px rgba(251, 191, 36, 0.1)',
                              zIndex: 100,
                              maxHeight: '220px',
                              overflowY: 'auto',
                              padding: '4px'
                            }}
                          >
                            {[
                              { value: '320', label: '320 kbps (High Quality)' },
                              { value: '256', label: '256 kbps (Medium-High)' },
                              { value: '128', label: '128 kbps (Standard)' },
                              { value: '96', label: '96 kbps (Medium)' },
                              { value: '64', label: '64 kbps (Low)' },
                              { value: '8', label: '8 kbps (Tiny)' }
                            ].map((opt) => (
                              <div
                                key={opt.value}
                                className={`custom-dropdown-option ${selectedBitrate === opt.value ? 'selected' : ''}`}
                                onClick={() => {
                                  setSelectedBitrate(opt.value);
                                  setIsBitrateDropdownOpen(false);
                                }}
                                style={{
                                  padding: '0.6rem 1rem',
                                  fontSize: '0.8rem',
                                  color: selectedBitrate === opt.value ? '#000' : 'var(--text-primary)',
                                  background: selectedBitrate === opt.value ? 'var(--primary)' : 'transparent',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                  fontWeight: selectedBitrate === opt.value ? 'bold' : '500',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (selectedBitrate !== opt.value) {
                                    e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)';
                                    e.currentTarget.style.color = 'var(--primary)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (selectedBitrate !== opt.value) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-primary)';
                                  }
                                }}
                              >
                                {opt.label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleDownloadAudio}
                        disabled={downloadingFormat !== null}
                        className="btn-primary"
                        style={{ width: '100%', marginTop: '0.75rem', padding: '0.6rem 0', height: '38px', fontSize: '0.85rem', borderRadius: '8px', boxShadow: 'none' }}
                      >
                        {downloadingFormat === 'mp3' ? (
                          <>
                            <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', animationDuration: '0.8s' }}></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <Download size={14} />
                            <span>Download MP3</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* MP4 Download Card - Hidden for Instagram photo posts */}
                  {!isImageFile && (!isInstagramUrl || isVideoFile) && (
                    <div className="download-option-card primary-option">
                      <div className="option-icon-wrapper">
                        <FileVideo size={22} />
                      </div>
                      <span className="option-label">MP4 Video</span>

                      <div className="select-wrapper" ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
                        <div 
                          className={`custom-select-trigger ${isQualityDropdownOpen ? 'active' : ''}`}
                          onClick={() => downloadingFormat === null && setIsQualityDropdownOpen(!isQualityDropdownOpen)}
                          style={{
                            width: '100%',
                            background: 'rgba(0, 0, 0, 0.45)',
                            border: '1.5px solid var(--border-color)',
                            padding: '0.65rem 1rem',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-primary)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'center',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all var(--transition-fast)'
                          }}
                        >
                          <span>{
                            selectedQuality === '2160' ? '2160p (4K UHD)' :
                            selectedQuality === '1440' ? '1440p (2K QHD)' :
                            selectedQuality === '1080' ? '1080p (Full HD)' :
                            selectedQuality === '720' ? '720p (HD)' :
                            selectedQuality === '480' ? '480p (Standard)' :
                            selectedQuality === '360' ? '360p (Low)' :
                            selectedQuality === '240' ? '240p (Very Low)' :
                            '144p (Tiny)'
                          }</span>
                          <span className="dropdown-arrow-icon" style={{
                            border: 'solid var(--primary)',
                            borderWidth: '0 2px 2px 0',
                            display: 'inline-block',
                            padding: '3px',
                            transform: isQualityDropdownOpen ? 'rotate(-135deg)' : 'rotate(45deg)',
                            transition: 'transform var(--transition-fast)',
                            marginLeft: '4px'
                          }}></span>
                        </div>
                        
                        {isQualityDropdownOpen && (
                          <div 
                            className="custom-dropdown-list glass-card"
                            style={{
                              position: 'absolute',
                              top: '110%',
                              left: 0,
                              right: 0,
                              background: '#0a0b12',
                              border: '1.5px solid var(--primary)',
                              borderRadius: '8px',
                              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.7), 0 0 15px rgba(251, 191, 36, 0.1)',
                              zIndex: 100,
                              maxHeight: '220px',
                              overflowY: 'auto',
                              padding: '4px'
                            }}
                          >
                            {[
                              { value: '2160', label: '2160p (4K UHD)' },
                              { value: '1440', label: '1440p (2K QHD)' },
                              { value: '1080', label: '1080p (Full HD)' },
                              { value: '720', label: '720p (HD)' },
                              { value: '480', label: '480p (Standard)' },
                              { value: '360', label: '360p (Low)' },
                              { value: '240', label: '240p (Very Low)' },
                              { value: '144', label: '144p (Tiny)' }
                            ].map((opt) => (
                              <div
                                key={opt.value}
                                className={`custom-dropdown-option ${selectedQuality === opt.value ? 'selected' : ''}`}
                                onClick={() => {
                                  setSelectedQuality(opt.value);
                                  setIsQualityDropdownOpen(false);
                                }}
                                style={{
                                  padding: '0.6rem 1rem',
                                  fontSize: '0.8rem',
                                  color: selectedQuality === opt.value ? '#000' : 'var(--text-primary)',
                                  background: selectedQuality === opt.value ? 'var(--primary)' : 'transparent',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                  fontWeight: selectedQuality === opt.value ? 'bold' : '500',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (selectedQuality !== opt.value) {
                                    e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)';
                                    e.currentTarget.style.color = 'var(--primary)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (selectedQuality !== opt.value) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-primary)';
                                  }
                                }}
                              >
                                {opt.label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleDownloadVideo}
                        disabled={downloadingFormat !== null}
                        className="btn-primary"
                        style={{ width: '100%', marginTop: '0.75rem', padding: '0.6rem 0', height: '38px', fontSize: '0.85rem', borderRadius: '8px', boxShadow: 'none' }}
                      >
                        {downloadingFormat === 'mp4' ? (
                          <>
                            <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', animationDuration: '0.8s' }}></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <Download size={14} />
                            <span>Download MP4</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Image Download Card - Hidden for Instagram video posts */}
                  {(!isInstagramUrl || !isVideoFile) && (
                    <div className="download-option-card">
                      <div className="option-icon-wrapper">
                        <ImageIcon size={22} />
                      </div>
                      <span className="option-label">Save Cover</span>
                      
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '38px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', lineHeight: '1.3' }}>
                          Standard media cover thumbnail
                        </span>
                      </div>

                      <button
                        onClick={handleDownloadImage}
                        disabled={downloadingFormat !== null}
                        className="btn-primary"
                        style={{ width: '100%', marginTop: '0.75rem', padding: '0.6rem 0', height: '38px', fontSize: '0.85rem', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', boxShadow: 'none' }}
                      >
                        {downloadingFormat === 'image' ? (
                          <>
                            <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', animationDuration: '0.8s' }}></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Download size={14} />
                            <span>Download Image</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
