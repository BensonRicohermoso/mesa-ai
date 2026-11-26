import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import {
  postAiBriefing,
  postAiForecast,
  postAiQna,
} from '../../../shared/api/aiApi.js'
import { formatPhp, formatPct } from '../utils/analyticsFormatters.js'

const STARTER_PROMPTS = [
  'Why did gross margin change in this period?',
  'Which menu items should we promote right now?',
  'How are cancellations and kitchen prep times trending?',
]

const MAX_QUESTION_LEN = 500

export function AiAdvisor({
  filter,
  refreshNonce = 0,
  onSwitchToPreview,
  onLoadingChange,
}) {
  const [briefing, setBriefing] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [localRetryCount, setLocalRetryCount] = useState(0)

  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [qnaLoading, setQnaLoading] = useState(false)
  const [qnaError, setQnaError] = useState(null)

  const buildPayload = useCallback(
    (extra = {}) => ({
      from: filter.from,
      to: filter.to,
      tz: 'Asia/Manila',
      compare: Boolean(filter.compare),
      categoryId: filter.categoryId,
      paymentMethod: filter.paymentMethod,
      sourceMode: filter.sourceMode,
      ...extra,
    }),
    [filter],
  )

  const fetchInsights = useCallback(
    async (signal, forceRefresh = false) => {
      setLoading(true)
      onLoadingChange?.(true)
      setError(null)

      try {
        const payload = buildPayload({ forceRefresh })
        const [briefingRes, forecastRes] = await Promise.all([
          postAiBriefing(payload, { signal }),
          postAiForecast({ ...payload, horizonDays: 7 }, { signal }),
        ])
        if (signal.aborted) return
        setBriefing(briefingRes)
        setForecast(forecastRes)
      } catch (err) {
        if (err.name === 'AbortError' || signal.aborted) return
        const status = err.status || err.statusCode
        if (status === 401 || status === 403) {
          setError({
            type: 'auth',
            message: 'Admin authentication required to access AI Advisor.',
          })
        } else if (status === 501 || status === 404) {
          setError({
            type: 'not-ready',
            message:
              'Live analytics are not yet active. Switch to Preview mode to test AI Advisor with sample fixtures.',
          })
        } else {
          setError({
            type: 'server',
            message: err.message || 'Failed to load AI insights.',
          })
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false)
          onLoadingChange?.(false)
        }
      }
    },
    [buildPayload, onLoadingChange],
  )

  useEffect(() => {
    const ac = new AbortController()
    const isManualRefresh = refreshNonce > 0 || localRetryCount > 0
    // oxlint-disable-next-line react/set-state-in-effect -- async fetch is the standard pattern
    fetchInsights(ac.signal, isManualRefresh)
    return () => ac.abort()
  }, [fetchInsights, refreshNonce, localRetryCount])

  const handleAsk = async (promptText) => {
    const trimmed = (promptText ?? question).trim()
    if (!trimmed || qnaLoading) return
    if (trimmed.length > MAX_QUESTION_LEN) {
      setQnaError(`Question must be at most ${MAX_QUESTION_LEN} characters.`)
      return
    }

    setQnaError(null)
    setQnaLoading(true)
    const nextHistory = messages.slice(-6).map(({ role, content }) => ({ role, content }))
    const userMsg = { role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMsg])
    if (promptText === undefined) setQuestion('')

    try {
      const res = await postAiQna(
        buildPayload({ question: trimmed, history: nextHistory }),
      )
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.answer,
          source: res.meta?.source || 'fallback',
        },
      ])
    } catch (err) {
      setQnaError(err.message || 'Unable to answer question right now.')
    } finally {
      setQnaLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-skeleton">
        <div className="kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="kpi-cell">
              <div className="skeleton-block skeleton-block--sm" />
              <div className="skeleton-block skeleton-block--lg" />
            </div>
          ))}
        </div>
        <div className="skeleton-block skeleton-block--chart" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-error-state">
        <div className="mgmt-error">{error.message}</div>
        <div className="dashboard-error-actions">
          {error.type !== 'auth' && (
            <button
              type="button"
              className="action-pill"
              onClick={() => setLocalRetryCount((c) => c + 1)}
            >
              Retry Live API
            </button>
          )}
          {error.type === 'not-ready' && onSwitchToPreview && (
            <button
              type="button"
              className="action-pill action-pill--solid"
              onClick={onSwitchToPreview}
            >
              Preview With Sample Fixtures
            </button>
          )}
        </div>
      </div>
    )
  }

  const kpis = briefing?.facts?.kpis
  const forecastFacts = forecast?.facts?.forecast
  const sourceBadge =
    briefing?.meta?.source === 'gemini' ? 'Gemini Live' : 'Fallback Mode'

  return (
    <div className="ai-advisor">
      {/* ── Verified Metrics Strip ── */}
      <div className="ai-section-head">
        <div>
          <span className="editorial-eyebrow">Verified Backend Metrics</span>
          <h2 className="ai-section-title">Executive Snapshot</h2>
        </div>
        <span
          className={`ai-badge ${briefing?.meta?.source === 'gemini' ? 'ai-badge--live' : ''}`}
          title={briefing?.meta?.fallbackReason ? `Fallback reason: ${briefing.meta.fallbackReason}` : undefined}
        >
          {sourceBadge}
        </span>
      </div>

      {kpis && (
        <div className="kpi-grid">
          <div className="kpi-cell">
            <span className="kpi-label">Gross Sales</span>
            <strong className="kpi-value">{formatPhp(kpis.grossSales)}</strong>
          </div>
          <div className="kpi-cell">
            <span className="kpi-label">Gross Profit</span>
            <strong className="kpi-value">{formatPhp(kpis.grossProfit)}</strong>
          </div>
          <div className="kpi-cell">
            <span className="kpi-label">Gross Margin</span>
            <strong className="kpi-value">{formatPct(kpis.grossMarginPct)}</strong>
          </div>
          <div className="kpi-cell">
            <span className="kpi-label">Paid Orders</span>
            <strong className="kpi-value">{kpis.paidOrdersCount}</strong>
          </div>
        </div>
      )}

      {/* ── Briefing + Forecast Grid ── */}
      <div className="ai-grid">
        <section className="ai-card">
          <div className="ai-card-header">
            <span className="editorial-eyebrow">AI Interpretation</span>
            <h3>Daily Briefing &amp; Alerts</h3>
          </div>
          <p className="ai-summary-text">{briefing?.interpretation?.summary}</p>

          {briefing?.interpretation?.alerts?.length > 0 && (
            <div className="ai-list-block">
              <span className="ai-list-label">Alerts</span>
              <ul className="ai-list">
                {briefing.interpretation.alerts.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {briefing?.interpretation?.watchItems?.length > 0 && (
            <div className="ai-list-block">
              <span className="ai-list-label">Watch Items</span>
              <ul className="ai-list">
                {briefing.interpretation.watchItems.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="ai-card">
          <div className="ai-card-header">
            <span className="editorial-eyebrow">
              {forecastFacts?.horizonDays || 7}-Day Baseline &amp; AI Advice (Read-Only)
            </span>
            <h3>Forecast &amp; Recommendations</h3>
          </div>

          {forecastFacts && (
            <div className="ai-forecast-strip">
              <div>
                <span className="kpi-label">Expected Orders</span>
                <strong>{forecastFacts.expectedOrders}</strong>
              </div>
              <div>
                <span className="kpi-label">Projected Sales</span>
                <strong>{formatPhp(forecastFacts.expectedGrossSales)}</strong>
              </div>
              <div>
                <span className="kpi-label">Projected Gross Profit</span>
                <strong>{formatPhp(forecastFacts.expectedGrossProfit)}</strong>
              </div>
            </div>
          )}

          <p className="ai-summary-text">{forecast?.interpretation?.outlookSummary}</p>
          {forecast?.interpretation?.peakHourAdvice && (
            <p className="ai-muted-note">{forecast.interpretation.peakHourAdvice}</p>
          )}

          {forecast?.interpretation?.recommendations?.length > 0 && (
            <div className="ai-list-block">
              <span className="ai-list-label">Recommended Actions</span>
              <ul className="ai-list">
                {forecast.interpretation.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* ── Ask MESA AI (Q&A) ── */}
      <section className="ai-card">
        <div className="ai-card-header">
          <span className="editorial-eyebrow">Owner Q&amp;A &bull; Bounded Context</span>
          <h3>Ask MESA AI</h3>
        </div>

        <div className="ai-starter-chips">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="action-pill"
              disabled={qnaLoading}
              onClick={() => handleAsk(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>

        {messages.length > 0 && (
          <div className="ai-chat-thread">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`ai-chat-msg ${msg.role === 'user' ? 'ai-chat-msg--user' : 'ai-chat-msg--assistant'}`}
              >
                <span className="ai-chat-role">
                  {msg.role === 'user' ? 'Owner' : `MESA AI (${msg.source || 'verified'})`}
                </span>
                <p>{msg.content}</p>
              </div>
            ))}
          </div>
        )}

        {qnaError && <div className="mgmt-error">{qnaError}</div>}

        <form
          className="ai-chat-form"
          onSubmit={(e) => {
            e.preventDefault()
            handleAsk()
          }}
        >
          <input
            type="text"
            className="ai-chat-input"
            value={question}
            maxLength={MAX_QUESTION_LEN}
            placeholder="Ask about gross profit, gross margin, peak hours, or menu performance..."
            onChange={(e) => setQuestion(e.target.value)}
            disabled={qnaLoading}
          />
          <button
            type="submit"
            className="action-pill action-pill--solid"
            disabled={qnaLoading || !question.trim()}
          >
            {qnaLoading ? 'Thinking...' : 'Ask AI'}
          </button>
        </form>
      </section>
    </div>
  )
}

AiAdvisor.propTypes = {
  filter: PropTypes.shape({
    from: PropTypes.string.isRequired,
    to: PropTypes.string.isRequired,
    compare: PropTypes.bool,
    categoryId: PropTypes.string,
    paymentMethod: PropTypes.string,
    sourceMode: PropTypes.string.isRequired,
  }).isRequired,
  refreshNonce: PropTypes.number,
  onSwitchToPreview: PropTypes.func,
  onLoadingChange: PropTypes.func,
}
