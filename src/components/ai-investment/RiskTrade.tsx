import React, { useState } from 'react';
import { calculateRisk } from '../../api';

interface Props {
  analysisResult: any;
}

function VerdictBadge({ verdict }: { verdict?: string }) {
  if (!verdict) return null;
  const v = (verdict || '').toUpperCase();
  let color = '#FFB300';
  if (v.includes('STRONG BUY')) color = '#00D97A';
  else if (v.includes('BUY')) color = '#4CAF50';
  else if (v.includes('STRONG SELL')) color = '#FF3A55';
  else if (v.includes('SELL')) color = '#FF6B35';

  return (
    <span style={{
      background: `${color}20`,
      border: `1px solid ${color}55`,
      borderRadius: '20px',
      padding: '3px 12px',
      fontSize: '11px',
      fontWeight: '700',
      color,
      letterSpacing: '1px',
    }}>
      {verdict.toUpperCase()}
    </span>
  );
}

function InfoRow({ label, value, color }: { label: string; value?: string; color?: string }) {
  if (!value) return null;
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: '8px 0',
      borderBottom: '1px solid #1A2535',
      gap: '16px',
    }}>
      <span style={{ color: '#7A8999', fontSize: '11px', flexShrink: 0 }}>{label}</span>
      <span style={{ color: color || '#E8EDF2', fontSize: '12px', fontWeight: '500', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function TPChip({ label, value, color }: { label: string; value?: string; color: string }) {
  if (!value) return null;
  return (
    <div style={{
      background: `${color}10`,
      border: `1px solid ${color}33`,
      borderRadius: '6px',
      padding: '6px 10px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '6px',
    }}>
      <span style={{ color: '#7A8999', fontSize: '10px' }}>{label}</span>
      <span style={{ color, fontSize: '12px', fontWeight: '600' }}>{value}</span>
    </div>
  );
}

function RiskManagerCard({
  title,
  accentColor,
  data,
}: {
  title: string;
  accentColor: string;
  data: any;
}) {
  if (!data) {
    return (
      <div style={{
        flex: '1 1 280px',
        background: '#090F18',
        border: '1px solid #1A2535',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <div style={{ fontSize: '11px', color: accentColor, letterSpacing: '2px', marginBottom: '12px' }}>{title}</div>
        <div style={{ color: '#7A8999', fontSize: '12px' }}>No data available.</div>
      </div>
    );
  }

  const tps = [
    { label: 'TP1', value: data?.tp1 || data?.take_profit_1 },
    { label: 'TP2', value: data?.tp2 || data?.take_profit_2 },
    { label: 'TP3', value: data?.tp3 || data?.take_profit_3 },
  ];

  return (
    <div style={{
      flex: '1 1 280px',
      background: '#090F18',
      border: `1px solid ${accentColor}33`,
      borderRadius: '12px',
      padding: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ fontSize: '11px', color: accentColor, letterSpacing: '2px', fontWeight: '700' }}>{title}</div>
        <VerdictBadge verdict={data?.verdict || data?.recommendation} />
      </div>

      <InfoRow label="Position Size" value={data?.position_size || data?.size} color="#00C2FF" />
      <InfoRow label="Entry Strategy" value={data?.entry_strategy || data?.entry} color="#E8EDF2" />
      <InfoRow label="Stop Loss" value={data?.stop_loss || data?.stop} color="#FF3A55" />
      <InfoRow label="R:R Ratio" value={data?.rr_ratio || data?.risk_reward} color="#FFB300" />

      {tps.some(t => t.value) && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '10px', color: '#7A8999', letterSpacing: '1px', marginBottom: '8px' }}>TAKE PROFITS</div>
          {tps.map(tp => <TPChip key={tp.label} label={tp.label} value={tp.value} color="#00D97A" />)}
        </div>
      )}

      {(data?.risk_notes || data?.notes) && (
        <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,179,0,0.05)', border: '1px solid rgba(255,179,0,0.15)', borderRadius: '6px' }}>
          <div style={{ fontSize: '10px', color: '#FFB300', letterSpacing: '1px', marginBottom: '6px' }}>RISK NOTES</div>
          <div style={{ color: '#E8EDF2', fontSize: '11px', lineHeight: '1.6' }}>{data?.risk_notes || data?.notes}</div>
        </div>
      )}
    </div>
  );
}

