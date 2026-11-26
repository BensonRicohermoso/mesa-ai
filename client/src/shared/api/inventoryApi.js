import { createApiClient } from './apiClient.js'

const request = createApiClient('/api/inventory')

export const getSuppliers = (includeInactive = true) => request(`/suppliers?includeInactive=${includeInactive}`)
export const createSupplier = (data) => request('/suppliers', { method: 'POST', body: JSON.stringify(data) })
export const updateSupplier = (id, data) => request(`/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const getIngredients = (includeInactive = true) => request(`/ingredients?includeInactive=${includeInactive}`)
export const createIngredient = (data) => request('/ingredients', { method: 'POST', body: JSON.stringify(data) })
export const updateIngredient = (id, data) => request(`/ingredients/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const getRecipe = (menuItemId) => request(`/menu-items/${menuItemId}/recipe`)
export const putRecipe = (menuItemId, items) => request(`/menu-items/${menuItemId}/recipe`, { method: 'PUT', body: JSON.stringify({ items }) })
export const addAdjustment = (id, data) => request(`/ingredients/${id}/adjustments`, { method: 'POST', body: JSON.stringify(data) })
export const getAdjustments = (id) => request(`/ingredients/${id}/adjustments`)
