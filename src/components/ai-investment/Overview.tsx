import React from 'react';

interface Props {
  analysisResult: any;
}

function getVerdictColor(verdict: string): string {
  const v = (verdict || '').toUpperCase();
  if (v.includes('STRONG BUY')) return '#00D97A';
  if (v.includes('BUY')) return '#4CAF50';
  if (v.includes('STRONG SELL')) return '#FF3A55';
  if (v.includes('SELL')) return '#FF6B35';
  return '#FFB300'; // HOLD
}

function getScoreColor(score: number): { color: string; bg: string; border: string } {
  if (score >= 8) return { color: '#00D97A', bg: 'rgba(0,217,122,0.1)', border: '#00D97A' };
  if (score >= 6) return { color: '#FFB300', bg: 'rgba(255,179,0,0.1)', border: '#FFB300' };
  return { color: '#FF3A55', bg: 'rgba(255,58,85,0.1)', border: '#FF3A55' };
}

function ScoreChip({ label, score }: { label: string; score: number }) {
  const c = getScoreColor(score);
  return (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '8px',
      padding: '10px 16px',
      minWidth: '100px',
    }}>
      <span style={{ color: '#7A8999', fontSize: '10px', letterSpacing: '1px' }}>{label}</span>
      <span style={{ color: c.color, fontSize: '22px', fontWeight: '700' }}>{score}<span style={{ fontSize: '12px', color: '#7A8999' }}>/10</span></span>
    </div>
  );
}

function TradeRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1A2535' }}>
      <span style={{ color: '#7A8999', fontSize: '12px' }}>{label}</span>
      <span style={{ color: color || '#E8EDF2', fontSize: '13px', fontWeight: '600' }}>{value || '—'}</span>
    </div>
  );
}

