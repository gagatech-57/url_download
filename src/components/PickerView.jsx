import React from 'react';
import { Download, ExternalLink, Image, Video, Eye } from 'lucide-react';

export default function PickerView({ pickerItems, title, onDownloadSuccess }) {
  const getProxyUrl = (url, type, index) => {
    const ext = type === 'video' ? 'mp4' : 'jpg';
    const filename = `${title ? title.substring(0, 30) : 'media'}_item_${index + 1}.${ext}`;
    return `/api/proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
  };

  const handleDownloadClick = (url, type, index) => {
    const ext = type === 'video' ? 'mp4' : 'jpg';
    const filename = `${title ? title.substring(0, 30) : 'media'}_item_${index + 1}.${ext}`;
    onDownloadSuccess(filename, type, getProxyUrl(url, type, index));
  };

  return (
    <div className="picker-container" style={{ marginTop: '2rem' }}>
      <div className="picker-title">
        <Image size={20} className="logo-icon" style={{ animation: 'none' }} />
        <span>Multiple Items Found ({pickerItems.length})</span>
      </div>
      <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
        This post contains multiple media items. Click download on each item to save them individually.
      </p>
      
      <div className="picker-grid">
        {pickerItems.map((item, index) => {
          // If no thumb, check if it's a photo and use the url itself as thumb preview
          const isVideo = item.type === 'video';
          const previewUrl = item.thumb || (!isVideo ? item.url : null);
          
          return (
            <div key={index} className="picker-card">
              <div className="picker-media-wrapper">
                {previewUrl ? (
                  <img src={previewUrl} alt={`Item ${index + 1}`} className="picker-media" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569' }}>
                    <Video size={36} />
                    <span style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Video Stream</span>
                  </div>
                )}
                
                <span className="picker-badge-type">
                  {isVideo ? <Video size={10} /> : <Image size={10} />}
                  <span>{isVideo ? 'Video' : 'Photo'}</span>
                </span>
              </div>
              
              <div className="picker-actions">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-small"
                  title="View Original"
                >
                  <Eye size={14} />
                  <span>View</span>
                </a>
                <a
                  href={getProxyUrl(item.url, item.type || 'photo', index)}
                  onClick={() => handleDownloadClick(item.url, item.type || 'photo', index)}
                  className="btn-small btn-small-primary"
                  title="Download File"
                  download
                >
                  <Download size={14} />
                  <span>Download</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
