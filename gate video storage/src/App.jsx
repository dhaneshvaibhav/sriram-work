import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Upload, Video, CheckCircle, AlertCircle, Play, Home, Info, Heart } from 'lucide-react';
import './index.css';

const API_BASE_URL = 'http://localhost:5000';

const Navbar = () => {
  const location = useLocation();
  
  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">
        <Video size={28} />
        <span>EduVault</span>
      </Link>
      <div className="nav-links">
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
          <Upload size={18} style={{ marginRight: '4px' }} />
          Upload
        </Link>
        <Link to="/library" className={`nav-link ${location.pathname === '/library' ? 'active' : ''}`}>
          <Play size={18} style={{ marginRight: '4px' }} />
          Library
        </Link>
      </div>
    </nav>
  );
};

const UploadPage = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState({ type: '', message: '' });

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('video', file);

    setUploading(true);
    setUploadProgress(0);
    setStatus({ type: '', message: '' });

    try {
      await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      setStatus({ type: 'success', message: 'Video uploaded successfully!' });
      if (onUploadSuccess) onUploadSuccess();
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.message || 'Upload failed. Please try again.' });
    } finally {
      setUploading(false);
    }
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.wmv', '.mkv'] },
    multiple: false
  });

  return (
    <div className="page-content">
      <header className="page-header">
        <h1>Upload Educational Content</h1>
        <p>Upload your videos to share knowledge and learn together.</p>
      </header>

      <div className="upload-card">
        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          <div className="dropzone-content">
            <Upload size={64} className="dropzone-icon" />
            {isDragActive ? (
              <p>Drop the video here...</p>
            ) : (
              <>
                <p>Drag & drop a video file here, or click to select</p>
                <span>Supports MP4, MOV, AVI, WMV, MKV</span>
              </>
            )}
          </div>
        </div>

        {uploading && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        )}

        {status.message && (
          <div className={`status-message ${status.type}`}>
            {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
};

const LibraryPage = ({ videos, fetchVideos }) => {
  useEffect(() => {
    fetchVideos();
  }, []);

  return (
    <div className="page-content">
      <header className="page-header">
        <h1>Video Library</h1>
        <p>Access all uploaded educational videos in one place.</p>
      </header>

      {videos.length === 0 ? (
        <div className="no-videos" style={{ padding: '6rem 2rem' }}>
          <Video size={64} style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
          <p>No videos found in the library.</p>
        </div>
      ) : (
        <div className="video-grid">
          {videos.map((video) => (
            <div key={video.id} className="video-card">
              <video className="video-preview" controls>
                <source src={`${API_BASE_URL}${video.url}`} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <div className="video-info">
                <h3>{video.name}</h3>
                <p>Educational Video</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function App() {
  const [videos, setVideos] = useState([]);

  const fetchVideos = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/videos`);
      setVideos(response.data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <main className="app-container">
          <Routes>
            <Route path="/" element={<UploadPage onUploadSuccess={fetchVideos} />} />
            <Route path="/library" element={<LibraryPage videos={videos} fetchVideos={fetchVideos} />} />
          </Routes>
        </main>
        <footer style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          EduVault &copy; 2026. Empowering through education.
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
