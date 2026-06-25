import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Filter, 
  Server, 
  Eye, 
  X, 
  Globe, 
  FileCode, 
  ShieldAlert, 
  GitMerge, 
  Award, 
  Clock 
} from 'lucide-react';

interface AssetInventoryProps {
  initialSearch?: string;
  clearInitialSearch?: () => void;
}

const AssetInventory: React.FC<AssetInventoryProps> = ({ initialSearch, clearInitialSearch }) => {
  const { token, apiUrl } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  
  // Selected Asset detail tabs state
  const [activeDetailTab, setActiveDetailTab] = useState<'meta' | 'findings' | 'relations' | 'compliance' | 'timeline'>('meta');
  const [assetFindings, setAssetFindings] = useState<any[]>([]);
  const [assetRelations, setAssetRelations] = useState<any[]>([]);
  const [assetEvents, setAssetEvents] = useState<any[]>([]);

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

          // If there is an initialSearch redirect, trigger it
          if (initialSearch) {
            setSearch(initialSearch);
            // If it's a specific asset ID, select it
            const matched = data.find((a: any) => a.id.toLowerCase() === initialSearch.toLowerCase());
            if (matched) {
              setSelectedAsset(matched);
            }
            if (clearInitialSearch) clearInitialSearch();
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, [apiUrl, token, initialSearch]);

  useEffect(() => {
    let result = assets;

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(a => 
        a.id.toLowerCase().includes(lower) || 
        a.name.toLowerCase().includes(lower) ||
        a.region.toLowerCase().includes(lower)
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

  // Fetch asset details when selected
  useEffect(() => {
    if (!selectedAsset) return;
    const fetchAssetDetails = async () => {
      try {
        // Fetch findings
        const findingsRes = await fetch(`${apiUrl}/api/findings?asset_id=${selectedAsset.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (findingsRes.ok) {
          const fData = await findingsRes.json();
          setAssetFindings(fData.filter((f: any) => f.asset_id === selectedAsset.id));
        }

        // Fetch relations
        const relsRes = await fetch(`${apiUrl}/api/assets/${selectedAsset.id}/relationships`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (relsRes.ok) {
          setAssetRelations(await relsRes.json());
        }

        // Fetch events
        const eventsRes = await fetch(`${apiUrl}/api/events?resource_id=${selectedAsset.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (eventsRes.ok) {
          setAssetEvents(await eventsRes.json());
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchAssetDetails();
    setActiveDetailTab('meta');
  }, [selectedAsset, apiUrl, token]);

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

      {/* Resource Detail Page Drawer overlay */}
      {selectedAsset && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '650px',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <span className="badge badge-medium" style={{ fontSize: '0.65rem' }}>
                {selectedAsset.type.toUpperCase()}
              </span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>
                {selectedAsset.name}
              </h3>
            </div>
            <button 
              onClick={() => setSelectedAsset(null)} 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Detailed Resource Sub-Tabs Bar */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '1.5rem',
            gap: '1rem',
            overflowX: 'auto',
            paddingBottom: '0.25rem'
          }}>
            {[
              { id: 'meta', label: 'Overview & Code', icon: FileCode },
              { id: 'findings', label: `Findings (${assetFindings.length})`, icon: ShieldAlert },
              { id: 'relations', label: 'Dependencies', icon: GitMerge },
              { id: 'compliance', label: 'Compliance', icon: Award },
              { id: 'timeline', label: 'Timeline', icon: Clock }
            ].map(tab => {
              const Icon = tab.icon;
              const isTabActive = activeDetailTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'none',
                    border: 'none',
                    color: isTabActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                    borderBottom: isTabActive ? '2px solid var(--accent-color)' : '2px solid transparent',
                    padding: '0.5rem 0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: isTabActive ? 600 : 500,
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Drawer tab content */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeDetailTab === 'meta' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>ARN / Identity String</label>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {selectedAsset.id}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Region</label>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedAsset.region}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Status</label>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--status-resolved)' }}>Active Discovery</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Configuration snapshot</label>
                  <pre className="code-block" style={{ maxHeight: '300px' }}>
                    {JSON.stringify(selectedAsset.configuration, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {activeDetailTab === 'findings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {assetFindings.map(f => (
                  <div key={f.id} style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{f.title}</h4>
                      <span className={`badge badge-${f.severity}`}>{f.severity}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>{f.description}</p>
                    {f.remediation_cli && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>CLI Remediation Command</div>
                        <pre className="code-block" style={{ fontSize: '0.7rem' }}>{f.remediation_cli}</pre>
                      </div>
                    )}
                  </div>
                ))}
                {assetFindings.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No open vulnerabilities detected for this asset.</div>
                )}
              </div>
            )}

            {activeDetailTab === 'relations' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>Connection Network Mesh</h4>
                {assetRelations.map((r: any) => {
                  const isSource = r.source_id === selectedAsset.id;
                  const partnerNode = isSource ? r.target_id : r.source_id;
                  return (
                    <div key={r.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      backgroundColor: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                          {isSource ? 'Outbound relation' : 'Inbound relation'}
                        </span>
                        <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', marginTop: '0.15rem' }}>
                          {partnerNode}
                        </div>
                      </div>
                      <span className="badge badge-medium" style={{ fontSize: '0.6rem' }}>{r.relationship_type}</span>
                    </div>
                  );
                })}
                {assetRelations.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No active connection edges detected.</div>
                )}
              </div>
            )}

            {activeDetailTab === 'compliance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>Regulatory Controls Mappings</h4>
                {assetFindings.map(f => (
                  <div key={f.id} style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px'
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{f.title}</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                      {Object.entries(f.compliance_mappings).map(([fw, rules]: any) => (
                        <span key={fw} className="badge badge-low" style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}>
                          {fw.toUpperCase()}: {rules.join(', ')}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {assetFindings.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Resource aligns with all active CIS / NIST / MITRE standards.</div>
                )}
              </div>
            )}

            {activeDetailTab === 'timeline' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>Historical Security Events</h4>
                {assetEvents.map(e => (
                  <div key={e.id} style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 600 }}>{e.event_name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{new Date(e.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{e.details}</p>
                  </div>
                ))}
                {assetEvents.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No historical events recorded for this resource.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetInventory;
