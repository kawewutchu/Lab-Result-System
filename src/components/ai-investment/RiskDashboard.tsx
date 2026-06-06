import React, { useState, useEffect } from 'react';
import { getPortfolioSummary } from '../../api';

interface RiskData {
  risk_level?: string;
  open_risk_dollars?: number;
  portfolio_beta?: number;
  var_95?: number;
  max_drawdown_pct?: number;
  concentration?: {
    us?: number;
    china?: number;
    crypto?: number;
    cash?: number;
  };
  warnings?: string[];
  metrics?: Record<string, any>;
}

function getRiskLevelStyle(level?: string): { color: string; bg: string; border: string; label: string } {
  const l = (level || '').toUpperCase();
  if (l === 'LOW') return { color: '#00D97A', bg: 'rgba(0,217,122,0.1)', border: '#00D97A', label: 'LOW' };
  if (l === 'MEDIUM' || l === 'MODERATE') return { color: '#FFB300', bg: 'rgba(255,179,0,0.1)', border: '#FFB300', label: 'MEDIUM' };
  if (l === 'HIGH') return { color: '#FF6B35', bg: 'rgba(255,107,53,0.1)', border: '#FF6B35', label: 'HIGH' };
  if (l === 'CRITICAL') return { color: '#FF3A55', bg: 'rgba(255,58,85,0.1)', border: '#FF3A55', label: 'CRITICAL' };
  return { color: '#7A8999', bg: 'rgba(122,137,153,0.1)', border: '#7A8999', label: level || 'UNKNOWN' };
}

