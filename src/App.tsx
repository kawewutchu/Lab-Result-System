import React, { useState } from 'react';
import Overview from './components/ai-investment/Overview';
import Analysts from './components/ai-investment/Analysts';
import Debate from './components/ai-investment/Debate';
import RiskTrade from './components/ai-investment/RiskTrade';
import Portfolio from './components/ai-investment/Portfolio';
import RiskDashboard from './components/ai-investment/RiskDashboard';
import Journal from './components/ai-investment/Journal';
import { analyzeSymbol } from './api';

const TABS = ['OVERVIEW', 'ANALYSTS', 'DEBATE', 'RISK & TRADE', 'PORTFOLIO', 'RISK DASHBOARD', 'JOURNAL'];

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [symbol, setSymbol] = useState('AAPL');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisPhase, setAnalysisPhase] = useState('');

  const handleAnalyze = async () => {
    if (!symbol.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      setAnalysisPhase('Fetching market data...');
      const phases = [
        'Fetching market data...',
        'Running Tier 1: Analyst Team...',
        'Running Tier 2: Bull vs Bear Debate...',
        'Running Tier 3: Risk Committee...',
        'Running Tier 4: CIO Final Decision...',
      ];
      let phaseIdx = 0;
      const phaseTimer = setInterval(() => {
        phaseIdx++;
        if (phaseIdx < phases.length) {
          setAnalysisPhase(phases[phaseIdx]);
        }
      }, 15000);

      const response = await analyzeSymbol(symbol.toUpperCase());
      clearInterval(phaseTimer);
      setAnalysisResult(response.data);
      setActiveTab(0);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
      setAnalysisPhase('');
    }
  };

  const commonProps = { analysisResult };

  return (
    <div className="min-h-screen" style={{ background: '#060B12', fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Header */}
      <header style={{ background: '#090F18', borderBottom: '1px solid #1A2535', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#00C2FF', letterSpacing: '3px' }}>
                ◆ AI INVESTMENT COMMITTEE
              </div>
              <div style={{ fontSize: '11px', color: '#7A8999', marginTop: '2px' }}>
                9-Agent Analysis System | Multi-Market Intelligence
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                value={symbol}
                onChange={e => setSymbol(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && !isAnalyzing && handleAnalyze()}
                placeholder="AAPL, BTC-USD, BABA..."
                style={{
                  background: '#060B12',
                  border: '1px solid #1A2535',
                  borderRadius: '6px',
                  padding: '10px 16px',
                  color: '#E8EDF2',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '14px',
                  width: '220px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                style={{
                  background: isAnalyzing ? '#1A2535' : '#00C2FF',
                  color: isAnalyzing ? '#7A8999' : '#060B12',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 24px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                  letterSpacing: '1px',
                  transition: 'all 0.2s',
                }}
              >
                {isAnalyzing ? '◈ ANALYZING...' : '◆ ANALYZE'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Loading state */}
      {isAnalyzing && (
        <div style={{ background: '#090F18', borderBottom: '1px solid #1A2535', padding: '12px 24px' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className="loading-pulse"
              style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00C2FF', flexShrink: 0 }}
            />
            <span style={{ color: '#00C2FF', fontSize: '12px' }}>{analysisPhase}</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{
          background: 'rgba(255,58,85,0.1)',
          border: '1px solid #FF3A55',
          margin: '16px 24px',
          borderRadius: '8px',
          padding: '12px 16px',
        }}>
          <span style={{ color: '#FF3A55', fontSize: '13px' }}>⚠ Error: {error}</span>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid #1A2535', padding: '0 24px', overflowX: 'auto' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex' }}>
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === i ? '2px solid #00C2FF' : '2px solid transparent',
                color: activeTab === i ? '#00C2FF' : '#7A8999',
                padding: '14px 20px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '11px',
                fontWeight: '600',
                letterSpacing: '1px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {activeTab === 0 && <Overview {...commonProps} />}
        {activeTab === 1 && <Analysts {...commonProps} />}
        {activeTab === 2 && <Debate {...commonProps} />}
        {activeTab === 3 && <RiskTrade {...commonProps} />}
        {activeTab === 4 && <Portfolio />}
        {activeTab === 5 && <RiskDashboard />}
        {activeTab === 6 && <Journal />}
      </main>
    </div>
  );
}