interface CalcState {
  accountSize: string;
  riskPct: string;
  entry: string;
  stopLoss: string;
  target: string;
}

interface CalcResult {
  shares: number;
  positionValue: number;
  dollarRisk: number;
  rrRatio: number;
  valid: boolean;
  reason?: string;
}

function calcLocal(state: CalcState): CalcResult | null {
  const account = parseFloat(state.accountSize);
  const riskPct = parseFloat(state.riskPct);
  const entry = parseFloat(state.entry);
  const stop = parseFloat(state.stopLoss);
  const target = parseFloat(state.target);

  if (!account || !riskPct || !entry || !stop) return null;

  const dollarRisk = account * (riskPct / 100);
  const riskPerShare = Math.abs(entry - stop);
  if (riskPerShare === 0) return { shares: 0, positionValue: 0, dollarRisk: 0, rrRatio: 0, valid: false, reason: 'Entry and stop loss cannot be equal' };

  const shares = Math.floor(dollarRisk / riskPerShare);
  const positionValue = shares * entry;
  const rrRatio = target ? Math.abs(target - entry) / riskPerShare : 0;

  const valid = positionValue <= account && riskPct <= 5 && rrRatio >= 1.5;
  const reasons: string[] = [];
  if (positionValue > account) reasons.push('Position exceeds account size');
  if (riskPct > 5) reasons.push('Risk % exceeds 5% threshold');
  if (target && rrRatio < 1.5) reasons.push('R:R below minimum 1.5');

  return {
    shares,
    positionValue,
    dollarRisk,
    rrRatio,
    valid: reasons.length === 0,
    reason: reasons.join('; '),
  };
}

