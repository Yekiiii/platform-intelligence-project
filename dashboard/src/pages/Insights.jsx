import { useState } from 'react';
import { analytics, llm } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Insights() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [insightType, setInsightType] = useState('executive');
  const [meta, setMeta] = useState(null);

  const insightTypes = [
    { id: 'executive', name: 'Executive Summary', description: 'High-level KPIs and strategic overview' },
    { id: 'growth', name: 'Growth Analysis', description: 'User acquisition and conversion trends' },
    { id: 'churn', name: 'Churn Insights', description: 'Retention risks and drop-off patterns' },
    { id: 'features', name: 'Feature Adoption', description: 'Feature usage and prioritization' },
  ];

  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    setSummary(null);
    setMeta(null);
    
    try {
      // Fetch Context Data - org_id comes from JWT
      // REFACTORED: Analytics context is now fetched by the backend to avoid payload limits
      /* 
      const [dauRes, revRes, eventsRes] = await Promise.all([
          analytics.getDAU({ from: '2026-01-01', to: '2026-04-01' }),
          analytics.getRevenue({ from: '2026-01-01', to: '2026-04-01' }),
          analytics.getEvents({ limit: 100 })
      ]);

      const payload = {
        dau: dauRes.data.data,
        revenue: revRes.data.data,
        events: eventsRes.data.data
      };
      */
      
      // Call LLM with selected insight type - Backend will fetch context
      const llmRes = await llm.getInsight(insightType, {});
      setSummary(llmRes.data.data.summary);
      setMeta(llmRes.data.data.meta);

    } catch (err) {
      console.error(err);
      setError("Failed to generate insights. The AI service might be disabled, overloaded, or the context payload is too large.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow sm:rounded-lg p-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">AI Analytics Insights</h1>
          <p className="mt-2 text-sm text-gray-500">
            Generate AI-powered analysis for <strong>{user?.org_name || user?.org_id}</strong> using Google Gemini.
          </p>
          
          {/* Insight Type Selector */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Insight Type</label>
            <div className="grid grid-cols-2 gap-3">
              {insightTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setInsightType(type.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    insightType === type.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="block font-medium text-gray-900">{type.name}</span>
                  <span className="block text-xs text-gray-500">{type.description}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="mt-5">
            <button
              onClick={generateInsights}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing Data...
                </>
              ) : 'Generate Insights'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Generation Failed</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {summary && (
        <div className="bg-white shadow sm:rounded-lg overflow-hidden border border-indigo-100">
          <div className="px-4 py-5 sm:px-6 bg-gradient-to-r from-indigo-50 to-white border-b border-gray-100">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              ✨ {insightTypes.find(t => t.id === insightType)?.name || 'Gemini Insights'}
            </h3>
            {meta && (
              <p className="text-xs text-gray-500 mt-1">
                Model: {meta.model} • Latency: {meta.latency_ms}ms • Tokens: {meta.tokens_input + meta.tokens_output}
              </p>
            )}
          </div>
          <div className="px-4 py-5 sm:p-6 prose prose-indigo max-w-none text-gray-700">
             <div className="whitespace-pre-wrap">{summary}</div>
          </div>
          <div className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-100">
             <p className="text-xs text-gray-500 italic">
               Disclaimer: AI-generated insights may be approximate and should be verified against raw analytics data. Do not use for financial auditing.
             </p>
          </div>
        </div>
      )}
    </div>
  )
}
