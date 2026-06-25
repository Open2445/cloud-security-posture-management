import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, Server, Eye, X, Globe, FileCode } from 'lucide-react';

const AssetInventory: React.FC = () => {
  const { token, apiUrl } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/assets`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAssets(data);
          setFilteredAssets(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, [apiUrl, token]);

  useEffect(() => {
    let result = assets;

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(a => 
        a.id.toLowerCase().includes(lower) || 
        a.name.toLowerCase().includes(lower)
      );
    }

    if (typeFilter) {
      result = result.filter(a => a.type === typeFilter);
    }

    if (regionFilter) {
      result = result.filter(a => a.region === regionFilter);
    }

    setFilteredAssets(result);
  }, [search, typeFilter, regionFilter, assets]);

  // Unique types and regions for filters
  const assetTypes = Array.from(new Set(assets.map(a => a.type)));
  const assetRegions = Array.from(new Set(assets.map(a => a.region)));

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem', color: 'var(--text-secondary)' }}>
        Interrogating inventory database...
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Discovered Asset Inventory</h2>
          <p className="page-subtitle">Unified registry of active resources compiled by the discovery engine</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel" style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        padding: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search by Resource ID or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '180px' }}>
          <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)} 
            className="form-input"
            style={{ padding: '0.5rem' }}
          >
            <option value="">All Resource Types</option>
            {assetTypes.map(t => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Region Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '180px' }}>
          <Globe size={14} style={{ color: 'var(--text-secondary)' }} />
          <select 
            value={regionFilter} 
            onChange={(e) => setRegionFilter(e.target.value)} 
            className="form-input"
            style={{ padding: '0.5rem' }}
          >
            <option value="">All Regions</option>
            {assetRegions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Count Indicator */}
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          {filteredAssets.length} of {assets.length} Resources
        </div>

      </div>

      {/* Asset Grid Table */}
      <div className="glass-panel" style={{ padding: '0' }}>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Resource Name</th>
                <th>Type</th>
                <th>Region</th>
                <th>Resource ARN / ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => (
                <tr key={asset.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{asset.name}</div>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--accent-color)'
                    }}>
                      <Server size={12} />
                      {asset.type.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{asset.region}</span>
                  </td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      display: 'block',
                      maxWidth: '320px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }} title={asset.id}>
                      {asset.id}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedAsset(asset)}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                    >
                      <Eye size={12} />
                      Inspect Config
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No matching cloud resources discovered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configuration Inspector Sidebar Drawer */}
      {selectedAsset && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '500px',
          height: '100vh',
          backgroundColor: '#0c101b',
          borderLeft: '1px solid var(--border-color)',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem',
          transition: 'var(--transition-smooth)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>
              Resource Inspector
            </h3>
            <button 
              onClick={() => setSelectedAsset(null)} 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Name</label>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedAsset.name}</div>
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>ARN / Identifier</label>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {selectedAsset.id}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Type</label>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-color)' }}>{selectedAsset.type.toUpperCase()}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Region</label>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{selectedAsset.region}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                <FileCode size={14} style={{ color: 'var(--accent-secondary)' }} />
                <span>Configuration State</span>
              </div>
              <pre className="code-block" style={{ flex: 1, maxHeight: '350px', overflowY: 'auto' }}>
                {JSON.stringify(selectedAsset.configuration, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetInventory;