export default function Overview({ analysisResult }: Props) {
  if (!analysisResult) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <div style={{ fontSize: '64px', color: '#1A2535' }}>◆</div>
        <div style={{ color: '#7A8999', fontSize: '14px', textAlign: 'center' }}>Enter a symbol and click ANALYZE to start</div>
        <div style={{ color: '#1A2535', fontSize: '12px', textAlign: 'center' }}>Supports US stocks, Chinese ADRs, and Cryptocurrency</div>
      </div>
    );
  }

  const cio = analysisResult?.cio || analysisResult?.tier4_cio || {};
  const scores = cio?.score_summary || {};
  const trade = cio?.trade_parameters || {};
  const risks = cio?.critical_risks || [];
  const reasoning = cio?.key_reasoning || cio?.reasoning || '';
  const verdict = cio?.verdict || cio?.final_verdict || 'HOLD';
  const confidence = cio?.confidence || cio?.confidence_level || '';
  const timeHorizon = cio?.time_horizon || cio?.holding_period || '';
  const bottomLine = cio?.bottom_line || cio?.executive_summary || '';
  const symbol = analysisResult?.symbol || analysisResult?.ticker || '';

  const verdictColor = getVerdictColor(verdict);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top: Verdict + Symbol */}
      <div style={{
        background: '#090F18',
        border: '1px solid #1A2535',
        borderRadius: '12px',
        padding: '28px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '24px',
        alignItems: 'flex-start',
      }}>
        <div style={{ flex: '0 0 auto' }}>
          <div style={{ fontSize: '11px', color: '#7A8999', letterSpacing: '2px', marginBottom: '8px' }}>CIO FINAL VERDICT</div>
          <div style={{
            fontSize: '36px',
            fontWeight: '700',
            color: verdictColor,
            letterSpacing: '2px',
            textShadow: `0 0 30px ${verdictColor}44`,
            marginBottom: '8px',
          }}>
            {verdict.toUpperCase()}
          </div>
          {symbol && (
            <div style={{ fontSize: '18px', color: '#E8EDF2', fontWeight: '600', marginBottom: '4px' }}>{symbol}</div>
          )}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
            {confidence && (
              <div style={{
                background: 'rgba(0,194,255,0.1)',
                border: '1px solid rgba(0,194,255,0.3)',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '11px',
                color: '#00C2FF',
              }}>
                CONFIDENCE: {confidence}
              </div>
            )}
            {timeHorizon && (
              <div style={{
                background: 'rgba(255,179,0,0.1)',
                border: '1px solid rgba(255,179,0,0.3)',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '11px',
                color: '#FFB300',
              }}>
                HORIZON: {timeHorizon}
              </div>
            )}
          </div>
        </div>

        {bottomLine && (
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ fontSize: '11px', color: '#7A8999', letterSpacing: '2px', marginBottom: '8px' }}>BOTTOM LINE</div>
            <div style={{
              color: '#E8EDF2',
              fontSize: '13px',
              lineHeight: '1.7',
              background: 'rgba(0,194,255,0.04)',
              border: '1px solid rgba(0,194,255,0.12)',
              borderRadius: '8px',
              padding: '12px 16px',
            }}>
              {bottomLine}
            </div>
          </div>
        )}
      </div>

      {/* Score chips */}
      <div style={{
        background: '#090F18',
        border: '1px solid #1A2535',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <div style={{ fontSize: '11px', color: '#7A8999', letterSpacing: '2px', marginBottom: '16px' }}>SCORE SUMMARY</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {scores.macro !== undefined && <ScoreChip label="MACRO" score={Number(scores.macro)} />}
          {scores.technical !== undefined && <ScoreChip label="TECHNICAL" score={Number(scores.technical)} />}
          {scores.fundamental !== undefined && <ScoreChip label="FUNDAMENTAL" score={Number(scores.fundamental)} />}
          {scores.sentiment !== undefined && <ScoreChip label="SENTIMENT" score={Number(scores.sentiment)} />}
          {scores.overall !== undefined && <ScoreChip label="OVERALL" score={Number(scores.overall)} />}
          {/* Fallback if scores are nested differently */}
          {Object.keys(scores).length === 0 && (
            <span style={{ color: '#7A8999', fontSize: '12px' }}>No score data available</span>
          )}
        </div>
      </div>

      {/* Trade Parameters + Critical Risks side by side */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* Trade Parameters */}
        <div style={{
          flex: '1 1 300px',
          background: '#090F18',
          border: '1px solid #1A2535',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <div style={{ fontSize: '11px', color: '#7A8999', letterSpacing: '2px', marginBottom: '16px' }}>TRADE PARAMETERS</div>
          <TradeRow label="Entry Price" value={trade.entry || trade.entry_price || ''} color="#00C2FF" />
          <TradeRow label="Stop Loss" value={trade.stop_loss || trade.stop || ''} color="#FF3A55" />
          <TradeRow label="Take Profit 1" value={trade.tp1 || trade.take_profit_1 || ''} color="#00D97A" />
          <TradeRow label="Take Profit 2" value={trade.tp2 || trade.take_profit_2 || ''} color="#00D97A" />
          <TradeRow label="Position Size" value={trade.position_size || trade.size || ''} />
          <TradeRow label="Risk/Reward" value={trade.risk_reward || trade.rr_ratio || ''} color="#FFB300" />
        </div>

        {/* Critical Risks + Key Reasoning */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {risks.length > 0 && (
            <div style={{
              background: '#090F18',
              border: '1px solid rgba(255,58,85,0.3)',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <div style={{ fontSize: '11px', color: '#FF3A55', letterSpacing: '2px', marginBottom: '16px' }}>⚠ CRITICAL RISKS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {risks.map((risk: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#FF3A55', fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>▸</span>
                    <span style={{ color: '#E8EDF2', fontSize: '12px', lineHeight: '1.6' }}>{risk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reasoning && (
            <div style={{
              background: '#090F18',
              border: '1px solid #1A2535',
              borderRadius: '12px',
              padding: '20px',
              flex: 1,
            }}>
              <div style={{ fontSize: '11px', color: '#7A8999', letterSpacing: '2px', marginBottom: '12px' }}>KEY REASONING</div>
              <div style={{ color: '#E8EDF2', fontSize: '12px', lineHeight: '1.8' }}>{reasoning}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
