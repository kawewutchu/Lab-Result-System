import React, { useState } from 'react';

interface Props {
  analysisResult: any;
}

function getScoreColor(score: number): { color: string; bg: string; border: string } {
  if (score >= 8) return { color: '#00D97A', bg: 'rgba(0,217,122,0.1)', border: '#00D97A' };
  if (score >= 6) return { color: '#FFB300', bg: 'rgba(255,179,0,0.1)', border: '#FFB300' };
  return { color: '#FF3A55', bg: 'rgba(255,58,85,0.1)', border: '#FF3A55' };
}

function ScoreChip({ score }: { score: number }) {
  const c = getScoreColor(score);
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '20px',
      padding: '3px 10px',
      fontSize: '11px',
      fontWeight: '700',
      color: c.color,
    }}>
      {score}/10
    </span>
  );
}

interface AnalystCardProps {
  title: string;
  accentColor: string;
  score?: number;
  data: any;
  renderContent: (data: any) => React.ReactNode;
  defaultOpen?: boolean;
}

function AnalystCard({ title, accentColor, score, data, renderContent, defaultOpen = true }: AnalystCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{
      background: '#090F18',
      border: `1px solid #1A2535`,
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '16px',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          borderBottom: open ? '1px solid #1A2535' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: accentColor,
            flexShrink: 0,
            boxShadow: `0 0 8px ${accentColor}`,
          }} />
          <span style={{ color: '#E8EDF2', fontSize: '13px', fontWeight: '600', letterSpacing: '1px' }}>{title}</span>
          {score !== undefined && <ScoreChip score={score} />}
        </div>
        <span style={{ color: '#7A8999', fontSize: '14px' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '20px' }}>
          {data ? renderContent(data) : (
            <div style={{ color: '#7A8999', fontSize: '12px' }}>No data available for this analyst.</div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ label, value }: { label: string; value?: string | string[] }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '10px', color: '#7A8999', letterSpacing: '2px', marginBottom: '8px' }}>{label}</div>
      {Array.isArray(value) ? (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {value.map((item, i) => (
            <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ color: '#00C2FF', flexShrink: 0, fontSize: '12px', marginTop: '2px' }}>▸</span>
              <span style={{ color: '#E8EDF2', fontSize: '12px', lineHeight: '1.6' }}>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ color: '#E8EDF2', fontSize: '12px', lineHeight: '1.7' }}>{value}</div>
      )}
    </div>
  );
}