function RiskGauge({ level }: { level?: string }) {
  const style = getRiskLevelStyle(level);
  const levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const idx = levels.findIndex(l => l === (level || '').toUpperCase());

  return (
    <div style={{
      background: '#090F18',
      border: '1px solid #1A2535',
      borderRadius: '12px',
      padding: '24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '10px', color: '#7A8999', letterSpacing: '2px', marginBottom: '20px' }}>PORTFOLIO RISK LEVEL</div>

      {/* Gauge bars */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '16px' }}>
        {levels.map((l, i) => {
          const colors = ['#00D97A', '#FFB300', '#FF6B35', '#FF3A55'];
          const active = idx >= 0 ? i <= idx : false;
          return (
            <div
              key={l}
              style={{
                width: '48px',
                height: '12px',
                borderRadius: '3px',
                background: active ? colors[i] : '#1A2535',
                transition: 'background 0.3s',
                boxShadow: active ? `0 0 8px ${colors[i]}66` : 'none',
              }}
            />
          );
        })}
      </div>

      {/* Risk Level Badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: style.bg,
        border: `2px solid ${style.border}`,
        borderRadius: '8px',
        padding: '12px 28px',
        fontSize: '24px',
        fontWeight: '700',
        color: style.color,
        letterSpacing: '3px',
        boxShadow: `0 0 20px ${style.color}22`,
      }}>
        {style.label}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, subtext }: { label: string; value?: string | number; color?: string; subtext?: string }) {
  return (
    <div style={{
      background: '#090F18',
      border: '1px solid #1A2535',
      borderRadius: '10px',
      padding: '16px',
      flex: '1 1 150px',
    }}>
      <div style={{ fontSize: '10px', color: '#7A8999', letterSpacing: '1px', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: '700', color: color || '#E8EDF2' }}>
        {value != null ? value : '—'}
      </div>
      {subtext && <div style={{ fontSize: '10px', color: '#7A8999', marginTop: '4px' }}>{subtext}</div>}
    </div>
  );
}

function ConcentrationBar({ label, value, color }: { label: string; value?: number; color: string }) {
  const pct = value ?? 0;
  const isHigh = pct > 40;
  const barColor = isHigh ? '#FF6B35' : color;

  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', color: '#E8EDF2', fontWeight: '500' }}>{label}</span>
        <span style={{ fontSize: '11px', color: isHigh ? '#FF6B35' : color, fontWeight: '600' }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{
        width: '100%',
        height: '8px',
        background: '#1A2535',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.min(pct, 100)}%`,
          height: '100%',
          background: barColor,
          borderRadius: '4px',
          transition: 'width 0.5s ease',
          boxShadow: `0 0 8px ${barColor}66`,
        }} />
      </div>
    </div>
  );
}

export default function RiskDashboard() {
  const [accountSize, setAccountSize] = useState('100000');
  const [data, setData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (size?: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPortfolioSummary(size || parseFloat(accountSize) || 100000);
      setData(res.data || null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load risk data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccountSize(e.target.value);
  };

  const handleRecalculate = () => {
    fetchData(parseFloat(accountSize));
  };

  const concentration = data?.concentration || {};
  const warnings = data?.warnings || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Account Size Input */}
      <div style={{
        background: '#090F18',
        border: '1px solid #1A2535',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: '10px', color: '#7A8999', letterSpacing: '2px', flexShrink: 0 }}>ACCOUNT SIZE</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#7A8999', fontSize: '13px' }}>$</span>
          <input
            value={accountSize}
            onChange={handleAccountChange}
            type="number"
            onKeyDown={e => e.key === 'Enter' && handleRecalculate()}
            style={{
              background: '#060B12',
              border: '1px solid #1A2535',
              borderRadius: '6px',
              padding: '6px 12px',
              color: '#E8EDF2',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '13px',
              width: '140px',
              outline: 'none',
            }}
          />
        </div>
        <button
          onClick={handleRecalculate}
          style={{
            background: '#00C2FF',
            color: '#060B12',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 16px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            fontWeight: '700',
            cursor: 'pointer',
            letterSpacing: '1px',
          }}
        >
          RECALCULATE
        </button>
        <button
          onClick={() => fetchData()}
          style={{
            background: 'none',
            border: '1px solid #1A2535',
            borderRadius: '6px',
            padding: '6px 14px',
            color: '#7A8999',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            cursor: 'pointer',
          }}
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
        <div style={{ textAlign: 'center', padding: '60px', color: '#7A8999', fontSize: '12px' }}>Loading risk data...</div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#7A8999', fontSize: '12px' }}>
          No portfolio data available. Add positions in the Portfolio tab.
        </div>
      ) : (
        <>
          {/* Risk Gauge */}
          <RiskGauge level={data.risk_level} />

          {/* Key Metrics */}
          <div>
            <div style={{ fontSize: '10px', color: '#7A8999', letterSpacing: '2px', marginBottom: '12px' }}>KEY METRICS</div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <MetricCard
                label="OPEN RISK ($)"
                value={data.open_risk_dollars != null ? `$${data.open_risk_dollars.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : undefined}
                color="#FF3A55"
              />
              <MetricCard
                label="PORTFOLIO BETA"
                value={data.portfolio_beta != null ? data.portfolio_beta.toFixed(2) : undefined}
                color={data.portfolio_beta != null ? (data.portfolio_beta > 1.5 ? '#FF6B35' : data.portfolio_beta < 0.5 ? '#00D97A' : '#FFB300') : undefined}
                subtext="vs S&P 500"
              />
              <MetricCard
                label="VaR (95%, 1-DAY)"
                value={data.var_95 != null ? `${data.var_95 >= 0 ? '-' : ''}$${Math.abs(data.var_95).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : undefined}
                color="#FFB300"
                subtext="Value at Risk"
              />
              <MetricCard
                label="MAX DRAWDOWN"
                value={data.max_drawdown_pct != null ? `${data.max_drawdown_pct.toFixed(2)}%` : undefined}
                color={data.max_drawdown_pct != null ? (Math.abs(data.max_drawdown_pct) > 20 ? '#FF3A55' : Math.abs(data.max_drawdown_pct) > 10 ? '#FF6B35' : '#00D97A') : undefined}
                subtext="from peak"
              />
            </div>
          </div>

          {/* Additional metrics from backend */}
          {data.metrics && Object.keys(data.metrics).length > 0 && (
            <div>
              <div style={{ fontSize: '10px', color: '#7A8999', letterSpacing: '2px', marginBottom: '12px' }}>ADDITIONAL METRICS</div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {Object.entries(data.metrics).map(([key, val]) => (
                  <MetricCard
                    key={key}
                    label={key.toUpperCase().replace(/_/g, ' ')}
                    value={typeof val === 'number' ? val.toFixed(2) : String(val)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Concentration */}
          {Object.keys(concentration).length > 0 && (
            <div style={{ background: '#090F18', border: '1px solid #1A2535', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '10px', color: '#7A8999', letterSpacing: '2px', marginBottom: '20px' }}>MARKET CONCENTRATION</div>
              <div style={{ maxWidth: '500px' }}>
                {concentration.us !== undefined && (
                  <ConcentrationBar label="US Equities" value={concentration.us} color="#00C2FF" />
                )}
                {concentration.china !== undefined && (
                  <ConcentrationBar label="China / ADR" value={concentration.china} color="#FFB300" />
                )}
                {concentration.crypto !== undefined && (
                  <ConcentrationBar label="Cryptocurrency" value={concentration.crypto} color="#00D97A" />
                )}
                {concentration.cash !== undefined && (
                  <ConcentrationBar label="Cash" value={concentration.cash} color="#7A8999" />
                )}
              </div>
              <div style={{ fontSize: '10px', color: '#1A2535', marginTop: '12px' }}>
                Bars shown in orange indicate &gt;40% concentration — consider rebalancing.
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div style={{
              background: 'rgba(255,107,53,0.05)',
              border: '1px solid rgba(255,107,53,0.3)',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <div style={{ fontSize: '10px', color: '#FF6B35', letterSpacing: '2px', marginBottom: '14px' }}>⚠ RISK WARNINGS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {warnings.map((w, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#FF6B35', flexShrink: 0, marginTop: '2px' }}>▸</span>
                    <span style={{ color: '#E8EDF2', fontSize: '12px', lineHeight: '1.6' }}>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
