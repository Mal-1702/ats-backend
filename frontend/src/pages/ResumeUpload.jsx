import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';

/* ─── Reusable FileUpload Component ─── */
const FileUpload = ({
  accept = "*/*",
  multiple = false,
  maxSize = 10 * 1024 * 1024,
  maxFiles = 150,
  onFilesSelect = () => {},
  onFilesRemove = () => {},
  className = ""
}) => {
  const [files, setFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    const errs = [];
    if (file.size > maxSize) {
      errs.push(`File size exceeds ${(maxSize / (1024 * 1024)).toFixed(0)}MB limit`);
    }
    if (accept !== "*/*") {
      const allowed = accept.split(',').map(t => t.trim());
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowed.includes(ext)) {
        errs.push(`File type not supported. Only ${allowed.join(', ')} allowed`);
      }
    }
    return errs;
  };

  const processFiles = useCallback((newFiles) => {
    const fileArray = Array.from(newFiles);
    const validFiles = [];
    const fileErrors = [];

    fileArray.forEach(file => {
      const validationErrors = validateFile(file);
      if (validationErrors.length === 0) {
        validFiles.push({
          file,
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
        });
      } else {
        fileErrors.push(`${file.name}: ${validationErrors.join(', ')}`);
      }
    });

    if (!multiple) {
      setFiles(validFiles.slice(0, 1));
      onFilesSelect(validFiles.slice(0, 1));
    } else {
      const updatedFiles = [...files, ...validFiles];
      if (updatedFiles.length > maxFiles) {
        fileErrors.push(`Maximum ${maxFiles} resumes can be uploaded at once. You selected ${updatedFiles.length}.`);
        const capped = updatedFiles.slice(0, maxFiles);
        setFiles(capped);
        onFilesSelect(capped);
      } else {
        setFiles(updatedFiles);
        onFilesSelect(updatedFiles);
      }
    }

    setErrors(fileErrors);
    // Auto-dismiss errors after 5s
    if (fileErrors.length > 0) {
      setTimeout(() => setErrors([]), 5000);
    }
  }, [files, multiple, maxSize, accept, onFilesSelect]);

  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  };
  const handleFileSelect = (e) => {
    if (e.target.files.length > 0) processFiles(e.target.files);
    e.target.value = '';
  };

  const removeFile = (fileId) => {
    const updatedFiles = files.filter(f => f.id !== fileId);
    setFiles(updatedFiles);
    onFilesRemove(updatedFiles);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (ext === 'docx' || ext === 'doc') return '📝';
    return '📎';
  };

  // Expose a way for parent to clear
  const clearFiles = () => { setFiles([]); setErrors([]); };

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Drop Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 group
          ${isDragOver
            ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.15)] scale-[1.01]'
            : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/30'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="space-y-4">
          <div className={`mx-auto size-16 rounded-2xl flex items-center justify-center border transition-colors ${
            isDragOver ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400 group-hover:border-slate-600 group-hover:text-slate-300'
          }`}>
            <Upload size={28} />
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-bold text-white tracking-tight">
              {isDragOver ? 'Drop your files here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">
              {accept === "*/*" ? "Any file type" : accept.replace(/\./g, '').toUpperCase()} • Max {(maxSize / (1024 * 1024)).toFixed(0)}MB
              {multiple ? ` • Up to ${maxFiles} files` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-2 animate-in fade-in duration-300">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          ))}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Selected ({files.length})
            </h4>
            <button onClick={(e) => { e.stopPropagation(); clearFiles(); onFilesRemove([]); }} className="text-[10px] font-bold text-slate-600 hover:text-red-400 uppercase tracking-wider transition-colors">
              Clear All
            </button>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-auto custom-scrollbar pr-1">
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors group/item">
                <div className="text-xl shrink-0">{getFileIcon(file.name)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-500 font-medium">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                  className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


/* ─── Main ResumeUpload Page ─── */
const ResumeUpload = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadType, setUploadType] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const acceptTypes = {
    all: ".pdf,.docx",
    pdf: ".pdf",
    docx: ".docx",
  };

  const handleFilesSelect = (files) => {
    setSelectedFiles(files);
    setError('');
  };

  const handleFilesRemove = (files) => {
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError('');

    const results = [];
    const errors = [];

    for (const fileObj of selectedFiles) {
      try {
        const response = await uploadAPI.uploadResume(fileObj.file);
        results.push(response.data);
      } catch (err) {
        errors.push(`${fileObj.name}: ${err.response?.data?.detail || 'Upload failed'}`);
      }
    }

    setUploading(false);

    if (errors.length > 0) {
      setError(errors.join('; '));
    }

    if (results.length > 0) {
      setUploadResult({
        count: results.length,
        files: results,
      });
      setSelectedFiles([]);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-50 overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-auto custom-scrollbar relative">
        <div className="flex items-center justify-center min-h-screen p-6 lg:p-12">
          <div className="w-full max-w-2xl">

            {/* Card */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-10 lg:p-14 shadow-2xl relative overflow-hidden">

              {/* Decorative glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

              {!uploadResult ? (
                <>
                  {/* Header */}
                  <div className="mb-10">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="size-14 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                        <Upload size={28} className="text-blue-400" />
                      </div>
                      <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Upload Resumes</h1>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">Upload candidate resumes for AI-powered analysis</p>
                      </div>
                    </div>
                  </div>

                  {/* File Type Control */}
                  <div className="mb-8">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3 block">File Type Filter</label>
                    <div className="flex gap-2">
                      {[
                        { key: 'all', label: 'All Supported' },
                        { key: 'pdf', label: 'PDF Only' },
                        { key: 'docx', label: 'DOCX Only' },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => setUploadType(opt.key)}
                          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                            uploadType === opt.key
                              ? 'bg-blue-600/10 text-blue-400 border-blue-500/30 shadow-[0_0_15px_-5px_rgba(59,130,246,0.2)]'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* FileUpload Component */}
                  <FileUpload
                    accept={acceptTypes[uploadType]}
                    multiple={true}
                    maxSize={10 * 1024 * 1024}
                    maxFiles={150}
                    onFilesSelect={handleFilesSelect}
                    onFilesRemove={handleFilesRemove}
                  />

                  {/* Upload Limit Note */}
                  <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                    <span className="text-amber-500">📌</span>
                    <span>Note: Maximum resumes to be uploaded are <strong className="text-slate-400">150</strong> per batch.</span>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="mt-6 flex items-center gap-3 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold animate-in fade-in duration-300">
                      <AlertCircle size={20} className="shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Upload Button */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-8 flex gap-4">
                      <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-8 rounded-2xl transition-all shadow-2xl shadow-blue-500/20 active:scale-[0.98] disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-3"
                      >
                        {uploading ? (
                          <>
                            <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload size={20} />
                            Upload {selectedFiles.length} Resume{selectedFiles.length !== 1 ? 's' : ''}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Success Screen */
                <div className="flex flex-col items-center text-center py-8">
                  <div className="mx-auto size-24 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mb-8 border border-emerald-500/20">
                    <CheckCircle size={48} className="text-emerald-400" />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-3 tracking-tight">{uploadResult.count} Resume{uploadResult.count !== 1 ? 's' : ''} Uploaded!</h2>
                  <p className="text-slate-500 font-medium mb-8">Your resumes are being processed by our AI agents.</p>

                  <div className="w-full space-y-3 mb-8 max-w-md">
                    {uploadResult.files.slice(0, 5).map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                        <span className="text-sm font-bold text-slate-300 truncate mr-4">{result.filename}</span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shrink-0">{result.status}</span>
                      </div>
                    ))}
                    {uploadResult.count > 5 && (
                      <p className="text-xs text-slate-600 font-bold text-center">+ {uploadResult.count - 5} more files</p>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => { setUploadResult(null); setSelectedFiles([]); }}
                      className="px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-sm font-black text-slate-300 transition-all active:scale-95"
                    >
                      Upload More
                    </button>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-black text-white transition-all active:scale-95 shadow-xl shadow-blue-500/20"
                    >
                      Go to Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResumeUpload;
