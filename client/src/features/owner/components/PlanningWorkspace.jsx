/* oxlint-disable react/set-state-in-effect -- selected recipe is loaded from the API after menu selection. */
import { useCallback, useEffect, useState } from 'react'
import { formatPhp } from '../utils/analyticsFormatters.js'
import { getMenuItems } from '../../../shared/api/menuApi.js'
import { addAdjustment, createIngredient, createSupplier, getAdjustments, getIngredients, getRecipe, getSuppliers, putRecipe, updateIngredient, updateSupplier } from '../../../shared/api/inventoryApi.js'
import { createPlanningEvent, deletePlanningEvent, getPlanningEvents, updatePlanningEvent } from '../../../shared/api/advisorApi.js'
import { acknowledgePlanningRecommendation, getPlanningAcknowledgements, postAiPlanning } from '../../../shared/api/aiApi.js'
import { loadStoredSession } from '../../auth/authClient.js'

const EMPTY_INGREDIENT = { name: '', baseUnit: 'g', onHandQuantity: 0, parLevelQuantity: 0, unitCost: 0, leadTimeDays: 0, supplierId: '' }
const EMPTY_EVENT = { title: '', eventType: 'promotion', startsOn: '', endsOn: '', demandAdjustmentPct: 10, note: '' }

function manilaDate(offset = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = (type) => parts.find((value) => value.type === type)?.value
  const date = new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}
function csvDownload(type, date) {
  const session = loadStoredSession()
  return fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ai/planning/export?type=${type}&date=${date}`, { headers: { Authorization: `Bearer ${session?.accessToken || ''}` } })
    .then(async (res) => { if (!res.ok) throw new Error('Could not export this list.'); const blob = await res.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${type}-${date}.csv`; anchor.click(); URL.revokeObjectURL(url) })
}

