import React from 'react';

interface Props {
  analysisResult: any;
}

function PriceTarget({ price, color }: { price?: string | number; color: string }) {
  if (!price) return null;
  return (
    <div style={{
      background: `${color}15`,
      border: `1px solid ${color}44`,
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '16px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '10px', color, letterSpacing: '2px', marginBottom: '4px' }}>PRICE TARGET</div>
      <div style={{ fontSize: '28px', fontWeight: '700', color, letterSpacing: '1px' }}>{price}</div>
    </div>
  );
}

function ArgumentList({ items, color }: { items: string[]; color: string }) {
  if (!items || items.length === 0) return null;
  return (
    <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{
            background: `${color}20`,
            border: `1px solid ${color}44`,
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: '700',
            color,
          }}>
            {i + 1}
          </span>
          <span style={{ color: '#E8EDF2', fontSize: '12px', lineHeight: '1.7', flex: 1 }}>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function SubSection({ label, value, color }: { label: string; value?: string; color: string }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '10px', color, letterSpacing: '2px', marginBottom: '8px', opacity: 0.8 }}>{label}</div>
      <div style={{ color: '#E8EDF2', fontSize: '12px', lineHeight: '1.7' }}>{value}</div>
    </div>
  );
}

function ConvictionBox({ label, value, color }: { label: string; value?: string; color: string }) {
  if (!value) return null;
  return (
    <div style={{
      background: `${color}10`,
      border: `1px solid ${color}33`,
      borderRadius: '8px',
      padding: '12px 14px',
      marginTop: '16px',
    }}>
      <div style={{ fontSize: '10px', color, letterSpacing: '2px', marginBottom: '6px' }}>{label}</div>
      <div style={{ color: '#E8EDF2', fontSize: '12px', lineHeight: '1.6', fontWeight: '500' }}>{value}</div>
    </div>
  );
}

export default function Debate({ analysisResult }: Props) {
  if (!analysisResult) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '24px', fontSize: '48px' }}>
          <span>🐂</span>
          <span style={{ color: '#1A2535' }}>vs</span>
          <span>🐻</span>
        </div>
        <div style={{ color: '#7A8999', fontSize: '14px', textAlign: 'center' }}>Run an analysis to see the Bull vs Bear debate</div>
      </div>
    );
  }

  // Support multiple response shapes
  const tier2 = analysisResult?.tier2_debate || analysisResult?.debate || {};
  const bull = tier2?.bull || tier2?.bull_case || analysisResult?.bull_case || analysisResult?.bull || {};
  const bear = tier2?.bear || tier2?.bear_case || analysisResult?.bear_case || analysisResult?.bear || {};

  const bullColor = '#00D97A';
  const bearColor = '#FF3A55';

  const bullArgs = bull?.top_arguments || bull?.arguments || bull?.key_arguments || bull?.reasons || [];
  const bearArgs = bear?.top_risks || bear?.risks || bear?.arguments || bear?.key_risks || bear?.reasons || [];

  return (
    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
      {/* Bull Case */}
      <div style={{
        flex: '1 1 300px',
        background: 'rgba(0, 217, 122, 0.05)',
        border: `1px solid rgba(0, 217, 122, 0.30)`,
        borderRadius: '12px',
        padding: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ fontSize: '28px' }}>🐂</span>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: bullColor, letterSpacing: '2px' }}>BULL CASE</div>
            <div style={{ fontSize: '11px', color: '#7A8999' }}>Upside scenario</div>
          </div>
        </div>

        <PriceTarget
          price={bull?.price_target || bull?.bull_price_target || bull?.target}
          color={bullColor}
        />

        <SubSection
          label="CORE THESIS"
          value={bull?.core_thesis || bull?.thesis || bull?.bull_thesis || bull?.summary}
          color={bullColor}
        />

        {bullArgs.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', color: bullColor, letterSpacing: '2px', marginBottom: '12px', opacity: 0.8 }}>TOP 3 ARGUMENTS</div>
            <ArgumentList items={bullArgs.slice(0, 3)} color={bullColor} />
          </div>
        )}

        <SubSection
          label="ASYMMETRIC OPPORTUNITY"
          value={bull?.asymmetric_opportunity || bull?.opportunity || bull?.upside_scenario}
          color={bullColor}
        />

        <ConvictionBox
          label="KEY CONVICTION DRIVER"
          value={bull?.key_conviction || bull?.conviction_driver || bull?.key_driver || bull?.conviction}
          color={bullColor}
        />

        {(bull?.catalyst || bull?.near_term_catalyst) && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '10px', color: bullColor, letterSpacing: '2px', marginBottom: '8px', opacity: 0.8 }}>NEAR-TERM CATALYST</div>
            <div style={{ color: '#E8EDF2', fontSize: '12px', lineHeight: '1.7' }}>
              {bull?.catalyst || bull?.near_term_catalyst}
            </div>
          </div>
        )}
      </div>

      {/* Bear Case */}
      <div style={{
        flex: '1 1 300px',
        background: 'rgba(255, 58, 85, 0.05)',
        border: `1px solid rgba(255, 58, 85, 0.30)`,
        borderRadius: '12px',
        padding: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ fontSize: '28px' }}>🐻</span>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: bearColor, letterSpacing: '2px' }}>BEAR CASE</div>
            <div style={{ fontSize: '11px', color: '#7A8999' }}>Downside scenario</div>
          </div>
        </div>

        <PriceTarget
          price={bear?.price_target || bear?.bear_price_target || bear?.target}
          color={bearColor}
        />

        <SubSection
          label="CORE THESIS"
          value={bear?.core_thesis || bear?.thesis || bear?.bear_thesis || bear?.summary}
          color={bearColor}
        />

        {bearArgs.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', color: bearColor, letterSpacing: '2px', marginBottom: '12px', opacity: 0.8 }}>TOP 3 RISKS</div>
            <ArgumentList items={bearArgs.slice(0, 3)} color={bearColor} />
          </div>
        )}

        <SubSection
          label="DOWNSIDE SCENARIO"
          value={bear?.downside_scenario || bear?.worst_case || bear?.scenario}
          color={bearColor}
        />

        <ConvictionBox
          label="KEY CONVICTION RISK"
          value={bear?.key_conviction || bear?.conviction_risk || bear?.key_risk || bear?.conviction}
          color={bearColor}
        />

        {(bear?.catalyst || bear?.near_term_risk) && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '10px', color: bearColor, letterSpacing: '2px', marginBottom: '8px', opacity: 0.8 }}>NEAR-TERM RISK</div>
            <div style={{ color: '#E8EDF2', fontSize: '12px', lineHeight: '1.7' }}>
              {bear?.catalyst || bear?.near_term_risk}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
