import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Upload, 
  Database, 
  Folder, 
  Trash2, 
  Plus, 
  Info, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  ChevronRight,
  Download
} from 'lucide-react';
import './index.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// --- Shared Components ---

const Navbar = () => {
  const location = useLocation();
  const [authStatus, setAuthStatus] = useState({ loading: true, authenticated: false });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/status`);
        setAuthStatus({ loading: false, authenticated: response.data.hf_authenticated });
      } catch (error) {
        console.error('Health check failed:', error);
        setAuthStatus({ loading: false, authenticated: false });
      }
    };
    checkAuth();
  }, []);

  return (
    <nav className="navbar">
      <div style={{display: 'flex', alignItems: 'center', gap: '2rem'}}>
        <Link to="/" className="nav-logo">
          <Database size={28} />
          <span>EduVault HF</span>
        </Link>
        <div className="auth-badge">
          {authStatus.loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : authStatus.authenticated ? (
            <div className="badge-success"><CheckCircle size={14} /> HF Connected</div>
          ) : (
            <div className="badge-error"><AlertCircle size={14} /> HF Disconnected</div>
          )}
        </div>
      </div>
      <div className="nav-links">
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
          <Database size={18} /> Buckets
        </Link>
        <Link to="/files" className={`nav-link ${location.pathname === '/files' ? 'active' : ''}`}>
          <Folder size={18} /> Files
        </Link>
      </div>
    </nav>
  );
};

const StatusMessage = ({ status, setStatus }) => {
  useEffect(() => {
    if (status.message) {
      const timer = setTimeout(() => {
        setStatus({ type: '', message: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status, setStatus]);

  if (!status.message) return null;
  return (
    <div className={`status-message ${status.type}`}>
      {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
      {status.message}
    </div>
  );
};

// --- Bucket Management ---

const BucketManager = () => {
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newBucket, setNewBucket] = useState({ name: '', private: true });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [selectedInfo, setSelectedInfo] = useState(null);

  const fetchBuckets = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/bucket/list`);
      setBuckets(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching buckets:', error);
      setStatus({ type: 'error', message: 'Failed to fetch buckets.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuckets();
  }, []);

  const handleCreateBucket = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    try {
      await axios.post(`${API_BASE_URL}/api/bucket/create`, {
        bucket_name: newBucket.name,
        private: newBucket.private
      });
      setStatus({ type: 'success', message: 'Bucket created successfully!' });
      setNewBucket({ name: '', private: true });
      fetchBuckets();
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.message || 'Failed to create bucket.' });
    }
  };

  const viewInfo = async (bucketId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/bucket/info?bucket_id=${bucketId}`);
      setSelectedInfo(response.data);
    } catch (error) {
      console.error('Error fetching info:', error);
      alert('Failed to get bucket info');
    }
  };

  const handleDeleteBucket = async (bucketId) => {
    if (!window.confirm(`Are you sure you want to delete bucket ${bucketId}? This action cannot be undone.`)) return;
    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/bucket/delete?bucket_id=${bucketId}`);
      setStatus({ type: 'success', message: `Bucket ${bucketId} deleted successfully.` });
      fetchBuckets();
    } catch (error) {
      console.error('Error deleting bucket:', error);
      setStatus({ type: 'error', message: error.response?.data?.message || 'Failed to delete bucket.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <header className="page-header">
        <h1>Bucket Management</h1>
        <p>Manage your Hugging Face Storage Buckets.</p>
      </header>

      <div className="grid-layout">
        <section className="card">
          <h2><Plus size={20} /> Create New Bucket</h2>
          <form onSubmit={handleCreateBucket} className="form-group">
            <input 
              type="text" 
              placeholder="Bucket Name (e.g. my-awesome-bucket)"
              value={newBucket.name}
              onChange={(e) => setNewBucket({...newBucket, name: e.target.value})}
              required
            />
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={newBucket.private}
                onChange={(e) => setNewBucket({...newBucket, private: e.target.checked})}
              />
              Private Bucket
            </label>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="animate-spin" /> : 'Create Bucket'}
            </button>
          </form>
          <StatusMessage status={status} setStatus={setStatus} />
        </section>

        <section className="card">
          <h2><Database size={20} /> Existing Buckets</h2>
          {loading ? (
            <div className="loading-state"><Loader2 className="animate-spin" /> Loading buckets...</div>
          ) : buckets.length === 0 ? (
            <p className="empty-state">No buckets found.</p>
          ) : (
            <ul className="item-list">
              {buckets.map(bucket => (
                <li key={bucket.id} className="item">
                  <div className="item-info">
                    <strong>{bucket.id}</strong>
                    <span>{bucket.private ? 'Private' : 'Public'} • {bucket.total_files || 0} files</span>
                  </div>
                  <div className="item-actions">
                    <button onClick={() => viewInfo(bucket.id)} className="btn-icon" title="View Info">
                      <Info size={18} />
                    </button>
                    <button onClick={() => handleDeleteBucket(bucket.id)} className="btn-icon" style={{color: 'var(--error)'}} title="Delete Bucket">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {selectedInfo && (
        <div className="modal-overlay" onClick={() => setSelectedInfo(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Bucket Details</h3>
            <div className="info-grid">
              <p><strong>ID:</strong> {selectedInfo.id}</p>
              <p><strong>Visibility:</strong> {selectedInfo.private ? 'Private' : 'Public'}</p>
              <p><strong>Files:</strong> {selectedInfo.total_files}</p>
              <p><strong>Size:</strong> {(selectedInfo.size / 1024 / 1024).toFixed(2)} MB</p>
              <p><strong>Created:</strong> {new Date(selectedInfo.created_at).toLocaleDateString()}</p>
            </div>
            <button onClick={() => setSelectedInfo(null)} className="btn-secondary">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- File Operations ---

const FileManager = () => {
  const [buckets, setBuckets] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState('');
  const [files, setFiles] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const fetchBuckets = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/bucket/list`);
      setBuckets(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching buckets:', error);
    }
  };

  const fetchFiles = async (bucketId) => {
    if (!bucketId) {
      setFiles([]);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/file/bucket/list?bucket_id=${bucketId}`);
      setFiles(Array.isArray(response.data) ? response.data : []);
      setStatus({ type: 'success', message: `Fetched ${response.data.length} items from ${bucketId}` });
    } catch (error) {
      console.error('Error fetching files:', error);
      setStatus({ type: 'error', message: 'Failed to fetch files from bucket.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuckets();
  }, []);

  const onDrop = useCallback((acceptedFiles) => {
    if (!selectedBucket) {
      setStatus({ type: 'error', message: 'Please select a bucket first!' });
      return;
    }
    setPendingFiles(prev => [...prev, ...acceptedFiles]);
    setStatus({ type: '', message: '' });
  }, [selectedBucket]);

  const handleUpload = async () => {
    if (pendingFiles.length === 0 || !selectedBucket) return;

    setUploading(true);
    setStatus({ type: 'info', message: `Uploading ${pendingFiles.length} files...` });

    let successCount = 0;
    let failCount = 0;

    for (const file of pendingFiles) {
      const formData = new FormData();
      formData.append('video', file); // Changed from 'file' to 'video' to match backend
      formData.append('bucket_id', selectedBucket);

      try {
        await axios.post(`${API_BASE_URL}/api/file/upload`, formData);
        successCount++;
      } catch (error) {
        console.error(`Upload error for ${file.name}:`, error);
        failCount++;
      }
    }

    if (failCount === 0) {
      setStatus({ type: 'success', message: `Successfully uploaded ${successCount} files!` });
    } else {
      setStatus({ type: 'error', message: `Uploaded ${successCount} files, but ${failCount} failed.` });
    }

    setPendingFiles([]);
    fetchFiles(selectedBucket);
    setUploading(false);
  };

  const removePendingFile = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    multiple: true
  });

  const handleDelete = async (fileName) => {
    if (!window.confirm(`Are you sure you want to delete ${fileName} from bucket?`)) return;
    try {
      await axios.post(`${API_BASE_URL}/api/file/delete`, {
        bucket_id: selectedBucket,
        files: [fileName]
      });
      setStatus({ type: 'success', message: `Deleted ${fileName} from bucket` });
      fetchFiles(selectedBucket);
    } catch (error) {
      console.error('Delete error:', error);
      setStatus({ type: 'error', message: 'Delete failed.' });
    }
  };

  const handleDownload = async (fileName) => {
    try {
      setStatus({ type: 'info', message: `Downloading ${fileName} from bucket...` });
      
      // 1. Trigger server-side download from HF Bucket to local 'uploads'
      await axios.post(`${API_BASE_URL}/api/file/bucket/download`, {
        bucket_id: selectedBucket,
        files: [[fileName, fileName]] // repo_path, local_path
      });

      // 2. Open the local serving URL to download to browser
      const downloadUrl = `${API_BASE_URL}/api/file/serve/${fileName}`;
      window.open(downloadUrl, '_blank');
      
      setStatus({ type: 'success', message: `Downloaded ${fileName} successfully.` });
    } catch (error) {
      console.error('Download error:', error);
      setStatus({ type: 'error', message: 'Download failed.' });
    }
  };

  return (
    <div className="page-content">
      <header className="page-header">
        <h1>File Operations</h1>
        <p>Upload and manage files in your buckets.</p>
      </header>

      <div className="form-group mb-2">
        <label>Select Bucket</label>
        <select 
          value={selectedBucket} 
          onChange={(e) => {
            const b = e.target.value;
            setSelectedBucket(b);
            fetchFiles(b);
          }}
        >
          <option value="">-- Select a Bucket --</option>
          {buckets.map(b => <option key={b.id} value={b.id}>{b.id}</option>)}
        </select>
      </div>

      <div className="grid-layout">
        <section className="card">
          <h2><Upload size={20} /> Upload File</h2>
          <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''} ${!selectedBucket ? 'disabled' : ''}`}>
            <input {...getInputProps()} disabled={!selectedBucket} />
            <div className="dropzone-content">
              {uploading ? <Loader2 className="animate-spin" size={48} /> : <Upload size={48} />}
              <p>{selectedBucket ? 'Drag & drop multiple files here' : 'Select a bucket first'}</p>
            </div>
          </div>
          
          {pendingFiles.length > 0 && (
            <div className="pending-file">
              <div style={{marginBottom: '1rem'}}>
                <h3 style={{fontSize: '0.9rem', marginBottom: '0.5rem'}}>Pending Files ({pendingFiles.length})</h3>
                <ul className="item-list" style={{maxHeight: '200px', overflowY: 'auto', background: 'white', borderRadius: '0.5rem', border: '1px solid var(--border-color)'}}>
                  {pendingFiles.map((file, idx) => (
                    <li key={idx} className="item" style={{padding: '0.5rem 0.75rem'}}>
                      <div className="item-info">
                        <span style={{fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500}}>{file.name}</span>
                        <span style={{fontSize: '0.75rem'}}>{(file.size / 1024).toFixed(2)} KB</span>
                      </div>
                      <button 
                        onClick={() => removePendingFile(idx)} 
                        className="btn-icon" 
                        style={{color: 'var(--error)'}}
                        disabled={uploading}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <button 
                onClick={handleUpload} 
                disabled={uploading} 
                className="btn-primary w-full"
              >
                {uploading ? <Loader2 className="animate-spin" /> : `Upload ${pendingFiles.length} Files`}
              </button>
              <button 
                onClick={() => setPendingFiles([])} 
                disabled={uploading} 
                className="btn-secondary w-full"
                style={{marginTop: '0.5rem'}}
              >
                Clear All
              </button>
            </div>
          )}

          <StatusMessage status={status} setStatus={setStatus} />
        </section>

        <section className="card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem'}}>
            <h2 style={{margin: 0}}><Folder size={20} /> Bucket Files</h2>
            {selectedBucket && (
              <button onClick={() => fetchFiles(selectedBucket)} className="btn-icon" title="Refresh">
                <Loader2 size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="loading-state"><Loader2 className="animate-spin" /> Fetching files...</div>
          ) : !selectedBucket ? (
            <p className="empty-state">Select a bucket to view files.</p>
          ) : files.length === 0 ? (
            <p className="empty-state">No files found in this bucket.</p>
          ) : (
            <ul className="item-list">
              {files.map((file, idx) => (
                <li key={idx} className="item">
                  <div className="item-info">
                    <strong>{file.path}</strong>
                    <span>
                      {file.type === 'file' ? (file.size / 1024).toFixed(2) + ' KB' : 'Directory'} 
                      {file.last_modified && ` • ${new Date(file.last_modified).toLocaleDateString()}`}
                    </span>
                  </div>
                  <div className="item-actions">
                    {file.type === 'file' && (
                      <button onClick={() => handleDownload(file.path)} className="btn-icon" title="Download">
                        <Download size={18} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(file.path)} className="btn-icon" style={{color: 'var(--error)'}} title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

// --- Main App ---

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <main className="app-container">
          <Routes>
            <Route path="/" element={<BucketManager />} />
            <Route path="/files" element={<FileManager />} />
          </Routes>
        </main>
        <footer className="app-footer">
          EduVault HF &copy; 2026 • Powered by Hugging Face Storage
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
