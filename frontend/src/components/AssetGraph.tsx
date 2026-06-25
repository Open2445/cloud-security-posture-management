import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Network, 
  Flame, 
  Server, 
  Database, 
  Lock, 
  KeyRound, 
  ShieldAlert, 
  ArrowRight,
  Maximize2
} from 'lucide-react';

const AssetGraph: React.FC = () => {
  const { token, apiUrl } = useAuth();
  const [graphData, setGraphData] = useState<any>(null);
  const [attackPaths, setAttackPaths] = useState<any[]>([]);
  const [graphView, setGraphView] = useState<'mesh' | 'path'>('path');
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // SVG dimensions for mesh layout
  const width = 800;
  const height = 450;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const graphRes = await fetch(`${apiUrl}/api/assets/graph/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (graphRes.ok) {
          const gData = await graphRes.json();
          
          // Generate deterministic coordinate layout for the nodes
          // Layout in vertical layers based on type to make it structured
          const layerMapping: Record<string, number> = {
            vpc: 1, security_group: 1.5,
            ec2: 2, lambda: 2,
            iam_role: 3, iam_policy: 3.5,
            s3: 4, rds: 4,
            cloudtrail: 2.5, guardduty: 2.5, security_hub: 2.5
          };

          const layeredNodes = gData.nodes.map((node: any, index: number) => {
            const layer = layerMapping[node.type] || 2.5;
            // Space vertically within layer
            const layerNodes = gData.nodes.filter((n: any) => (layerMapping[n.type] || 2.5) === layer);
            const nodeIndexInLayer = layerNodes.findIndex((n: any) => n.id === node.id);
            const verticalCount = layerNodes.length;
            
            const x = 80 + layer * 150;
            const y = height / 2 + (nodeIndexInLayer - (verticalCount - 1) / 2) * 55;
            
            return { ...node, x, y };
          });

          setGraphData({ nodes: layeredNodes, edges: gData.edges });
        }

        const pathRes = await fetch(`${apiUrl}/api/attack-paths`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (pathRes.ok) {
          const pData = await pathRes.json();
          setAttackPaths(pData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [apiUrl, token]);

  if (loading || !graphData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem', color: 'var(--text-secondary)' }}>
        Mapping cloud assets relationships...
      </div>
    );
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'ec2':
      case 'lambda':
        return <Server size={14} />;
      case 's3':
      case 'rds':
        return <Database size={14} />;
      case 'iam_role':
      case 'iam_policy':
      case 'iam_user':
        return <KeyRound size={14} />;
      case 'vpc':
      case 'security_group':
        return <Network size={14} />;
      default:
        return <Lock size={14} />;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Asset Relationship Graph</h2>
          <p className="page-subtitle">Interactive visual topology of resource dependencies, VPC containers, and privilege attack vectors</p>
        </div>

        {/* View Switcher Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px' }}>
          <button 
            onClick={() => setGraphView('path')} 
            className="btn" 
            style={{ 
              padding: '0.4rem 1rem', 
              fontSize: '0.8rem', 
              background: graphView === 'path' ? 'var(--accent-gradient)' : 'transparent',
              color: 'white',
              border: 'none'
            }}
          >
            <Flame size={14} />
            Attack Path Analyzer
          </button>
          <button 
            onClick={() => setGraphView('mesh')} 
            className="btn" 
            style={{ 
              padding: '0.4rem 1rem', 
              fontSize: '0.8rem', 
              background: graphView === 'mesh' ? 'var(--accent-gradient)' : 'transparent',
              color: 'white',
              border: 'none'
            }}
          >
            <Network size={14} />
            Mesh Topology
          </button>
        </div>
      </div>

      {graphView === 'mesh' ? (
        /* Mesh Topology View */
        <div className="dashboard-grid">
          <div className="glass-panel col-9" style={{ padding: '1rem', position: 'relative', overflow: 'hidden', height: '480px' }}>
            <svg width="100%" height="100%" style={{ background: '#090c15', borderRadius: '8px' }} viewBox={`0 0 ${width} ${height}`}>
              
              {/* Relationship lines */}
              {graphData.edges.map((edge: any) => {
                const sourceNode = graphData.nodes.find((n: any) => n.id === edge.source);
                const targetNode = graphData.nodes.find((n: any) => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;
                
                const isAttackEdge = sourceNode.in_attack_path && targetNode.in_attack_path;
                return (
                  <line
                    key={edge.id}
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke={isAttackEdge ? 'var(--severity-critical)' : 'rgba(255,255,255,0.06)'}
                    strokeWidth={isAttackEdge ? 2 : 1}
                    strokeDasharray={isAttackEdge ? '4 2' : 'none'}
                    style={{
                      animation: isAttackEdge ? 'dash 15s linear infinite' : 'none'
                    }}
                  />
                );
              })}

              {/* Node items */}
              {graphData.nodes.map((node: any) => {
                let borderStroke = 'rgba(255, 255, 255, 0.2)';
                let glowColor = 'transparent';
                if (node.has_findings) borderStroke = 'var(--status-open)';
                if (node.has_critical_findings) {
                  borderStroke = 'var(--severity-critical)';
                  glowColor = 'rgba(239, 68, 68, 0.4)';
                }
                if (node.in_attack_path) {
                  borderStroke = 'var(--severity-critical)';
                  glowColor = 'rgba(239, 68, 68, 0.6)';
                }

                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${node.x}, ${node.y})`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedNode(node)}
                  >
                    {/* Glowing effect circle */}
                    {glowColor !== 'transparent' && (
                      <circle r="18" fill="none" stroke={glowColor} strokeWidth="4" style={{ opacity: 0.5 }} className="glow-pulsing" />
                    )}
                    <circle r="14" fill="var(--bg-tertiary)" stroke={borderStroke} strokeWidth="1.5" />
                    
                    {/* Tiny representation icon */}
                    <foreignObject x="-7" y="-7" width="14" height="14">
                      <div style={{ color: node.in_attack_path ? 'var(--severity-critical)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {getNodeIcon(node.type)}
                      </div>
                    </foreignObject>

                    {/* Node Text Label (visible on hover/inspect) */}
                    <text
                      y="26"
                      textAnchor="middle"
                      fill="var(--text-secondary)"
                      fontSize="7"
                      fontFamily="var(--font-mono)"
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.name.length > 12 ? `${node.name.substring(0, 10)}...` : node.name}
                    </text>
                  </g>
                );
              })}

            </svg>
          </div>

          {/* Side panel to show inspected node */}
          <div className="glass-panel col-3" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {selectedNode ? (
              <div>
                <span className="badge badge-medium" style={{ fontSize: '0.65rem' }}>
                  {selectedNode.type.toUpperCase()}
                </span>
                <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                  {selectedNode.name}
                </h4>
                
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', marginTop: '0.5rem' }}>
                  {selectedNode.id}
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedNode.in_attack_path && (
                    <div style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '6px',
                      padding: '0.5rem 0.75rem',
                      color: '#ff8a8a',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      In Attack Pathway!
                    </div>
                  )}

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <b>Region:</b> {selectedNode.region}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <b>Internet Exposed:</b> {selectedNode.is_public ? 'Yes' : 'No'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <b>Misconfigurations:</b> {selectedNode.has_findings ? 'Detected' : 'None'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>
                <Maximize2 size={24} style={{ marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.8rem' }}>Click any node on the topology grid to inspect config relationships.</p>
              </div>
            )}
            
            {/* Info Legend */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Legend</div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--severity-critical)' }} />
                <span>Critical Risk / Attack Node</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-open)' }} />
                <span>Open Security Finding</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Attack Paths Diagram View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {attackPaths.map((path) => (
            <div key={path.id} className="glass-panel glowing-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>
                    {path.risk_level.toUpperCase()} PATH
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, marginTop: '0.25rem' }}>
                    {path.name}
                  </h3>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {path.nodes.filter((n: string) => n !== 'Internet').length} Steps
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '2rem' }}>
                {path.description}
              </p>

              {/* Horizontal nodes flow map */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                backgroundColor: 'rgba(9, 13, 22, 0.4)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                {path.nodes.map((node: string, index: number) => {
                  const isInternet = node === 'Internet';
                  const label = isInternet ? 'Internet' : node.split(':').pop()?.split('/').pop() || node;
                  return (
                    <React.Fragment key={node}>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1rem',
                        backgroundColor: isInternet ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-tertiary)',
                        border: `1px solid ${isInternet ? 'var(--accent-color)' : 'var(--severity-critical)'}`,
                        borderRadius: '8px',
                        boxShadow: `0 0 10px ${isInternet ? 'rgba(99, 102, 241, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                        minWidth: '100px'
                      }}>
                        <div style={{ color: isInternet ? 'var(--accent-color)' : 'var(--severity-critical)' }}>
                          {isInternet ? <Globe size={18} /> : <ShieldAlert size={18} />}
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                          {label}
                        </span>
                      </div>

                      {index < path.nodes.length - 1 && (
                        <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                          <ArrowRight size={20} className="glow-pulsing" style={{ color: 'var(--severity-critical)' }} />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}

          {attackPaths.length === 0 && (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              No critical attack paths found. Keep scanning!
            </div>
          )}
        </div>
      )}
      
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -100;
          }
        }
      `}</style>
    </div>
  );
};

export default AssetGraph;
