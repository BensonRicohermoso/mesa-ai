import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatPhp } from '../utils/analyticsFormatters.js'
import { getIngredients, getSuppliers, getRecipe, putRecipe, createIngredient, updateIngredient } from '../../../shared/api/inventoryApi.js'
import { getMenuItems } from '../../../shared/api/menuApi.js'
import { getPlanningEvents } from '../../../shared/api/advisorApi.js'
import { postAiPlanning, acknowledgePlanningRecommendation, getPlanningAcknowledgements } from '../../../shared/api/aiApi.js'

const units = ['g', 'ml', 'piece', 'pack', 'portion']
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const Field = ({ label, children }) => <label className="planning-field"><span>{label}</span>{children}</label>

export function PlanningWorkspace() {
  const [view, setView] = useState('plan')
  const [planning, setPlanning] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [acks, setAcks] = useState(new Set())
  const [horizon, setHorizon] = useState(30)
  const [prepDate, setPrepDate] = useState(today())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [ingredient, setIngredient] = useState({ name: '', baseUnit: 'g', onHandQuantity: 0, parLevelQuantity: 0, unitCost: 0, leadTimeDays: 0, supplierId: '' })
  const [selectedMenu, setSelectedMenu] = useState('')
  const [recipe, setRecipe] = useState([])
  const fail = (err) => setError(err?.message || 'The request could not be completed.')
  const loadSetup = useCallback(async () => {
    const [i, s, m] = await Promise.all([getIngredients(true), getSuppliers(true), getMenuItems({ includeInactive: false })])
    setIngredients(i.ingredients || []); setSuppliers(s.suppliers || []); setMenuItems(m.items || [])
  }, [])
  const loadPlan = useCallback(async (refresh = false) => {
    setLoading(true)
    try {
      const result = await postAiPlanning({ horizonDays: horizon, tz: 'Asia/Manila', sourceMode: 'live', forceRefresh: refresh })
      setPlanning(result)
      setPrepDate((current) => result.facts.dailyPrep.some((day) => day.date === current) ? current : result.facts.dailyPrep[0]?.date || today())
    } catch (err) { fail(err) } finally { setLoading(false) }
  }, [horizon])
  useEffect(() => { Promise.all([loadSetup(), loadPlan(), getPlanningEvents(today(), '2099-12-31'), getPlanningAcknowledgements()]).then(([, , , ack]) => setAcks(new Set((ack.acknowledgements || []).map((item) => item.recommendationKey)))).catch(fail) }, [loadPlan, loadSetup])
  useEffect(() => { if (selectedMenu) getRecipe(selectedMenu).then((result) => setRecipe(result.items.map((item) => ({ ingredientId: item.ingredientId, quantityPerServing: item.quantityPerServing })))).catch(fail) }, [selectedMenu])
  const facts = planning?.facts
  const prep = facts?.dailyPrep.find((item) => item.date === prepDate)
  const filtered = useMemo(() => ingredients.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [ingredients, query])
  const actions = planning?.interpretation?.prioritizedActions || facts?.alerts?.slice(0, 5) || []
  const saveIngredient = async (event) => {
    event.preventDefault()
    const payload = { name: ingredient.name, baseUnit: ingredient.baseUnit, supplierId: ingredient.supplierId || null, parLevelQuantity: Number(ingredient.parLevelQuantity), unitCost: Number(ingredient.unitCost), leadTimeDays: Number(ingredient.leadTimeDays) }
    try {
      if (editing) await updateIngredient(editing, payload)
      else await createIngredient({ ...payload, onHandQuantity: Number(ingredient.onHandQuantity) })
      setEditing(null); setIngredient({ name: '', baseUnit: 'g', onHandQuantity: 0, parLevelQuantity: 0, unitCost: 0, leadTimeDays: 0, supplierId: '' })
      await Promise.all([loadSetup(), loadPlan(true)])
    } catch (err) { fail(err) }
  }
  return <div className="planning-workspace">
    {error && <div className="mgmt-error" role="alert">{error}</div>}
    <nav className="planning-nav"><button className={view === 'plan' ? 'planning-nav__active' : ''} onClick={() => setView('plan')}>Service plan</button><button className={view === 'setup' ? 'planning-nav__active' : ''} onClick={() => setView('setup')}>Inventory setup</button></nav>
    {view === 'plan' ? <section className="planning-board">
      <header className="planning-hero"><div><h2>Service plan</h2><p>Verified prep, purchasing, and gross-profit guidance.</p></div><div className="planning-controls"><div className="planning-segment">{[30, 60, 90].map((day) => <button key={day} className={horizon === day ? 'is-active' : ''} onClick={() => setHorizon(day)}>{day} days</button>)}</div><button className="action-pill" onClick={() => loadPlan(true)}>Refresh</button></div></header>
      {loading ? <div className="mgmt-empty">Building verified planning calculations…</div> : <><section className="planning-metrics"><Metric label="Expected orders" value={facts?.forecast.expectedOrders}/><Metric label="Gross sales" value={formatPhp(facts?.forecast.expectedGrossSales || 0)}/><Metric label="Gross profit" value={formatPhp(facts?.forecast.expectedGrossProfit || 0)}/><Metric label="Gross margin" value={(facts?.forecast.expectedGrossMarginPct || 0).toFixed(1) + '%'} note={(facts?.forecast.confidence || 'low') + ' confidence'}/></section>
      <Panel title="Act before service" text="Verified calculations, ordered by urgency."><div className="planning-actions">{actions.map((action) => <article className={'planning-action planning-action--' + action.severity} key={action.recommendationKey}><p>{action.text || action.message}</p><button disabled={acks.has(action.recommendationKey)} onClick={() => acknowledgePlanningRecommendation(action.recommendationKey).then(() => setAcks((old) => new Set(old).add(action.recommendationKey))).catch(fail)}>{acks.has(action.recommendationKey) ? 'Reviewed' : 'Review'}</button></article>)}</div></Panel>
      <Panel title="Prep sheet" text="Forecast for the selected operational day."><input aria-label="Prep date" type="date" value={prepDate} min={facts?.dailyPrep[0]?.date} max={facts?.dailyPrep.at(-1)?.date} onChange={(event) => setPrepDate(event.target.value)}/><button className="action-pill" onClick={() => window.print()}>Print</button><div className="planning-ticket-list">{prep?.items?.map((item) => <div className="planning-ticket" key={item.menuItemId}><strong>{item.prepTarget}</strong><span>portions</span><p>{item.itemName}</p><em>{item.direction.replace('_', ' ')}</em></div>)}</div></Panel>
      <Panel title="Buy now" text="Supplier quantities include forecast use during delivery lead time.">{facts?.restockBySupplier?.map((group) => <div className="planning-supplier" key={group.supplierId || 'missing'}><h4>{group.supplierName}</h4>{group.items.map((item) => <details className="planning-row" key={item.ingredientId}><summary><div><strong>{item.ingredientName} <small className={'urgency urgency--' + item.urgency}>{item.urgency}</small></strong><span>Buy {Math.ceil(item.recommendedPurchaseQuantity)} {item.baseUnit}</span></div><b>{formatPhp(item.estimatedCost)}</b></summary><p className="planning-why">{item.calculatedOnHand.toFixed(2)} on hand; {item.projectedLeadTimeUse.toFixed(2)} needed before delivery; {item.parLevelQuantity} par buffer.</p></details>)}</div>)}</Panel>
      <Panel title="Setup needed">{facts?.setupWarnings?.length ? <ul className="planning-warnings">{facts.setupWarnings.map((warning, index) => <li key={index}><button onClick={() => setView('setup')}>{warning.message}</button></li>)}</ul> : <p>Recipes, counts, and supplier settings are ready.</p>}<details className="planning-ai"><summary>AI interpretation</summary><p>{planning?.interpretation?.summary}</p></details></Panel></>}</section> :
      <section className="planning-setup"><form className="planning-form" onSubmit={saveIngredient}><h3>{editing ? 'Edit ingredient' : 'Add ingredient'}</h3><Field label="Ingredient name"><input required value={ingredient.name} onChange={(event) => setIngredient({ ...ingredient, name: event.target.value })}/></Field><Field label="Base unit"><select value={ingredient.baseUnit} disabled={Boolean(editing)} onChange={(event) => setIngredient({ ...ingredient, baseUnit: event.target.value })}>{units.map((unit) => <option key={unit}>{unit}</option>)}</select></Field>{!editing && <Field label="Opening count"><input type="number" min="0" value={ingredient.onHandQuantity} onChange={(event) => setIngredient({ ...ingredient, onHandQuantity: event.target.value })}/></Field>}<Field label="Par level"><input type="number" min="0" value={ingredient.parLevelQuantity} onChange={(event) => setIngredient({ ...ingredient, parLevelQuantity: event.target.value })}/></Field><Field label="PHP per base unit"><input type="number" min="0" value={ingredient.unitCost} onChange={(event) => setIngredient({ ...ingredient, unitCost: event.target.value })}/></Field><Field label="Supplier lead time (days)"><input type="number" min="0" value={ingredient.leadTimeDays} onChange={(event) => setIngredient({ ...ingredient, leadTimeDays: event.target.value })}/></Field><Field label="Supplier"><select value={ingredient.supplierId} onChange={(event) => setIngredient({ ...ingredient, supplierId: event.target.value })}><option value="">Not set</option>{suppliers.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><button className="action-pill action-pill--solid">Save ingredient</button></form><div className="planning-list-tools"><label>Search ingredients <input value={query} onChange={(event) => setQuery(event.target.value)}/></label><span>{filtered.length} shown</span></div><div className="planning-row-list">{filtered.map((item) => <article className="planning-row" key={item.id}><div><strong>{item.name}</strong><span>{item.stock?.calculatedOnHand ?? 0} {item.baseUnit} on hand · par {item.parLevelQuantity}</span></div><button className="quiet-link" onClick={() => { setEditing(item.id); setIngredient({ ...item, supplierId: item.supplierId || '' }) }}>Edit</button></article>)}</div><section className="planning-panel"><h3>Recipes</h3><select value={selectedMenu} onChange={(event) => setSelectedMenu(event.target.value)}><option value="">Choose a menu item</option>{menuItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{selectedMenu && <><div>{recipe.map((line, index) => <div className="recipe-line" key={index}><select value={line.ingredientId} onChange={(event) => setRecipe(recipe.map((row, i) => i === index ? { ...row, ingredientId: event.target.value } : row))}><option value="">Ingredient</option>{ingredients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="number" value={line.quantityPerServing} onChange={(event) => setRecipe(recipe.map((row, i) => i === index ? { ...row, quantityPerServing: event.target.value } : row))}/></div>)}</div><button onClick={() => setRecipe([...recipe, { ingredientId: '', quantityPerServing: '' }])}>Add ingredient</button><button onClick={() => putRecipe(selectedMenu, recipe.filter((item) => item.ingredientId && Number(item.quantityPerServing) > 0)).then(() => loadPlan(true)).catch(fail)}>Save recipe</button></>}</section></section>}
  </div>
}
function Metric({ label, value, note }) { return <div className="planning-metric"><span>{label}</span><strong>{value ?? '—'}</strong>{note && <small>{note}</small>}</div> }
function Panel({ title, text, children }) { return <section className="planning-panel"><h3>{title}</h3>{text && <p>{text}</p>}{children}</section> }