function KVGrid({ items }: { items: { label: string; value: any; color?: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
      {items.filter(i => i.value !== undefined && i.value !== null && i.value !== '').map(({ label, value, color }) => (
        <div key={label} style={{
          background: '#060B12',
          border: '1px solid #1A2535',
          borderRadius: '8px',
          padding: '10px 14px',
        }}>
          <div style={{ fontSize: '10px', color: '#7A8999', marginBottom: '4px' }}>{label}</div>
          <div style={{ color: color || '#E8EDF2', fontSize: '13px', fontWeight: '600' }}>{String(value)}</div>
        </div>
      ))}
    </div>
  );
}

function renderMacro(data: any) {
  return (
    <div>
      <Section label="MACRO ENVIRONMENT" value={data.macro_environment || data.environment} />
      <KVGrid items={[
        { label: 'Fed Stance', value: data.fed_stance || data.monetary_policy },
        { label: 'Interest Rate Trend', value: data.rate_trend || data.interest_rates },
        { label: 'GDP Growth', value: data.gdp_growth || data.growth },
        { label: 'Inflation', value: data.inflation },
        { label: 'DXY Trend', value: data.dxy_trend || data.dollar_trend },
        { label: 'Sector Rotation', value: data.sector_rotation },
        { label: 'Risk-Off/On', value: data.risk_sentiment || data.risk_tone },
      ]} />
      <Section label="MACRO TAILWINDS" value={data.tailwinds || data.macro_tailwinds} />
      <Section label="MACRO HEADWINDS" value={data.headwinds || data.macro_headwinds} />
      <Section label="MARKET REGIME" value={data.market_regime} />
      <Section label="RECOMMENDATION" value={data.recommendation || data.macro_recommendation || data.conclusion} />
    </div>
  );
}

function renderTechnical(data: any) {
  return (
    <div>
      <KVGrid items={[
        { label: 'Trend Direction', value: data.trend_direction || data.trend, color: '#00C2FF' },
        { label: 'Trend Strength', value: data.trend_strength },
        { label: 'RSI', value: data.rsi },
        { label: 'MACD Signal', value: data.macd_signal || data.macd },
        { label: 'Volume Analysis', value: data.volume_analysis || data.volume },
        { label: 'Support Level', value: data.support_level || data.support, color: '#00D97A' },
        { label: 'Resistance Level', value: data.resistance_level || data.resistance, color: '#FF3A55' },
        { label: 'Chart Pattern', value: data.chart_pattern || data.pattern },
        { label: 'Moving Averages', value: data.moving_averages || data.ma_signal },
        { label: 'Momentum', value: data.momentum },
      ]} />
      <Section label="TECHNICAL OUTLOOK" value={data.technical_outlook || data.outlook || data.summary} />
      <Section label="KEY LEVELS" value={data.key_levels} />
      <Section label="ENTRY SIGNALS" value={data.entry_signals || data.signals} />
      <Section label="RECOMMENDATION" value={data.recommendation || data.technical_recommendation || data.conclusion} />
    </div>
  );
}

function renderFundamental(data: any) {
  return (
    <div>
      <KVGrid items={[
        { label: 'P/E Ratio', value: data.pe_ratio || data.pe },
        { label: 'P/B Ratio', value: data.pb_ratio || data.pb },
        { label: 'Revenue Growth', value: data.revenue_growth },
        { label: 'Earnings Growth', value: data.earnings_growth },
        { label: 'Profit Margin', value: data.profit_margin || data.margins },
        { label: 'Free Cash Flow', value: data.free_cash_flow || data.fcf },
        { label: 'Debt/Equity', value: data.debt_to_equity || data.de_ratio },
        { label: 'ROE', value: data.roe },
        { label: 'Valuation', value: data.valuation_assessment || data.valuation },
        { label: 'EPS', value: data.eps },
      ]} />
      <Section label="COMPETITIVE MOAT" value={data.competitive_moat || data.moat || data.competitive_advantage} />
      <Section label="GROWTH CATALYSTS" value={data.growth_catalysts || data.catalysts} />
      <Section label="FUNDAMENTAL CONCERNS" value={data.concerns || data.risks || data.fundamental_risks} />
      <Section label="FAIR VALUE ESTIMATE" value={data.fair_value || data.intrinsic_value || data.price_target} />
      <Section label="RECOMMENDATION" value={data.recommendation || data.fundamental_recommendation || data.conclusion} />
    </div>
  );
}

function renderSentiment(data: any) {
  return (
    <div>
      <KVGrid items={[
        { label: 'Overall Sentiment', value: data.overall_sentiment || data.sentiment, color: '#00C2FF' },
        { label: 'News Sentiment', value: data.news_sentiment },
        { label: 'Social Sentiment', value: data.social_sentiment || data.social },
        { label: 'Analyst Ratings', value: data.analyst_ratings || data.analyst_consensus },
        { label: 'Institutional Flow', value: data.institutional_flow || data.institutional },
        { label: 'Short Interest', value: data.short_interest || data.short_ratio },
        { label: 'Options Sentiment', value: data.options_sentiment || data.options_flow },
        { label: 'Retail Interest', value: data.retail_interest || data.retail_sentiment },
      ]} />
      <Section label="KEY NEWS THEMES" value={data.key_news || data.news_themes || data.recent_news} />
      <Section label="SENTIMENT DRIVERS" value={data.sentiment_drivers || data.drivers} />
      <Section label="CONTRARIAN SIGNALS" value={data.contrarian_signals || data.contrarian} />
      <Section label="RECOMMENDATION" value={data.recommendation || data.sentiment_recommendation || data.conclusion} />
    </div>
  );
}

function DataPanel({ ctx }: { ctx: any }) {
  const [open, setOpen] = useState(false);
  if (!ctx) return null;
  return (
    <div style={{
      background: '#090F18',
      border: '1px solid #1A2535',
      borderRadius: '12px',
      overflow: 'hidden',
      marginTop: '8px',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <span style={{ color: '#7A8999', fontSize: '11px', letterSpacing: '2px' }}>RAW CONTEXT PACKAGE</span>
        <span style={{ color: '#7A8999', fontSize: '14px' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '20px', borderTop: '1px solid #1A2535' }}>
          <pre style={{
            color: '#7A8999',
            fontSize: '10px',
            overflowX: 'auto',
            margin: 0,
            lineHeight: '1.6',
            maxHeight: '400px',
            overflowY: 'auto',
          }}>
            {JSON.stringify(ctx, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function Analysts({ analysisResult }: Props) {
  if (!analysisResult) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <div style={{ fontSize: '64px', color: '#1A2535' }}>◆</div>
        <div style={{ color: '#7A8999', fontSize: '14px', textAlign: 'center' }}>Run an analysis to see analyst reports</div>
      </div>
    );
  }

  // Support multiple API response shapes
  const tier1 = analysisResult?.tier1_analysts || analysisResult?.analysts || {};
  const macro = tier1?.macro || tier1?.macro_analyst || analysisResult?.macro_analyst || {};
  const technical = tier1?.technical || tier1?.technical_analyst || analysisResult?.technical_analyst || {};
  const fundamental = tier1?.fundamental || tier1?.fundamental_analyst || analysisResult?.fundamental_analyst || {};
  const sentiment = tier1?.sentiment || tier1?.sentiment_analyst || analysisResult?.sentiment_analyst || {};

  const scores = analysisResult?.cio?.score_summary ||
    analysisResult?.tier4_cio?.score_summary || {};

  const ctx = analysisResult?.context || analysisResult?.market_data || null;

  return (
    <div>
      <AnalystCard
        title="MACRO ANALYST"
        accentColor="#00C2FF"
        score={scores.macro !== undefined ? Number(scores.macro) : undefined}
        data={macro}
        renderContent={renderMacro}
        defaultOpen={true}
      />
      <AnalystCard
        title="TECHNICAL ANALYST"
        accentColor="#FFB300"
        score={scores.technical !== undefined ? Number(scores.technical) : undefined}
        data={technical}
        renderContent={renderTechnical}
        defaultOpen={true}
      />
      <AnalystCard
        title="FUNDAMENTAL ANALYST"
        accentColor="#00D97A"
        score={scores.fundamental !== undefined ? Number(scores.fundamental) : undefined}
        data={fundamental}
        renderContent={renderFundamental}
        defaultOpen={true}
      />
      <AnalystCard
        title="SENTIMENT ANALYST"
        accentColor="#FF3A55"
        score={scores.sentiment !== undefined ? Number(scores.sentiment) : undefined}
        data={sentiment}
        renderContent={renderSentiment}
        defaultOpen={true}
      />
      <DataPanel ctx={ctx} />
    </div>
  );
}
