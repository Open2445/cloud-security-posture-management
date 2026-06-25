import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UploadCloud, CheckCircle, AlertTriangle, FileJson, Info } from 'lucide-react';

const ConfigImport: React.FC = () => {
  const { token, user, apiUrl } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [importResult, setImportResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setMessage('');
      setImportResult(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setStatus('loading');
    setMessage('Parsing config package...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${apiUrl}/api/config/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setStatus('success');
        setMessage('AWS Config snapshot parsed successfully!');
        setImportResult(data);
      } else {
        const err = await res.json();
        setStatus('error');
        setMessage(err.detail || 'Failed to process config snapshot');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network transmission error');
    }
  };

  // Pre-configured mock JSON snapshot for user testing
  const downloadSampleTemplate = () => {
    const sampleSnapshot = {
      "configurationItems": [
        {
          "resourceType": "AWS::S3::Bucket",
          "resourceId": "arn:aws:s3:::imported-sensitive-data-99",
          "resourceName": "imported-sensitive-data-99",
          "awsRegion": "us-west-1",
          "configuration": {
            "public_policy": true,
            "acl_public": true,
            "sensitive_data": true
          }
        },
        {
          "resourceType": "AWS::EC2::Instance",
          "resourceId": "arn:aws:ec2:us-east-1:123456789012:instance/i-imported-web-portal",
          "resourceName": "Imported-Web-Portal",
          "awsRegion": "us-east-1",
          "configuration": {
            "public_ip": "54.80.12.99",
            "ebs_encrypted": false
          }
        }
      ]
    };

    const blob = new Blob([JSON.stringify(sampleSnapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aws-config-snapshot-sample.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">AWS Config Snapshot Importer</h2>
          <p className="page-subtitle">Upload and parse AWS configuration snapshots, mapping vulnerabilities dynamically</p>
        </div>
      </div>

      <div className="dashboard-grid">
        
        {/* Importer Form */}
        <div className="glass-panel col-7" style={{ padding: '2rem' }}>
          <form onSubmit={handleUpload}>
            <div style={{
              border: '2px dashed var(--border-color)',
              borderRadius: '12px',
              padding: '3rem 2rem',
              textAlign: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
              cursor: 'pointer',
              position: 'relative',
              marginBottom: '1.5rem',
              transition: 'var(--transition-smooth)'
            }}
            onDragOver={(e) => e.preventDefault()}
            >
              <input 
                type="file" 
                accept=".json"
                onChange={handleFileChange}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <UploadCloud size={40} style={{ color: 'var(--accent-color)', marginBottom: '1rem' }} />
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                {file ? file.name : 'Select AWS Config JSON snapshot file'}
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Drag and drop or click here to browse files. Only JSON supported.
              </p>
            </div>

            {user.role === 'viewer' ? (
              <div style={{
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '8px',
                padding: '0.75rem',
                color: '#ffd073',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Info size={16} />
                <span>You possess viewer role access. Importing files requires analyst/admin permissions.</span>
              </div>
            ) : (
              <button
                type="submit"
                disabled={!file || status === 'loading'}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem' }}
              >
                {status === 'loading' ? 'Importing snapshot...' : 'Begin Configuration Import'}
              </button>
            )}
          </form>

          {/* Status Display */}
          {status !== 'idle' && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: status === 'success' ? 'rgba(16, 185, 129, 0.05)' : status === 'error' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${status === 'success' ? 'rgba(16, 185, 129, 0.15)' : status === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'var(--border-color)'}`,
              color: status === 'success' ? '#86efac' : status === 'error' ? '#fca5a5' : 'var(--text-secondary)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {status === 'success' && <CheckCircle size={16} />}
              {status === 'error' && <AlertTriangle size={16} />}
              <span>{message}</span>
            </div>
          )}

          {/* Import metrics */}
          {importResult && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1.25rem',
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px'
            }}>
              <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                Import Summary metrics
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Assets Imported:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginLeft: '0.5rem' }}>{importResult.assets_imported}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Relationships Mapped:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginLeft: '0.5rem' }}>{importResult.relationships_imported}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>New Findings Count:</span>
                  <span style={{ fontWeight: 700, color: 'var(--severity-critical)', marginLeft: '0.5rem' }}>{importResult.new_findings_count}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Updated posture Score:</span>
                  <span style={{ fontWeight: 700, color: 'var(--status-resolved)', marginLeft: '0.5rem' }}>{importResult.new_security_score}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Informative Side panel */}
        <div className="glass-panel col-5" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileJson size={16} style={{ color: 'var(--accent-color)' }} />
              Importer Guidelines
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '1rem' }}>
              Aether CSPM supports importing standardized JSON outputs exported from <b>AWS Config</b> recorders.
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '1rem' }}>
              Our parser isolates configurations and relations inside the JSON object to automatically discover public-facing resources, check EBS volume encryption tags, check IAM users MFA properties, and construct attack path graphs.
            </p>
          </div>

          <div style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1.5rem',
            marginTop: '1.5rem'
          }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>Test Importer features</h4>
            <button 
              type="button" 
              onClick={downloadSampleTemplate} 
              className="btn btn-secondary" 
              style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem 0' }}
            >
              Download Sample AWS Config JSON
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ConfigImport;