export function PlanningWorkspace() {
  const [view, setView] = useState('planning')
  const [setupView, setSetupView] = useState('ingredients')
  const [horizon, setHorizon] = useState(30)
  const [planning, setPlanning] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [ingredients, setIngredients] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [events, setEvents] = useState([])
  const [ingredientForm, setIngredientForm] = useState(EMPTY_INGREDIENT)
  const [supplierName, setSupplierName] = useState('')
  const [eventForm, setEventForm] = useState({ ...EMPTY_EVENT, startsOn: manilaDate(1), endsOn: manilaDate(1) })
  const [selectedMenuId, setSelectedMenuId] = useState('')
  const [recipe, setRecipe] = useState([])
  const [prepDate, setPrepDate] = useState(manilaDate())
  const [acknowledged, setAcknowledged] = useState(new Set())
  const [ingredientQuery, setIngredientQuery] = useState('')
  const [editingIngredient, setEditingIngredient] = useState(null)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [adjustment, setAdjustment] = useState(null)
  const [adjustmentForm, setAdjustmentForm] = useState({ reason: 'physical_count', countedQuantity: '', quantityDelta: '', note: '' })
  const [audit, setAudit] = useState(null)

  const loadSetup = useCallback(async () => {
    const [ingredientRes, supplierRes, menuRes] = await Promise.all([getIngredients(true), getSuppliers(true), getMenuItems({ includeInactive: false })])
    setIngredients(ingredientRes.ingredients || []); setSuppliers(supplierRes.suppliers || []); setMenuItems(menuRes.items || [])
  }, [])
  const loadPlanning = useCallback(async (forceRefresh = false) => {
    setLoading(true); setError('')
    try { const res = await postAiPlanning({ horizonDays: horizon, tz: 'Asia/Manila', sourceMode: 'live', forceRefresh }); setPlanning(res); setPrepDate((current) => res.facts.dailyPrep.some((day) => day.date === current) ? current : res.facts.dailyPrep[0]?.date || manilaDate()) }
    catch (err) { setError(err.message || 'Planning could not be loaded.') }
    finally { setLoading(false) }
  }, [horizon])
  useEffect(() => { loadSetup().catch((err) => setError(err.message)); loadPlanning() }, [loadSetup, loadPlanning])
  // oxlint-disable-next-line react/set-state-in-effect -- fetch completion synchronizes the selected recipe.
  useEffect(() => { if (!selectedMenuId) return; getRecipe(selectedMenuId).then((res) => setRecipe(res.items.map((item) => ({ ingredientId: item.ingredientId, quantityPerServing: item.quantityPerServing })))).catch((err) => setError(err.message)) }, [selectedMenuId])
  useEffect(() => { getPlanningEvents(manilaDate(), manilaDate(90)).then((res) => setEvents(res.events || [])).catch(() => {}) }, [])
  useEffect(() => { getPlanningAcknowledgements().then((res) => setAcknowledged(new Set((res.acknowledgements || []).map((row) => row.recommendationKey))).catch(() => {}) }, [])
  const selectedPrep = planning?.facts?.dailyPrep.find((day) => day.date === prepDate)
  const warnings = planning?.facts?.setupWarnings || []
  const actions = planning?.interpretation?.prioritizedActions || []
  const saveIngredient = async (event) => { event.preventDefault(); try { await createIngredient({ ...ingredientForm, supplierId: ingredientForm.supplierId || null, onHandQuantity: Number(ingredientForm.onHandQuantity), parLevelQuantity: Number(ingredientForm.parLevelQuantity), unitCost: Number(ingredientForm.unitCost), leadTimeDays: Number(ingredientForm.leadTimeDays) }); setIngredientForm(EMPTY_INGREDIENT); await loadSetup(); setNotice('Ingredient saved.'); } catch (err) { setError(err.message) } }
  const openAdjustment = (ingredient) => { setAdjustment(ingredient); setAdjustmentForm({ reason: 'physical_count', countedQuantity: ingredient.stock?.calculatedOnHand ?? ingredient.onHandQuantity, quantityDelta: '', note: '' }) }
  const saveAdjustment = async (event) => { event.preventDefault(); if (!adjustment) return; try { const payload = adjustmentForm.reason === 'physical_count' ? { reason: 'physical_count', countedQuantity: Number(adjustmentForm.countedQuantity), note: adjustmentForm.note } : { reason: adjustmentForm.reason, quantityDelta: Number(adjustmentForm.quantityDelta), note: adjustmentForm.note }; await addAdjustment(adjustment.id, payload); setAdjustment(null); await loadSetup(); await loadPlanning(true); setNotice('Inventory adjustment recorded.'); } catch (err) { setError(err.message) } }
  const saveRecipe = async () => { try { await putRecipe(selectedMenuId, recipe.filter((line) => line.ingredientId && Number(line.quantityPerServing) > 0)); setNotice('Recipe saved.'); await loadPlanning(true) } catch (err) { setError(err.message) } }
  const saveEvent = async (event) => { event.preventDefault(); try { const payload = { ...eventForm, demandAdjustmentPct: Number(eventForm.eventType === 'closure' ? -100 : eventForm.demandAdjustmentPct) }; if (editingEvent) await updatePlanningEvent(editingEvent.id, payload); else await createPlanningEvent(payload); const res = await getPlanningEvents(manilaDate(), manilaDate(90)); setEvents(res.events || []); setEditingEvent(null); await loadPlanning(true); setNotice('Planning event saved.'); } catch (err) { setError(err.message) } }
  const acknowledge = async (action) => { try { await acknowledgePlanningRecommendation(action.recommendationKey); setAcknowledged((current) => new Set(current).add(action.recommendationKey)); } catch (err) { setError(err.message) } }
  const performance = planning?.facts?.forecast
  const configWarnings = warnings.slice(0, 8)
  const filteredIngredients = ingredients.filter((item) => item.name.toLowerCase().includes(ingredientQuery.toLowerCase()))

  return <div className="planning-workspace">
    <div className="planning-nav no-print"><button className={view === 'planning' ? 'planning-nav__active' : ''} onClick={() => setView('planning')}>Planning</button><button className={view === 'setup' ? 'planning-nav__active' : ''} onClick={() => setView('setup')}>Inventory setup</button></div>
    {error && <div className="mgmt-error">{error}</div>}{notice && <div className="mgmt-success">{notice}</div>}
    {view === 'setup' ? <section className="planning-setup">
      <div className="planning-subnav"><button onClick={() => setSetupView('ingredients')} className={setupView === 'ingredients' ? 'is-active' : ''}>Ingredients</button><button onClick={() => setSetupView('suppliers')} className={setupView === 'suppliers' ? 'is-active' : ''}>Suppliers</button><button onClick={() => setSetupView('recipes')} className={setupView === 'recipes' ? 'is-active' : ''}>Recipes</button><button onClick={() => setSetupView('events')} className={setupView === 'events' ? 'is-active' : ''}>Events</button></div>
      {setupView === 'ingredients' && <><form className="planning-form" onSubmit={saveIngredient}><h3>Add ingredient</h3><input required placeholder="Ingredient name" value={ingredientForm.name} onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })}/><select value={ingredientForm.baseUnit} onChange={(e) => setIngredientForm({ ...ingredientForm, baseUnit: e.target.value })}>{['g','ml','piece','pack','portion'].map((unit) => <option key={unit}>{unit}</option>)}</select><input type="number" min="0" placeholder="Opening quantity" value={ingredientForm.onHandQuantity} onChange={(e) => setIngredientForm({ ...ingredientForm, onHandQuantity: e.target.value })}/><input type="number" min="0" placeholder="Par level" value={ingredientForm.parLevelQuantity} onChange={(e) => setIngredientForm({ ...ingredientForm, parLevelQuantity: e.target.value })}/><input type="number" min="0" placeholder="Unit cost" value={ingredientForm.unitCost} onChange={(e) => setIngredientForm({ ...ingredientForm, unitCost: e.target.value })}/><input type="number" min="0" placeholder="Lead time days" value={ingredientForm.leadTimeDays} onChange={(e) => setIngredientForm({ ...ingredientForm, leadTimeDays: e.target.value })}/><select value={ingredientForm.supplierId} onChange={(e) => setIngredientForm({ ...ingredientForm, supplierId: e.target.value })}><option value="">Supplier not set</option>{suppliers.filter((s) => s.isActive).map((s) => <option value={s.id} key={s.id}>{s.name}</option>)}</select><button className="action-pill action-pill--solid">Save ingredient</button></form><div className="planning-row-list">{ingredients.map((item) => <article key={item.id} className="planning-row"><div><strong>{item.name}</strong><span>{item.stock?.calculatedOnHand ?? 0} {item.baseUnit} on hand · par {item.parLevelQuantity}</span></div><button className="action-pill" onClick={() => saveCount(item)}>Record count</button></article>)}</div></>}
      {setupView === 'suppliers' && <><form className="planning-form planning-form--compact" onSubmit={async (e) => { e.preventDefault(); try { await createSupplier({ name: supplierName }); setSupplierName(''); await loadSetup(); setNotice('Supplier saved.'); } catch (err) { setError(err.message) } }}><h3>Add supplier</h3><input required placeholder="Supplier name" value={supplierName} onChange={(e) => setSupplierName(e.target.value)}/><button className="action-pill action-pill--solid">Save supplier</button></form><div className="planning-row-list">{suppliers.map((s) => <article key={s.id} className="planning-row"><strong>{s.name}</strong><span>{s.isActive ? 'Active' : 'Inactive'}</span></article>)}</div></>}
      {setupView === 'recipes' && <div className="planning-form"><h3>Menu recipe</h3><select value={selectedMenuId} onChange={(e) => setSelectedMenuId(e.target.value)}><option value="">Choose a menu item</option>{menuItems.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>{selectedMenuId && <>{recipe.map((line, index) => <div className="recipe-line" key={index}><select value={line.ingredientId} onChange={(e) => setRecipe(recipe.map((current, i) => i === index ? { ...current, ingredientId: e.target.value } : current))}><option value="">Ingredient</option>{ingredients.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name} ({item.baseUnit})</option>)}</select><input type="number" min="0.001" step="0.001" value={line.quantityPerServing} onChange={(e) => setRecipe(recipe.map((current, i) => i === index ? { ...current, quantityPerServing: e.target.value } : current))}/><button onClick={() => setRecipe(recipe.filter((_, i) => i !== index))}>Remove</button></div>)}<button className="action-pill" onClick={() => setRecipe([...recipe, { ingredientId: '', quantityPerServing: '' }])}>Add ingredient</button><button className="action-pill action-pill--solid" onClick={saveRecipe}>Save recipe</button></>}</div>}
      {setupView === 'events' && <><form className="planning-form" onSubmit={saveEvent}><h3>Demand event</h3><input required placeholder="Event title" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}/><select value={eventForm.eventType} onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value, demandAdjustmentPct: e.target.value === 'closure' ? -100 : eventForm.demandAdjustmentPct })}>{['promotion','holiday','closure','large_order'].map((type) => <option key={type}>{type}</option>)}</select><input type="date" value={eventForm.startsOn} onChange={(e) => setEventForm({ ...eventForm, startsOn: e.target.value })}/><input type="date" value={eventForm.endsOn} onChange={(e) => setEventForm({ ...eventForm, endsOn: e.target.value })}/><input type="number" disabled={eventForm.eventType === 'closure'} min="-100" max="500" value={eventForm.eventType === 'closure' ? -100 : eventForm.demandAdjustmentPct} onChange={(e) => setEventForm({ ...eventForm, demandAdjustmentPct: e.target.value })}/><button className="action-pill action-pill--solid">Save event</button></form><div className="planning-row-list">{events.map((event) => <article className="planning-row" key={event.id}><div><strong>{event.title}</strong><span>{event.startsOn} to {event.endsOn} · {event.demandAdjustmentPct > 0 ? '+' : ''}{event.demandAdjustmentPct}%</span></div><button className="quiet-link" onClick={async () => { await deletePlanningEvent(event.id); setEvents(events.filter((item) => item.id !== event.id)); await loadPlanning(true) }}>Remove</button></article>)}</div></>}
    </section> : <section className="planning-board">
      <header className="planning-hero"><div><span className="editorial-eyebrow">Verified calculation</span><h2>Service planning</h2><p>{planning?.meta?.generatedAt ? `Generated ${new Date(planning.meta.generatedAt).toLocaleString()}` : 'Preparing your operational brief.'}</p></div><div className="planning-controls"><div className="planning-segment">{[30,60,90].map((days) => <button key={days} onClick={() => setHorizon(days)} className={horizon === days ? 'is-active' : ''}>{days} days</button>)}</div><button className="action-pill" onClick={() => loadPlanning(true)}>Refresh</button></div></header>
      {loading ? <div className="mgmt-empty">Building verified planning calculations…</div> : <><div className="planning-metrics"><Metric label="Expected orders" value={performance?.expectedOrders}/><Metric label="Gross sales" value={formatPhp(performance?.expectedGrossSales || 0)}/><Metric label="Gross profit" value={formatPhp(performance?.expectedGrossProfit || 0)}/><Metric label="Gross margin" value={`${(performance?.expectedGrossMarginPct || 0).toFixed(1)}%`}/></div>
      <section className="planning-panel"><div className="planning-panel__heading"><div><span className="editorial-eyebrow">AI interpretation</span><h3>{planning?.interpretation?.summary}</h3></div><span className="ai-badge">{planning?.meta?.source === 'gemini' ? 'Gemini interpretation' : 'Deterministic fallback'}</span></div><div className="planning-actions">{actions.length ? actions.map((action) => <article className={`planning-action planning-action--${action.severity}`} key={action.recommendationKey}><p>{action.text}</p><button disabled={acknowledged.has(action.recommendationKey)} onClick={() => acknowledge(action)}>{acknowledged.has(action.recommendationKey) ? 'Acknowledged' : 'Acknowledge'}</button></article>) : <p>No priority action is calculated yet.</p>}</div></section>
      <section className="planning-panel"><div className="planning-panel__heading"><div><span className="editorial-eyebrow">Prepare today</span><h3>Prep sheet</h3></div><div><input type="date" value={prepDate} min={planning?.facts?.dailyPrep[0]?.date} max={planning?.facts?.dailyPrep.at(-1)?.date} onChange={(e) => setPrepDate(e.target.value)}/><button className="action-pill" onClick={() => csvDownload('prep', prepDate)}>CSV</button><button className="action-pill" onClick={() => window.print()}>Print</button></div></div><div className="planning-ticket-list">{selectedPrep?.items?.map((item) => <div className="planning-ticket" key={item.menuItemId}><strong>{item.prepTarget}</strong><span>portions</span><p>{item.itemName}</p><em>{item.direction.replace('_', ' ')}</em></div>) || <p>No prep target for this date.</p>}</div></section>
      <section className="planning-panel"><div className="planning-panel__heading"><div><span className="editorial-eyebrow">Restock now</span><h3>Supplier purchase list</h3></div><button className="action-pill" onClick={() => csvDownload('purchase', prepDate)}>CSV</button></div>{planning?.facts?.restockBySupplier?.map((group) => <div className="planning-supplier" key={group.supplierId || 'missing'}><h4>{group.supplierName}</h4>{group.items.map((item) => <div className="planning-row" key={item.ingredientId}><div><strong>{item.ingredientName} <small className={`urgency urgency--${item.urgency}`}>{item.urgency}</small></strong><span>{item.calculatedOnHand.toFixed(2)} on hand · {item.projectedLeadTimeUse.toFixed(2)} lead-time use · par {item.parLevelQuantity}</span></div><b>Buy {Math.ceil(item.recommendedPurchaseQuantity)} {item.baseUnit}<i>{formatPhp(item.estimatedCost)}</i></b></div>)}</div>)}</section>
      <section className="planning-panel"><span className="editorial-eyebrow">Setup watch</span><h3>Resolve these before trusting the forecast</h3>{configWarnings.length ? <ul className="planning-warnings">{configWarnings.map((warning, i) => <li key={`${warning.type}-${i}`}>{warning.message}</li>)}</ul> : <p>Inventory setup looks complete.</p>}</section></>}</section>}
  </div>
}
function Metric({ label, value }) { return <div className="planning-metric"><span>{label}</span><strong>{value ?? '—'}</strong></div> }
