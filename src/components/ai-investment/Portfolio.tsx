import React, { useState, useEffect } from 'react';
import { getPortfolio, addPosition, updatePosition, getPortfolioSummary } from '../../api';

interface Position {
  id: number;
  symbol: string;
  market: string;
  entry_price: number;
  current_price?: number;
  quantity: number;
  notes?: string;
  status: 'open' | 'closed';
  pnl?: number;
  pnl_pct?: number;
  weight?: number;
}

interface Summary {
  total_invested?: number;
  total_current_value?: number;
  total_pnl?: number;
  total_return_pct?: number;
  allocation?: {
    us?: number;
    china?: number;
    crypto?: number;
    cash?: number;
  };
  open_positions?: number;
}

const MARKET_OPTIONS = ['US', 'China', 'Crypto'];

const MARKET_COLORS: Record<string, string> = {
  US: '#00C2FF',
  China: '#FFB300',
  Crypto: '#00D97A',
  Cash: '#7A8999',
};

// Simple SVG donut chart
function DonutChart({ allocation }: { allocation: Summary['allocation'] }) {
  if (!allocation) return null;

  const segments = [
    { label: 'US', value: allocation.us || 0, color: MARKET_COLORS.US },
    { label: 'China', value: allocation.china || 0, color: MARKET_COLORS.China },
    { label: 'Crypto', value: allocation.crypto || 0, color: MARKET_COLORS.Crypto },
    { label: 'Cash', value: allocation.cash || 0, color: MARKET_COLORS.Cash },
  ].filter(s => s.value > 0);

  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const r = 45;
  const innerR = 28;

  let cumAngle = -Math.PI / 2;

  function describeArc(startAngle: number, endAngle: number): string {
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(startAngle);
    const iy1 = cy + innerR * Math.sin(startAngle);
    const ix2 = cx + innerR * Math.cos(endAngle);
    const iy2 = cy + innerR * Math.sin(endAngle);
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${innerR},${innerR} 0 ${large},0 ${ix1},${iy1} Z`;
  }

  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const angle = (seg.value / total) * Math.PI * 2;
          const endAngle = cumAngle + angle;
          const path = describeArc(cumAngle, endAngle);
          cumAngle = endAngle;
          return <path key={i} d={path} fill={seg.color} opacity={0.9} />;
        })}
        <circle cx={cx} cy={cy} r={innerR - 2} fill="#090F18" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {segments.map(seg => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: seg.color, flexShrink: 0 }} />
            <span style={{ color: '#7A8999', fontSize: '11px', minWidth: '50px' }}>{seg.label}</span>
            <span style={{ color: '#E8EDF2', fontSize: '11px', fontWeight: '600' }}>{seg.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CloseModal({
  position,
  onClose,
  onConfirm,
}: {
  position: Position;
  onClose: () => void;
  onConfirm: (closePrice: number, notes: string) => void;
}) {
  const [closePrice, setClosePrice] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(6,11,18,0.85)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#090F18', border: '1px solid #1A2535', borderRadius: '12px',
        padding: '28px', width: '360px', maxWidth: '90vw',
      }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#E8EDF2', marginBottom: '20px', letterSpacing: '2px' }}>
          CLOSE POSITION — {position.symbol}
        </div>
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', color: '#7A8999', marginBottom: '4px' }}>CLOSE PRICE ($)</div>
          <input
            value={closePrice}
            onChange={e => setClosePrice(e.target.value)}
            type="number"
            step="0.01"
            placeholder="Exit price"
            style={{
              background: '#060B12', border: '1px solid #1A2535', borderRadius: '6px',
              padding: '8px 12px', color: '#E8EDF2', fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px', width: '100%', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', color: '#7A8999', marginBottom: '4px' }}>NOTES</div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Exit reason..."
            rows={3}
            style={{
              background: '#060B12', border: '1px solid #1A2535', borderRadius: '6px',
              padding: '8px 12px', color: '#E8EDF2', fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px', width: '100%', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid #1A2535', borderRadius: '6px',
              padding: '8px 16px', color: '#7A8999', fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px', cursor: 'pointer',
            }}
          >
            CANCEL
          </button>
          <button
            onClick={() => closePrice && onConfirm(parseFloat(closePrice), notes)}
            disabled={!closePrice}
            style={{
              background: '#FF3A55', border: 'none', borderRadius: '6px',
              padding: '8px 16px', color: '#fff', fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px', fontWeight: '700', cursor: 'pointer',
            }}
          >
            CLOSE POSITION
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Portfolio() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [closingPosition, setClosingPosition] = useState<Position | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [form, setForm] = useState({
    symbol: '',
    market: 'US',
    entry_price: '',
    quantity: '',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [posRes, sumRes] = await Promise.all([
        getPortfolio(),
        getPortfolioSummary(100000),
      ]);
      setPositions(Array.isArray(posRes.data) ? posRes.data : posRes.data?.positions || []);
      setSummary(sumRes.data || null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol || !form.entry_price || !form.quantity) return;
    setSubmitLoading(true);
    try {
      await addPosition({
        symbol: form.symbol.toUpperCase(),
        market: form.market,
        entry_price: parseFloat(form.entry_price),
        quantity: parseFloat(form.quantity),
        notes: form.notes,
      });
      setForm({ symbol: '', market: 'US', entry_price: '', quantity: '', notes: '' });
      setFormOpen(false);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to add position');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleClose = async (closePrice: number, notes: string) => {
    if (!closingPosition) return;
    try {
      await updatePosition(closingPosition.id, {
        status: 'closed',
        current_price: closePrice,
        notes,
      });
      setClosingPosition(null);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to close position');
    }
  };

  const inputStyle: React.CSSProperties = {
    background: '#060B12',
    border: '1px solid #1A2535',
    borderRadius: '6px',
    padding: '8px 12px',
    color: '#E8EDF2',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '12px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div>
      {/* Summary Row */}
      {summary && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {[
            { label: 'TOTAL INVESTED', value: summary.total_invested != null ? `$${summary.total_invested.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—', color: '#E8EDF2' },
            { label: 'CURRENT VALUE', value: summary.total_current_value != null ? `$${summary.total_current_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—', color: '#00C2FF' },
            { label: 'TOTAL P&L', value: summary.total_pnl != null ? `${summary.total_pnl >= 0 ? '+' : ''}$${summary.total_pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—', color: summary.total_pnl != null ? (summary.total_pnl >= 0 ? '#00D97A' : '#FF3A55') : '#E8EDF2' },
            { label: 'TOTAL RETURN', value: summary.total_return_pct != null ? `${summary.total_return_pct >= 0 ? '+' : ''}${summary.total_return_pct.toFixed(2)}%` : '—', color: summary.total_return_pct != null ? (summary.total_return_pct >= 0 ? '#00D97A' : '#FF3A55') : '#E8EDF2' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex: '1 1 160px', background: '#090F18', border: '1px solid #1A2535', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '10px', color: '#7A8999', letterSpacing: '1px', marginBottom: '6px' }}>{label}</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Allocation + Add button row */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '20px' }}>
        {summary?.allocation && (
          <div style={{ flex: '0 0 auto', background: '#090F18', border: '1px solid #1A2535', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '10px', color: '#7A8999', letterSpacing: '2px', marginBottom: '16px' }}>ALLOCATION</div>
            <DonutChart allocation={summary.allocation} />
          </div>
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
          <button
            onClick={() => setFormOpen(o => !o)}
            style={{
              background: formOpen ? '#1A2535' : '#00C2FF',
              color: formOpen ? '#7A8999' : '#060B12',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              letterSpacing: '1px',
              marginBottom: formOpen ? '16px' : '0',
            }}
          >
            {formOpen ? '✕ CANCEL' : '+ ADD POSITION'}
          </button>

          {formOpen && (
            <form onSubmit={handleAdd} style={{
              background: '#090F18',
              border: '1px solid #1A2535',
              borderRadius: '10px',
              padding: '20px',
              width: '100%',
              maxWidth: '600px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#7A8999', marginBottom: '4px' }}>SYMBOL</div>
                  <input style={inputStyle} value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} placeholder="AAPL" required />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#7A8999', marginBottom: '4px' }}>MARKET</div>
                  <select
                    style={{ ...inputStyle }}
                    value={form.market}
                    onChange={e => setForm(f => ({ ...f, market: e.target.value }))}
                  >
                    {MARKET_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#7A8999', marginBottom: '4px' }}>ENTRY PRICE</div>
                  <input style={inputStyle} value={form.entry_price} onChange={e => setForm(f => ({ ...f, entry_price: e.target.value }))} type="number" step="0.01" required />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#7A8999', marginBottom: '4px' }}>QUANTITY</div>
                  <input style={inputStyle} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} type="number" step="0.01" required />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '10px', color: '#7A8999', marginBottom: '4px' }}>NOTES</div>
                  <input style={inputStyle} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitLoading}
                style={{
                  background: '#00D97A',
                  color: '#060B12',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 24px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: submitLoading ? 'not-allowed' : 'pointer',
                  letterSpacing: '1px',
                }}
              >
                {submitLoading ? 'ADDING...' : 'ADD POSITION'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(255,58,85,0.1)', border: '1px solid #FF3A55', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
          <span style={{ color: '#FF3A55', fontSize: '12px' }}>⚠ {error}</span>
        </div>
      )}

      {/* Positions Table */}
      <div style={{ background: '#090F18', border: '1px solid #1A2535', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1A2535', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: '#7A8999', letterSpacing: '2px' }}>POSITIONS</span>
          <button onClick={fetchData} style={{ background: 'none', border: 'none', color: '#7A8999', cursor: 'pointer', fontSize: '12px' }}>↻ REFRESH</button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#7A8999', fontSize: '12px' }}>Loading portfolio...</div>
        ) : positions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#7A8999', fontSize: '12px' }}>No positions yet. Add your first position above.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1A2535' }}>
                  {['SYMBOL', 'MARKET', 'ENTRY', 'CURRENT', 'P&L', 'P&L%', 'QTY', 'WEIGHT', 'STATUS', 'ACTIONS'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', color: '#7A8999', fontSize: '10px', letterSpacing: '1px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map((pos, i) => {
                  const pnl = pos.pnl ?? (pos.current_price != null ? (pos.current_price - pos.entry_price) * pos.quantity : null);
                  const pnlPct = pos.pnl_pct ?? (pos.current_price != null ? ((pos.current_price - pos.entry_price) / pos.entry_price) * 100 : null);
                  const pnlColor = pnl == null ? '#E8EDF2' : pnl >= 0 ? '#00D97A' : '#FF3A55';

                  return (
                    <tr key={pos.id} style={{ borderBottom: '1px solid #1A2535', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding: '12px 16px', color: '#E8EDF2', fontWeight: '600' }}>{pos.symbol}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          background: `${MARKET_COLORS[pos.market] || '#7A8999'}20`,
                          border: `1px solid ${MARKET_COLORS[pos.market] || '#7A8999'}44`,
                          borderRadius: '20px',
                          padding: '2px 8px',
                          fontSize: '10px',
                          color: MARKET_COLORS[pos.market] || '#7A8999',
                          fontWeight: '600',
                        }}>{pos.market}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#E8EDF2' }}>${pos.entry_price?.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', color: '#00C2FF' }}>
                        {pos.current_price != null ? `$${pos.current_price.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: pnlColor, fontWeight: '600' }}>
                        {pnl != null ? `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: pnlColor }}>
                        {pnlPct != null ? `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#E8EDF2' }}>{pos.quantity}</td>
                      <td style={{ padding: '12px 16px', color: '#7A8999' }}>
                        {pos.weight != null ? `${pos.weight.toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          background: pos.status === 'open' ? 'rgba(0,194,255,0.1)' : 'rgba(122,137,153,0.15)',
                          border: `1px solid ${pos.status === 'open' ? '#00C2FF44' : '#1A2535'}`,
                          borderRadius: '20px',
                          padding: '2px 8px',
                          fontSize: '10px',
                          color: pos.status === 'open' ? '#00C2FF' : '#7A8999',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                        }}>{pos.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {pos.status === 'open' && (
                          <button
                            onClick={() => setClosingPosition(pos)}
                            style={{
                              background: 'rgba(255,58,85,0.1)',
                              border: '1px solid rgba(255,58,85,0.4)',
                              borderRadius: '4px',
                              padding: '4px 10px',
                              color: '#FF3A55',
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '10px',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            CLOSE
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {closingPosition && (
        <CloseModal
          position={closingPosition}
          onClose={() => setClosingPosition(null)}
          onConfirm={handleClose}
        />
      )}
    </div>
  );
}
