import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, Search, Filter, AlertTriangle, ShieldCheck, Globe, Server } from 'lucide-react';

const Timeline: React.FC = () => {
  const { token, apiUrl } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/events`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
          setFilteredEvents(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [apiUrl, token]);

  useEffect(() => {
    let result = events;

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(e => 
        e.event_name.toLowerCase().includes(lower) || 
        e.resource_id.toLowerCase().includes(lower) ||
        (e.details && e.details.toLowerCase().includes(lower))
      );
    }

    if (regionFilter) {
      result = result.filter(e => e.region === regionFilter);
    }

    if (severityFilter) {
      result = result.filter(e => e.severity === severityFilter);
    }

    if (serviceFilter) {
      result = result.filter(e => e.service === serviceFilter);
    }

    setFilteredEvents(result);
  }, [search, regionFilter, severityFilter, serviceFilter, events]);

  // Unique regions, severities, services
  const regions = Array.from(new Set(events.map(e => e.region)));
  const severities = Array.from(new Set(events.map(e => e.severity)));
  const services = Array.from(new Set(events.map(e => e.service)));

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem', color: 'var(--text-secondary)' }}>
        Parsing audit trail events...
      </div>
    );
  }

  const severityColors: Record<string, string> = {
    critical: 'var(--severity-critical)',
    high: 'var(--severity-high)',
    medium: 'var(--severity-medium)',
    low: 'var(--severity-low)'
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Security Event Timeline</h2>
          <p className="page-subtitle">Chronological ledger of security changes, discovery triggers, and compliance modifications</p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="glass-panel" style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        padding: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search by event or resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Region */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Globe size={14} style={{ color: 'var(--text-secondary)' }} />
          <select 
            value={regionFilter} 
            onChange={(e) => setRegionFilter(e.target.value)} 
            className="form-input"
            style={{ padding: '0.5rem' }}
          >
            <option value="">All Regions</option>
            {regions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Severity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertTriangle size={14} style={{ color: 'var(--text-secondary)' }} />
          <select 
            value={severityFilter} 
            onChange={(e) => setSeverityFilter(e.target.value)} 
            className="form-input"
            style={{ padding: '0.5rem' }}
          >
            <option value="">All Severities</option>
            {severities.map(s => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Service */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Server size={14} style={{ color: 'var(--text-secondary)' }} />
          <select 
            value={serviceFilter} 
            onChange={(e) => setServiceFilter(e.target.value)} 
            className="form-input"
            style={{ padding: '0.5rem' }}
          >
            <option value="">All Services</option>
            {services.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Chronological List */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{
          position: 'relative',
          paddingLeft: '2.5rem'
        }}>
          {/* Vertical axis line */}
          <div style={{
            position: 'absolute',
            left: '7px',
            top: '8px',
            bottom: '8px',
            width: '2px',
            backgroundColor: 'var(--border-color)',
            zIndex: 1
          }} />

          {filteredEvents.map((e, index) => (
            <div key={e.id} style={{
              position: 'relative',
              marginBottom: '2rem',
              zIndex: 2
            }}>
              {/* Chronological circle node */}
              <div style={{
                position: 'absolute',
                left: '-32px',
                top: '5px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: severityColors[e.severity] || 'var(--text-muted)',
                border: '4px solid var(--bg-secondary)',
                boxShadow: `0 0 10px ${severityColors[e.severity] || 'transparent'}`
              }} />

              {/* Event card content */}
              <div style={{
                padding: '1.25rem',
                backgroundColor: 'rgba(255, 255, 255, 0.015)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {e.event_name}
                  </div>
                  <div style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '0.75rem', 
                    color: 'var(--text-muted)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.35rem' 
                  }}>
                    <Clock size={12} />
                    {new Date(e.timestamp).toLocaleString()}
                  </div>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                  {e.details}
                </p>

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.75rem',
                  borderTop: '1px solid rgba(255,255,255,0.03)',
                  paddingTop: '0.5rem'
                }}>
                  <span><b>Service:</b> {e.service}</span>
                  <span>|</span>
                  <span><b>Region:</b> {e.region}</span>
                  <span>|</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}><b>Resource:</b> {e.resource_id}</span>
                </div>
              </div>
            </div>
          ))}

          {filteredEvents.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              No audit trail events match the current criteria filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
