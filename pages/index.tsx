// pages/index.tsx
import { useState, useEffect } from 'react';
import Head from 'next/head';
import type { ResearchResult } from '../lib/research';
import { buildProjectionData, buildPhasedProjections } from '../lib/research';

type Step = 'input' | 'researching' | 'review' | 'generating' | 'done';

interface ResearchLog {
  time: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export default function Home() {
  const [step, setStep] = useState<Step>('input');
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [manualGmbRank, setManualGmbRank] = useState('');
  const [manualOrgRank, setManualOrgRank] = useState('');
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [logs, setLogs] = useState<ResearchLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Override values
  const [conversionRate, setConversionRate] = useState('0.08');
  const [gmbConvRate, setGmbConvRate] = useState('0.20');
  const [closeRate, setCloseRate] = useState('0.60');
  const [avgOrder, setAvgOrder] = useState('450');

  const addLog = (message: string, type: ResearchLog['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, { time, message, type }]);
  };

  const runResearch = async () => {
    if (!businessName.trim() || !city.trim() || !state.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setError(null);
    setStep('researching');
    setLogs([]);

    addLog(`Initiating research for: ${businessName}`, 'info');
    addLog(`Target location: ${city}, ${state}`, 'info');

    // Simulate step-by-step logs while actual API runs
    const logSteps = [
      { delay: 300, msg: 'Connecting to Google Business Profile data sources...', type: 'info' as const },
      { delay: 800, msg: 'Querying US Census Bureau API for population data...', type: 'info' as const },
      { delay: 1400, msg: 'Fetching city-level population data...', type: 'info' as const },
      { delay: 2200, msg: 'Fetching county-level population data...', type: 'info' as const },
      { delay: 3000, msg: 'Analyzing search volume benchmarks for "dumpster rental"...', type: 'info' as const },
      { delay: 3600, msg: 'Calculating searches per 1,000 people ratio...', type: 'info' as const },
      { delay: 4200, msg: 'Evaluating city vs. county targeting perspective...', type: 'info' as const },
      { delay: 4800, msg: 'Compiling ranking data...', type: 'info' as const },
    ];

    logSteps.forEach(({ delay, msg, type }) => {
      setTimeout(() => addLog(msg, type), delay);
    });

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName.trim(),
          city: city.trim(),
          state: state.trim(),
          manualGmbRank: manualGmbRank || undefined,
          manualOrgRank: manualOrgRank || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Research failed');
      }

      const researchResult: ResearchResult = data.result;
      setResult(researchResult);

      addLog(`✓ Business data collected: ${researchResult.company.businessName}`, 'success');
      addLog(`✓ Primary city: ${researchResult.primaryCity.name} (pop: ${researchResult.primaryCity.population.toLocaleString()})`, 'success');
      addLog(`✓ ${researchResult.nearbyCities.length} nearby cities identified`, 'success');
      addLog(`✓ Primary county: ${researchResult.primaryCounty.name} (pop: ${researchResult.primaryCounty.population.toLocaleString()})`, 'success');
      addLog(`✓ ${researchResult.nearbyCounties.length} surrounding counties analyzed`, 'success');
      addLog(`✓ Search rate: ${researchResult.searchRatePer1000.toFixed(2)} per 1,000 people`, 'success');
      addLog(`✓ Recommended targeting: ${researchResult.perspective.toUpperCase()}-level`, 'success');
      addLog(`✓ Total service area population: ${researchResult.totalServiceAreaPop.toLocaleString()}`, 'success');
      addLog('Research complete. Ready to generate spreadsheet.', 'success');

      setTimeout(() => setStep('review'), 500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Research failed';
      addLog(`✗ Error: ${msg}`, 'error');
      setError(msg);
      setStep('input');
    }
  };

  const generateSpreadsheet = async () => {
    if (!result) return;
    setStep('generating');
    addLog('Generating Excel spreadsheet...', 'info');

    try {
      const response = await fetch('/api/generate-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result,
          overrides: {
            conversionRate: parseFloat(conversionRate),
            gmbConversionRate: parseFloat(gmbConvRate),
            closeRate: parseFloat(closeRate),
            avgOrderValue: parseFloat(avgOrder),
            currentGmbRank: manualGmbRank ? parseInt(manualGmbRank) : undefined,
            currentOrgRank: manualOrgRank ? parseInt(manualOrgRank) : undefined,
          }
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.details || 'Excel generation failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SEO_Revenue_Projector_${result.company.businessName.replace(/[^a-zA-Z0-9]/g, '_')}_${result.company.city}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addLog('✓ Spreadsheet generated and downloaded!', 'success');
      setStep('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      addLog(`✗ Error: ${msg}`, 'error');
      setError(msg);
      setStep('review');
    }
  };

  const projData = result ? buildProjectionData(
    result,
    parseFloat(conversionRate),
    parseFloat(gmbConvRate),
    parseFloat(closeRate),
    parseFloat(avgOrder)
  ) : null;

  const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  return (
    <>
      <Head>
        <title>Dumpster SEO Revenue Projector</title>
        <meta name="description" content="AI-powered SEO revenue projector for dumpster rental companies" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🗑️</text></svg>" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="grid-bg" style={{ minHeight: '100vh', background: '#0a0e1a' }}>
        {/* Header */}
        <header style={{ borderBottom: '1px solid #1e2d45', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>🗑️</span>
            <div>
              <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: '#00d4ff', letterSpacing: '0.1em' }}>
                DUMPSTER SEO PROJECTOR
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Revenue Intelligence Tool · v2.0</div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            {['input', 'researching', 'review', 'generating', 'done'].map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: step === s ? '#00d4ff' : 
                    ['input', 'researching', 'review', 'generating', 'done'].indexOf(step) > i ? '#10b981' : '#1e2d45',
                  transition: 'background 0.3s',
                }} />
                {i < 4 && <div style={{ width: '20px', height: '1px', background: '#1e2d45' }} />}
              </div>
            ))}
          </div>
        </header>

        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
          
          {/* INPUT STEP */}
          {step === 'input' && (
            <div className="animate-fade-in-up">
              <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <h1 style={{ fontSize: '40px', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2, marginBottom: '12px' }}>
                  Research Any{' '}
                  <span style={{ color: '#00d4ff' }}>Dumpster Rental</span>{' '}
                  Company
                </h1>
                <p style={{ color: '#64748b', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
                  Enter a company's info to get their GMB ranking, search data, population analysis, and a custom revenue projection spreadsheet.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', maxWidth: '900px', margin: '0 auto' }}>
                {/* Business Info Card */}
                <div className="card step-card">
                  <div className="section-label">Business Information</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', display: 'block' }}>
                        Company Name *
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        value={businessName}
                        onChange={e => setBusinessName(e.target.value)}
                        placeholder="e.g., ABC Dumpster Rental"
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', display: 'block' }}>
                          City *
                        </label>
                        <input
                          className="input-field"
                          type="text"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          placeholder="e.g., Austin"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', display: 'block' }}>
                          State *
                        </label>
                        <select
                          className="input-field"
                          value={state}
                          onChange={e => setState(e.target.value)}
                          style={{ cursor: 'pointer' }}
                        >
                          <option value="">--</option>
                          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rankings Card */}
                <div className="card step-card">
                  <div className="section-label">Current Rankings (Optional)</div>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 16px', lineHeight: 1.5 }}>
                    If you know their current rankings, enter them below. Otherwise, leave blank and we'll use placeholders.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', display: 'block' }}>
                        GMB / Map Pack Rank (1–3)
                      </label>
                      <input
                        className="input-field"
                        type="number"
                        min="1" max="10"
                        value={manualGmbRank}
                        onChange={e => setManualGmbRank(e.target.value)}
                        placeholder="e.g., 3"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', display: 'block' }}>
                        Organic Search Rank (1–10)
                      </label>
                      <input
                        className="input-field"
                        type="number"
                        min="1" max="20"
                        value={manualOrgRank}
                        onChange={e => setManualOrgRank(e.target.value)}
                        placeholder="e.g., 7"
                      />
                    </div>
                  </div>
                </div>

