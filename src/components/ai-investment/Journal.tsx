import React, { useState, useEffect } from 'react';
import { getJournal } from '../../api';

interface Trade {
  id?: number;
  symbol: string;
  market: string;
  entry_price: number;
  exit_price?: number;
  pnl?: number;
  pnl_pct?: number;
  verdict?: string;
  date?: string;
  closed_date?: string;
  outcome?: string;
  notes?: string;
  quantity?: number;
}

interface JournalData {
  trades?: Trade[];
  performance?: {
    win_rate?: number;
    avg_rr?: number;
    profit_factor?: number;
    total_trades?: number;
    best_trade?: number;
    worst_trade?: number;
    avg_win?: number;
    avg_loss?: number;
  };
  equity_curve?: number[];
}

function StatCard({ label, value, color, subtext }: { label: string; value?: string | number; color?: string; subtext?: string }) {
  return (
    <div style={{
      background: '#090F18',
      border: '1px solid #1A2535',
      borderRadius: '10px',
      padding: '16px',
      flex: '1 1 150px',
    }}>
      <div style={{ fontSize: '10px', color: '#7A8999', letterSpacing: '1px', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: '700', color: color || '#E8EDF2' }}>
        {value != null ? value : '—'}
      </div>
      {subtext && <div style={{ fontSize: '10px', color: '#7A8999', marginTop: '4px' }}>{subtext}</div>}
    </div>
  );
}

function EquityCurve({ data }: { data?: number[] }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#7A8999', fontSize: '12px' }}>
        Not enough data to draw equity curve
      </div>
    );
  }

  const width = 800;
  const height = 200;
  const padLeft = 64;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 32;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const points = data.map((v, i) => {
    const x = padLeft + (i / (data.length - 1)) * plotW;
    const y = padTop + plotH - ((v - minVal) / range) * plotH;
    return { x, y, v };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');

  // Area fill path
  const areaPath = `M${padLeft},${padTop + plotH} ` +
    points.map(p => `L${p.x},${p.y}`).join(' ') +
    ` L${points[points.length - 1].x},${padTop + plotH} Z`;

  // Y-axis ticks
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => ({
    y: padTop + plotH - (i / ticks) * plotH,
    v: minVal + (i / ticks) * range,
  }));

  const startColor = data[data.length - 1] >= data[0] ? '#00D97A' : '#FF3A55';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height: 'auto', maxHeight: '200px' }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={startColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={startColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={padLeft} y1={t.y} x2={width - padRight} y2={t.y} stroke="#1A2535" strokeWidth="1" />
          <text x={padLeft - 6} y={t.y + 4} textAnchor="end" fill="#7A8999" fontSize="9" fontFamily="'IBM Plex Mono', monospace">
            {t.v.toFixed(0)}
          </text>
        </g>
      ))}

      {/* X axis */}
      <line x1={padLeft} y1={padTop + plotH} x2={width - padRight} y2={padTop + plotH} stroke="#1A2535" strokeWidth="1" />

      {/* Area fill */}
      <path d={areaPath} fill="url(#equityGrad)" />

      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={startColor}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Last point dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="4"
        fill={startColor}
      />
    </svg>
  );
}

function getOutcomeStyle(outcome?: string, pnl?: number): { color: string; bg: string; label: string } {
  const o = (outcome || '').toLowerCase();
  if (o === 'win' || (pnl != null && pnl > 0)) return { color: '#00D97A', bg: 'rgba(0,217,122,0.1)', label: 'WIN' };
  if (o === 'loss' || (pnl != null && pnl < 0)) return { color: '#FF3A55', bg: 'rgba(255,58,85,0.1)', label: 'LOSS' };
  if (o === 'breakeven') return { color: '#7A8999', bg: 'rgba(122,137,153,0.1)', label: 'EVEN' };
  return { color: '#FFB300', bg: 'rgba(255,179,0,0.1)', label: outcome?.toUpperCase() || 'OPEN' };
}

const MARKET_COLORS: Record<string, string> = {
  US: '#00C2FF',
  China: '#FFB300',
  Crypto: '#00D97A',
};