function PositionCalculator({ prefill }: { prefill: { entry?: string; stop?: string; target?: string } }) {
  const [calc, setCalc] = useState<CalcState>({
    accountSize: '100000',
    riskPct: '2',
    entry: prefill.entry || '',
    stopLoss: prefill.stop || '',
    target: prefill.target || '',
  });
  const [result, setResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const update = (key: keyof CalcState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCalc(c => ({ ...c, [key]: e.target.value }));

  const handleCalc = async () => {
    const local = calcLocal(calc);
    setResult(local);

    // Also try backend
    try {
      setLoading(true);
      setApiError(null);
      const res = await calculateRisk({
        account_size: parseFloat(calc.accountSize),
        risk_percent: parseFloat(calc.riskPct),
        entry: parseFloat(calc.entry),
        stop_loss: parseFloat(calc.stopLoss),
        target: parseFloat(calc.target),
      });
      if (res.data) {
        setResult({
          shares: res.data.shares || local?.shares || 0,
          positionValue: res.data.position_value || local?.positionValue || 0,
          dollarRisk: res.data.dollar_risk || local?.dollarRisk || 0,
          rrRatio: res.data.rr_ratio || local?.rrRatio || 0,
          valid: res.data.valid ?? local?.valid ?? false,
          reason: res.data.reason || local?.reason,
        });
      }
    } catch (_) {
      // Backend unavailable — use local calculation
    } finally {
      setLoading(false);
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

  const labelStyle: React.CSSProperties = {
    fontSize: '10px',
    color: '#7A8999',
    letterSpacing: '1px',
    marginBottom: '4px',
  };

  return (
    <div style={{
      background: '#090F18',
      border: '1px solid #1A2535',
      borderRadius: '12px',
      padding: '24px',
      marginTop: '24px',
    }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#E8EDF2', letterSpacing: '2px', marginBottom: '20px' }}>
        POSITION SIZING CALCULATOR
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={labelStyle}>ACCOUNT SIZE ($)</div>
          <input style={inputStyle} value={calc.accountSize} onChange={update('accountSize')} type="number" />
        </div>
        <div>
          <div style={labelStyle}>RISK (%)</div>
          <input style={inputStyle} value={calc.riskPct} onChange={update('riskPct')} type="number" step="0.1" />
        </div>
        <div>
          <div style={labelStyle}>ENTRY PRICE ($)</div>
          <input style={inputStyle} value={calc.entry} onChange={update('entry')} type="number" step="0.01" />
        </div>
        <div>
          <div style={labelStyle}>STOP LOSS ($)</div>
          <input style={inputStyle} value={calc.stopLoss} onChange={update('stopLoss')} type="number" step="0.01" />
        </div>
        <div>
          <div style={labelStyle}>TARGET PRICE ($)</div>
          <input style={inputStyle} value={calc.target} onChange={update('target')} type="number" step="0.01" />
        </div>
      </div>

      <button
        onClick={handleCalc}
        disabled={loading}
        style={{
          background: '#00C2FF',
          color: '#060B12',
          border: 'none',
          borderRadius: '6px',
          padding: '10px 24px',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          fontWeight: '700',
          cursor: 'pointer',
          letterSpacing: '1px',
          marginBottom: result ? '20px' : '0',
        }}
      >
        {loading ? 'CALCULATING...' : 'CALCULATE'}
      </button>

      {result && (
        <div style={{
          background: '#060B12',
          border: `1px solid ${result.valid ? 'rgba(0,217,122,0.4)' : 'rgba(255,58,85,0.4)'}`,
          borderRadius: '10px',
          padding: '16px',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: result.valid ? 'rgba(0,217,122,0.1)' : 'rgba(255,58,85,0.1)',
            border: `1px solid ${result.valid ? '#00D97A' : '#FF3A55'}`,
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '11px',
            fontWeight: '700',
            color: result.valid ? '#00D97A' : '#FF3A55',
            marginBottom: '16px',
          }}>
            {result.valid ? '✓ VALID SETUP' : '✗ INVALID'}
            {!result.valid && result.reason && <span style={{ fontWeight: '400', marginLeft: '4px' }}>— {result.reason}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
            {[
              { label: 'SHARES / UNITS', value: result.shares.toLocaleString(), color: '#00C2FF' },
              { label: 'POSITION VALUE', value: `$${result.positionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#E8EDF2' },
              { label: '$ RISK', value: `$${result.dollarRisk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#FF3A55' },
              { label: 'R:R RATIO', value: result.rrRatio > 0 ? `${result.rrRatio.toFixed(2)}:1` : 'N/A', color: result.rrRatio >= 2 ? '#00D97A' : result.rrRatio >= 1.5 ? '#FFB300' : '#FF3A55' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#090F18', border: '1px solid #1A2535', borderRadius: '8px', padding: '10px 14px' }}>
                <div style={{ fontSize: '10px', color: '#7A8999', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RiskTrade({ analysisResult }: Props) {
  const tier3 = analysisResult?.tier3_risk || analysisResult?.risk_committee || {};
  const aggressive = tier3?.aggressive || tier3?.aggressive_manager || analysisResult?.aggressive_risk || {};
  const conservative = tier3?.conservative || tier3?.conservative_manager || analysisResult?.conservative_risk || {};

  const cio = analysisResult?.cio || analysisResult?.tier4_cio || {};
  const trade = cio?.trade_parameters || {};

  const prefill = {
    entry: trade.entry || trade.entry_price,
    stop: trade.stop_loss || trade.stop,
    target: trade.tp1 || trade.take_profit_1,
  };

  if (!analysisResult) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <div style={{ fontSize: '64px', color: '#1A2535' }}>◆</div>
        <div style={{ color: '#7A8999', fontSize: '14px', textAlign: 'center' }}>Run an analysis to see risk manager recommendations</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: '11px', color: '#7A8999', letterSpacing: '2px', marginBottom: '16px' }}>RISK COMMITTEE RECOMMENDATIONS</div>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <RiskManagerCard
          title="AGGRESSIVE MANAGER"
          accentColor="#00C2FF"
          data={Object.keys(aggressive).length ? aggressive : null}
        />
        <RiskManagerCard
          title="CONSERVATIVE MANAGER"
          accentColor="#FFB300"
          data={Object.keys(conservative).length ? conservative : null}
        />
      </div>

      <PositionCalculator prefill={prefill} />
    </div>
  );
}