                {/* Conversion Inputs */}
                <div className="card step-card" style={{ gridColumn: '1 / -1' }}>
                  <div className="section-label">Conversion & Sales Assumptions</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '16px' }}>
                    {[
                      { label: 'Website Conv. Rate', value: conversionRate, setter: setConversionRate, tip: '% visitors → leads', placeholder: '0.08' },
                      { label: 'GMB Conv. Rate', value: gmbConvRate, setter: setGmbConvRate, tip: '% GMB clicks → leads', placeholder: '0.20' },
                      { label: 'Lead Close Rate', value: closeRate, setter: setCloseRate, tip: '% leads → orders', placeholder: '0.60' },
                      { label: 'Avg Order Value', value: avgOrder, setter: setAvgOrder, tip: '$ per completed order', placeholder: '450' },
                    ].map(({ label, value, setter, tip, placeholder }) => (
                      <div key={label}>
                        <label style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', display: 'block' }}>{label}</label>
                        <input
                          className="input-field"
                          type="number"
                          step="0.01"
                          value={value}
                          onChange={e => setter(e.target.value)}
                          placeholder={placeholder}
                        />
                        <div style={{ fontSize: '10px', color: '#475569', marginTop: '4px' }}>{tip}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px', padding: '12px 16px', color: '#ef4444', fontSize: '13px',
                  maxWidth: '900px', margin: '16px auto 0',
                }}>
                  ⚠ {error}
                </div>
              )}

              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <button
                  className="btn-primary"
                  onClick={runResearch}
                  disabled={!businessName || !city || !state}
                  style={{ fontSize: '14px', padding: '16px 48px' }}
                >
                  🔍 START RESEARCH
                </button>
                <p style={{ fontSize: '11px', color: '#475569', marginTop: '12px' }}>
                  Pulls from US Census Bureau API · Google Places · CTR benchmarks
                </p>
              </div>
            </div>
          )}

          {/* RESEARCHING STEP */}
          {(step === 'researching' || step === 'generating') && (
            <div style={{ maxWidth: '700px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ 
                  width: '64px', height: '64px', borderRadius: '50%',
                  border: '3px solid #1e2d45', borderTop: '3px solid #00d4ff',
                  margin: '0 auto 20px',
                  animation: 'spin-slow 0.8s linear infinite'
                }} />
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>
                  {step === 'researching' ? 'Researching Company...' : 'Generating Spreadsheet...'}
                </h2>
                <p style={{ color: '#64748b', fontSize: '14px' }}>
                  {step === 'researching' 
                    ? 'Fetching population data, rankings, and search volumes'
                    : 'Building your customized Excel workbook'
                  }
                </p>
              </div>

              {/* Terminal log */}
              <div style={{
                background: '#060a12', border: '1px solid #1e2d45', borderRadius: '12px',
                padding: '20px', fontFamily: 'Space Mono, monospace', fontSize: '12px',
                maxHeight: '360px', overflowY: 'auto',
              }}>
                <div style={{ color: '#00d4ff', marginBottom: '12px', fontSize: '11px', letterSpacing: '0.1em' }}>
                  ▸ RESEARCH ENGINE v2.0
                </div>
                {logs.map((log, i) => (
                  <div key={i} style={{ 
                    display: 'flex', gap: '12px', marginBottom: '6px',
                    color: log.type === 'success' ? '#10b981' : log.type === 'error' ? '#ef4444' : log.type === 'warning' ? '#f59e0b' : '#94a3b8'
                  }}>
                    <span style={{ color: '#475569', flexShrink: 0 }}>{log.time}</span>
                    <span>{log.message}</span>
                  </div>
                ))}
                {logs.length > 0 && <span className="cursor" style={{ color: '#00d4ff' }} />}
              </div>
            </div>
          )}

          {/* REVIEW STEP */}
          {(step === 'review' || step === 'done') && result && projData && (
            <div>
              {/* Company header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
                <div>
                  <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>
                    {result.company.businessName}
                  </h2>
                  <div style={{ color: '#64748b', fontSize: '14px', display: 'flex', gap: '16px' }}>
                    <span>📍 {result.company.city}, {result.company.state}</span>
                    {result.company.rating > 0 && <span>⭐ {result.company.rating} ({result.company.reviewCount} reviews)</span>}
                    <span>🔍 Research: {new Date(result.researchedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn-secondary" onClick={() => { setStep('input'); setResult(null); }}>
                    ← NEW SEARCH
                  </button>
                  {step !== 'done' && (
                    <button className="btn-primary" onClick={generateSpreadsheet}>
                      📊 GENERATE EXCEL
                    </button>
                  )}
                  {step === 'done' && (
                    <button className="btn-primary" onClick={generateSpreadsheet} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                      ⬇ DOWNLOAD AGAIN
                    </button>
                  )}
                </div>
              </div>

              {step === 'done' && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '12px', padding: '16px 24px', marginBottom: '24px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  <span style={{ fontSize: '24px' }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 700, color: '#10b981' }}>Spreadsheet Downloaded!</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Your custom Excel workbook has been generated with all 7 sheets pre-populated.</div>
                  </div>
                </div>
              )}

              {/* KPI Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                  { label: 'Service Area Pop.', value: projData.population.toLocaleString(), sub: `${result.perspective}-level`, color: '#00d4ff' },
                  { label: 'Monthly Searches', value: projData.monthlySearches.toLocaleString(), sub: `${projData.searchesPer1000.toFixed(2)}/1k people`, color: '#00d4ff' },
                  { label: 'Target Monthly Rev.', value: `$${projData.targetMonthlyRevenue.toLocaleString()}`, sub: 'at #1 rankings', color: '#10b981' },
                  { label: 'Annual Rev. Increase', value: `$${projData.annualIncrease.toLocaleString()}`, sub: 'vs current rank', color: '#ff6b35' },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="metric-card" style={{ borderTop: `2px solid ${color}` }}>
                    <div className="value" style={{ color }}>{value}</div>
                    <div className="label">{label}</div>
                    <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>{sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                {/* Perspective Analysis */}
                <div className="card">
                  <div className="section-label">Targeting Perspective</div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '16px', marginBottom: '16px' }}>
                    {['city', 'county'].map(p => (
                      <div key={p} style={{
                        flex: 1, padding: '12px', borderRadius: '8px', textAlign: 'center',
                        background: result.perspective === p ? 'rgba(0, 212, 255, 0.1)' : 'rgba(30, 45, 69, 0.5)',
                        border: `1px solid ${result.perspective === p ? '#00d4ff' : '#1e2d45'}`,
                      }}>
                        <div className="mono" style={{ fontSize: '11px', color: result.perspective === p ? '#00d4ff' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          {p}
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: result.perspective === p ? '#00d4ff' : '#64748b', fontFamily: 'Space Mono' }}>
                          {p === 'city' ? result.cityPerspectiveScore : result.countyPerspectiveScore}
                        </div>
                        <div style={{ fontSize: '10px', color: '#475569' }}>score</div>
                        {result.perspective === p && (
                          <div style={{ marginTop: '6px' }}>
                            <span className="badge badge-success">RECOMMENDED</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
                    {result.perspectiveRationale}
                  </p>
                </div>

                {/* Rankings */}
                <div className="card">
                  <div className="section-label">Current vs Target Rankings</div>
                  <div style={{ marginTop: '16px' }}>
                    {[
                      { label: 'Google Business Profile (Map Pack)', current: projData.currentGmbRank, target: projData.targetGmbRank },
                      { label: 'Organic Search', current: projData.currentOrgRank, target: projData.targetOrgRank },
                    ].map(({ label, current, target }) => (
                      <div key={label} style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>{label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className={`rank-box ${current <= 3 ? `rank-${current}` : 'rank-other'}`}>
                            #{current}
                          </div>
                          <div style={{ color: '#475569', fontSize: '16px' }}>→</div>
                          <div className="rank-box rank-1">
                            #{target}
                          </div>
                          <div style={{ fontSize: '11px', color: '#10b981', marginLeft: 'auto', fontFamily: 'Space Mono' }}>
                            +{current - target} positions
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid #1e2d45', paddingTop: '12px', marginTop: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Current Monthly</div>
                        <div style={{ fontFamily: 'Space Mono', fontWeight: 700, color: '#e2e8f0' }}>${projData.currentMonthlyRevenue.toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Target Monthly</div>
                        <div style={{ fontFamily: 'Space Mono', fontWeight: 700, color: '#10b981' }}>${projData.targetMonthlyRevenue.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                {/* Cities table */}
                <div className="card">
                  <div className="section-label">City-Level Population Analysis</div>
                  <div style={{ overflowX: 'auto', marginTop: '12px' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>City</th>
                          <th>Population</th>
                          <th>Est. Searches/mo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[result.primaryCity, ...result.nearbyCities].slice(0, 8).map((city, i) => (
                          <tr key={city.name}>
                            <td>
                              {i === 0 && <span style={{ color: '#ffd700', marginRight: '6px', fontSize: '10px' }}>★</span>}
                              {city.name}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'Space Mono', fontSize: '12px' }}>
                              {city.population.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'Space Mono', fontSize: '12px', color: '#00d4ff' }}>
                              {Math.round((city.population / 1000) * projData.searchesPer1000).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Counties table */}
                <div className="card">
                  <div className="section-label">County-Level Population Analysis</div>
                  <div style={{ overflowX: 'auto', marginTop: '12px' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>County</th>
                          <th>Population</th>
                          <th>Est. Searches/mo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[result.primaryCounty, ...result.nearbyCounties].map((county, i) => (
                          <tr key={county.name}>
                            <td>
                              {i === 0 && <span style={{ color: '#ff6b35', marginRight: '6px', fontSize: '10px' }}>★</span>}
                              {county.name}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'Space Mono', fontSize: '12px' }}>
                              {county.population.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'Space Mono', fontSize: '12px', color: '#ff6b35' }}>
                              {Math.round((county.population / 1000) * projData.searchesPer1000).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Phased projections */}
              <div className="card" style={{ marginBottom: '24px' }}>
                <div className="section-label">6-Month Revenue Ramp Projection</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginTop: '16px' }}>
                  {buildPhasedProjections(projData.targetMonthlyRevenue, projData.currentMonthlyRevenue).map((phase, i) => {
                    const labels = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'];
                    const pct = Math.round(phase.ramp * 100);
                    return (
                      <div key={i} style={{
                        background: '#0d1b2e', borderRadius: '8px', padding: '12px',
                        border: '1px solid #1e2d45', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontFamily: 'Space Mono' }}>
                          {labels[i]}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: i < 2 ? '#64748b' : i < 4 ? '#f59e0b' : '#10b981', fontFamily: 'Space Mono' }}>
                          ${phase.monthly.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>{pct}% ramp</div>
                        <div style={{
                          height: '3px', background: '#1e2d45', borderRadius: '2px', marginTop: '8px',
                        }}>
                          <div style={{
                            height: '100%', width: `${pct}%`,
                            background: i < 2 ? '#64748b' : i < 4 ? '#f59e0b' : '#10b981',
                            borderRadius: '2px', transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Generate button */}
              {step !== 'done' && (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ marginBottom: '8px', fontSize: '13px', color: '#64748b' }}>
                    Ready to generate your customized 7-sheet Excel workbook?
                  </div>
                  <button className="btn-primary" onClick={generateSpreadsheet} style={{ fontSize: '15px', padding: '18px 56px' }}>
                    📊 GENERATE EXCEL SPREADSHEET
                  </button>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '10px' }}>
                    Includes: Summary Dashboard · Client Inputs · Market Research · SEO Model · Multi-City · Phased Projections · CTR Tables
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid #1e2d45', padding: '20px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: '#334155', fontFamily: 'Space Mono, monospace' }}>
            CTR data: First Page Sage 2026 · Population: US Census Bureau ACS 2022 · Search volume: Google Keyword Planner estimates
          </p>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease forwards;
        }
      `}</style>
    </>
  );
}