export default function Journal() {
  const [journalData, setJournalData] = useState<JournalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getJournal();
      setJournalData(res.data || null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load journal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const perf = journalData?.performance;
  const trades = journalData?.trades || [];
  const equity = journalData?.equity_curve;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '10px', color: '#7A8999', letterSpacing: '2px' }}>TRADE JOURNAL & PERFORMANCE</div>
        <button
          onClick={fetchData}
          style={{ background: 'none', border: '1px solid #1A2535', borderRadius: '6px', padding: '6px 14px', color: '#7A8999', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', cursor: 'pointer' }}
        >
          ↻ REFRESH
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(255,58,85,0.1)', border: '1px solid #FF3A55', borderRadius: '8px', padding: '10px 14px' }}>
          <span style={{ color: '#FF3A55', fontSize: '12px' }}>⚠ {error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#7A8999', fontSize: '12px' }}>Loading journal...</div>
      ) : !journalData ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#7A8999', fontSize: '12px' }}>
          No journal data available yet. Close some positions to populate the journal.
        </div>
      ) : (
        <>
          {/* Performance Stats */}
          {perf && (
            <div>
              <div style={{ fontSize: '10px', color: '#7A8999', letterSpacing: '2px', marginBottom: '12px' }}>PERFORMANCE STATISTICS</div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <StatCard
                  label="WIN RATE"
                  value={perf.win_rate != null ? `${perf.win_rate.toFixed(1)}%` : undefined}
                  color={perf.win_rate != null ? (perf.win_rate >= 55 ? '#00D97A' : perf.win_rate >= 45 ? '#FFB300' : '#FF3A55') : undefined}
                />
                <StatCard
                  label="AVG R:R"
                  value={perf.avg_rr != null ? `${perf.avg_rr.toFixed(2)}:1` : undefined}
                  color={perf.avg_rr != null ? (perf.avg_rr >= 2 ? '#00D97A' : perf.avg_rr >= 1.5 ? '#FFB300' : '#FF3A55') : undefined}
                />
                <StatCard
                  label="PROFIT FACTOR"
                  value={perf.profit_factor != null ? perf.profit_factor.toFixed(2) : undefined}
                  color={perf.profit_factor != null ? (perf.profit_factor >= 2 ? '#00D97A' : perf.profit_factor >= 1 ? '#FFB300' : '#FF3A55') : undefined}
                  subtext="gross profit / gross loss"
                />
                <StatCard
                  label="TOTAL TRADES"
                  value={perf.total_trades}
                  color="#00C2FF"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <StatCard
                  label="BEST TRADE"
                  value={perf.best_trade != null ? `+$${perf.best_trade.toFixed(2)}` : undefined}
                  color="#00D97A"
                />
                <StatCard
                  label="WORST TRADE"
                  value={perf.worst_trade != null ? `-$${Math.abs(perf.worst_trade).toFixed(2)}` : undefined}
                  color="#FF3A55"
                />
                {perf.avg_win != null && (
                  <StatCard
                    label="AVG WIN"
                    value={`+$${perf.avg_win.toFixed(2)}`}
                    color="#00D97A"
                  />
                )}
                {perf.avg_loss != null && (
                  <StatCard
                    label="AVG LOSS"
                    value={`-$${Math.abs(perf.avg_loss).toFixed(2)}`}
                    color="#FF3A55"
                  />
                )}
              </div>
            </div>
          )}

          {/* Equity Curve */}
          {equity && equity.length > 1 && (
            <div style={{ background: '#090F18', border: '1px solid #1A2535', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '10px', color: '#7A8999', letterSpacing: '2px', marginBottom: '16px' }}>EQUITY CURVE</div>
              <EquityCurve data={equity} />
            </div>
          )}

          {/* Trade History Table */}
          <div style={{ background: '#090F18', border: '1px solid #1A2535', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1A2535' }}>
              <span style={{ fontSize: '11px', color: '#7A8999', letterSpacing: '2px' }}>
                TRADE HISTORY ({trades.length} trades)
              </span>
            </div>

            {trades.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#7A8999', fontSize: '12px' }}>No completed trades yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1A2535' }}>
                      {['SYMBOL', 'MARKET', 'ENTRY', 'EXIT', 'QTY', 'P&L', 'P&L%', 'VERDICT', 'DATE', 'OUTCOME'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', color: '#7A8999', fontSize: '10px', letterSpacing: '1px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade, i) => {
                      const outcomeStyle = getOutcomeStyle(trade.outcome, trade.pnl);
                      const pnlColor = trade.pnl != null ? (trade.pnl >= 0 ? '#00D97A' : '#FF3A55') : '#E8EDF2';
                      const date = trade.closed_date || trade.date;

                      return (
                        <tr key={trade.id ?? i} style={{ borderBottom: '1px solid #1A2535', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                          <td style={{ padding: '10px 14px', color: '#E8EDF2', fontWeight: '600' }}>{trade.symbol}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              background: `${MARKET_COLORS[trade.market] || '#7A8999'}20`,
                              border: `1px solid ${MARKET_COLORS[trade.market] || '#7A8999'}44`,
                              borderRadius: '20px',
                              padding: '2px 8px',
                              fontSize: '10px',
                              color: MARKET_COLORS[trade.market] || '#7A8999',
                              fontWeight: '600',
                            }}>{trade.market}</span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#E8EDF2' }}>
                            {trade.entry_price != null ? `$${trade.entry_price.toFixed(2)}` : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#E8EDF2' }}>
                            {trade.exit_price != null ? `$${trade.exit_price.toFixed(2)}` : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#7A8999' }}>
                            {trade.quantity ?? '—'}
                          </td>
                          <td style={{ padding: '10px 14px', color: pnlColor, fontWeight: '600' }}>
                            {trade.pnl != null ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', color: pnlColor }}>
                            {trade.pnl_pct != null ? `${trade.pnl_pct >= 0 ? '+' : ''}${trade.pnl_pct.toFixed(2)}%` : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#7A8999', fontSize: '11px' }}>
                            {trade.verdict || '—'}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#7A8999', fontSize: '11px', whiteSpace: 'nowrap' }}>
                            {date ? new Date(date).toLocaleDateString() : '—'}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              background: outcomeStyle.bg,
                              border: `1px solid ${outcomeStyle.color}44`,
                              borderRadius: '20px',
                              padding: '2px 8px',
                              fontSize: '10px',
                              color: outcomeStyle.color,
                              fontWeight: '700',
                            }}>{outcomeStyle.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
