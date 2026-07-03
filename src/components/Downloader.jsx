import React, { useState } from 'react';
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

    // Platform validation: Only YouTube and Instagram are allowed
    const lowerUrl = url.toLowerCase();
    const isYouTube = lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be');
    const isInstagram = lowerUrl.includes('instagram.com');

    if (!isYouTube && !isInstagram) {
      setError('Only YouTube and Instagram URLs are supported.');
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
          url: url,
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
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}&filename=${encodeURIComponent(rawFilename)}`;
      
      triggerDownload(proxyUrl, rawFilename);
      onAddHistory(rawFilename, 'video', proxyUrl);
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

      const proxyUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}&filename=${encodeURIComponent(rawFilename)}`;
      
      triggerDownload(proxyUrl, rawFilename);
      onAddHistory(rawFilename, 'audio', proxyUrl);
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
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(rawFilename)}`;
    
    triggerDownload(proxyUrl, rawFilename);
    onAddHistory(rawFilename, 'image', proxyUrl);
    
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
  const isVideoFile = result && (
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
            placeholder="Paste YouTube or Instagram link here..."
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
                  {!isInstagramUrl && (
                    <div className="download-option-card primary-option">
                      <div className="option-icon-wrapper">
                        <FileAudio size={22} />
                      </div>
                      <span className="option-label">MP3 Audio</span>
                      
                      <div className="select-wrapper">
                        <select
                          className="quality-select"
                          value={selectedBitrate}
                          onChange={(e) => setSelectedBitrate(e.target.value)}
                          disabled={downloadingFormat !== null}
                        >
                          <option value="320">320 kbps (High Quality)</option>
                          <option value="256">256 kbps (Medium-High)</option>
                          <option value="128">128 kbps (Standard)</option>
                          <option value="96">96 kbps (Medium)</option>
                          <option value="64">64 kbps (Low)</option>
                          <option value="8">8 kbps (Tiny)</option>
                        </select>
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
                  {(!isInstagramUrl || isVideoFile) && (
                    <div className="download-option-card primary-option">
                      <div className="option-icon-wrapper">
                        <FileVideo size={22} />
                      </div>
                      <span className="option-label">MP4 Video</span>

                      <div className="select-wrapper">
                        <select
                          className="quality-select"
                          value={selectedQuality}
                          onChange={(e) => setSelectedQuality(e.target.value)}
                          disabled={downloadingFormat !== null}
                        >
                          <option value="2160">2160p (4K UHD)</option>
                          <option value="1440">1440p (2K QHD)</option>
                          <option value="1080">1080p (Full HD)</option>
                          <option value="720">720p (HD)</option>
                          <option value="480">480p (Standard)</option>
                          <option value="360">360p (Low)</option>
                          <option value="240">240p (Very Low)</option>
                          <option value="144">144p (Tiny)</option>
                        </select>
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
