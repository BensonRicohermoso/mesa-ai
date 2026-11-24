/**
 * Static pre-computed analytics fixture payloads matching the proposed
 * /api/analytics/* contract shapes. Used ONLY when Preview Fixtures mode
 * is explicitly enabled. Contains zero dynamic aggregation logic.
 *
 * Modeled on the 13 seeded menu items and 10 dining tables (T01–T10).
 */

const SUMMARY_7D = {
  range: { from: '2026-11-19', to: '2026-11-25', timezone: 'Asia/Manila' },
  comparisonRange: { from: '2026-11-12', to: '2026-11-18' },
  kpis: {
    grossSales: 84250.0,
    grossProfit: 52180.0,
    grossMarginPct: 61.93,
    cogs: 32070.0,
    paidOrdersCount: 248,
    averageOrderValue: 339.72,
    cancelledOrExpiredCount: 11,
  },
  deltasPct: {
    grossSales: 12.4,
    grossProfit: 14.1,
    grossMarginPct: 0.92,
    paidOrdersCount: 8.3,
    averageOrderValue: 3.8,
  },
  paymentBreakdown: [
    { method: 'cash', orderCount: 146, amount: 47950.0, sharePct: 56.91 },
    { method: 'gcash', orderCount: 102, amount: 36300.0, sharePct: 43.09 },
  ],
}

const SUMMARY_TODAY = {
  range: { from: '2026-11-25', to: '2026-11-25', timezone: 'Asia/Manila' },
  comparisonRange: { from: '2026-11-24', to: '2026-11-24' },
  kpis: {
    grossSales: 12840.0,
    grossProfit: 7920.0,
    grossMarginPct: 61.68,
    cogs: 4920.0,
    paidOrdersCount: 38,
    averageOrderValue: 337.89,
    cancelledOrExpiredCount: 2,
  },
  deltasPct: {
    grossSales: 5.2,
    grossProfit: 6.8,
    grossMarginPct: 0.95,
    paidOrdersCount: 2.7,
    averageOrderValue: 2.4,
  },
  paymentBreakdown: [
    { method: 'cash', orderCount: 22, amount: 7260.0, sharePct: 56.54 },
    { method: 'gcash', orderCount: 16, amount: 5580.0, sharePct: 43.46 },
  ],
}

const TRENDS_7D = {
  granularity: 'day',
  salesSeries: [
    { bucket: '2026-11-19', label: 'Nov 19', grossSales: 11200.0, grossProfit: 6940.0, grossMarginPct: 61.96, orderCount: 34, previousGrossSales: 9850.0, previousGrossProfit: 6010.0 },
    { bucket: '2026-11-20', label: 'Nov 20', grossSales: 12600.0, grossProfit: 7810.0, grossMarginPct: 61.98, orderCount: 37, previousGrossSales: 11200.0, previousGrossProfit: 6880.0 },
    { bucket: '2026-11-21', label: 'Nov 21', grossSales: 11850.0, grossProfit: 7340.0, grossMarginPct: 61.94, orderCount: 35, previousGrossSales: 10600.0, previousGrossProfit: 6520.0 },
    { bucket: '2026-11-22', label: 'Nov 22', grossSales: 13100.0, grossProfit: 8120.0, grossMarginPct: 61.98, orderCount: 39, previousGrossSales: 11800.0, previousGrossProfit: 7290.0 },
    { bucket: '2026-11-23', label: 'Nov 23', grossSales: 12450.0, grossProfit: 7700.0, grossMarginPct: 61.85, orderCount: 36, previousGrossSales: 11450.0, previousGrossProfit: 7050.0 },
    { bucket: '2026-11-24', label: 'Nov 24', grossSales: 10210.0, grossProfit: 6350.0, grossMarginPct: 62.19, orderCount: 29, previousGrossSales: 10100.0, previousGrossProfit: 6200.0 },
    { bucket: '2026-11-25', label: 'Nov 25', grossSales: 12840.0, grossProfit: 7920.0, grossMarginPct: 61.68, orderCount: 38, previousGrossSales: 10000.0, previousGrossProfit: 6180.0 },
  ],
  peakHours: [
    { hour: 8, hourLabel: '08:00', orderCount: 8, grossSales: 2680.0, grossProfit: 1660.0, isPeak: false },
    { hour: 9, hourLabel: '09:00', orderCount: 12, grossSales: 4020.0, grossProfit: 2490.0, isPeak: false },
    { hour: 10, hourLabel: '10:00', orderCount: 16, grossSales: 5360.0, grossProfit: 3320.0, isPeak: false },
    { hour: 11, hourLabel: '11:00', orderCount: 32, grossSales: 10720.0, grossProfit: 6640.0, isPeak: true },
    { hour: 12, hourLabel: '12:00', orderCount: 42, grossSales: 14280.0, grossProfit: 8840.0, isPeak: true },
    { hour: 13, hourLabel: '13:00', orderCount: 36, grossSales: 12060.0, grossProfit: 7470.0, isPeak: true },
    { hour: 14, hourLabel: '14:00', orderCount: 14, grossSales: 4690.0, grossProfit: 2900.0, isPeak: false },
    { hour: 15, hourLabel: '15:00', orderCount: 10, grossSales: 3350.0, grossProfit: 2070.0, isPeak: false },
    { hour: 16, hourLabel: '16:00', orderCount: 8, grossSales: 2680.0, grossProfit: 1660.0, isPeak: false },
    { hour: 17, hourLabel: '17:00', orderCount: 18, grossSales: 6030.0, grossProfit: 3730.0, isPeak: false },
    { hour: 18, hourLabel: '18:00', orderCount: 28, grossSales: 9380.0, grossProfit: 5810.0, isPeak: true },
    { hour: 19, hourLabel: '19:00', orderCount: 24, grossSales: 8040.0, grossProfit: 4980.0, isPeak: false },
  ],
}

const TRENDS_TODAY_HOURLY = {
  granularity: 'hour',
  salesSeries: [
    { bucket: '2026-11-25T08:00', label: '08:00', grossSales: 980.0, grossProfit: 607.0, grossMarginPct: 61.94, orderCount: 3, previousGrossSales: 850.0, previousGrossProfit: 526.0 },
    { bucket: '2026-11-25T09:00', label: '09:00', grossSales: 1240.0, grossProfit: 768.0, grossMarginPct: 61.94, orderCount: 4, previousGrossSales: 1100.0, previousGrossProfit: 681.0 },
    { bucket: '2026-11-25T10:00', label: '10:00', grossSales: 1560.0, grossProfit: 966.0, grossMarginPct: 61.92, orderCount: 5, previousGrossSales: 1350.0, previousGrossProfit: 836.0 },
    { bucket: '2026-11-25T11:00', label: '11:00', grossSales: 2180.0, grossProfit: 1350.0, grossMarginPct: 61.93, orderCount: 6, previousGrossSales: 2000.0, previousGrossProfit: 1238.0 },
    { bucket: '2026-11-25T12:00', label: '12:00', grossSales: 2640.0, grossProfit: 1635.0, grossMarginPct: 61.93, orderCount: 8, previousGrossSales: 2400.0, previousGrossProfit: 1486.0 },
    { bucket: '2026-11-25T13:00', label: '13:00', grossSales: 2080.0, grossProfit: 1288.0, grossMarginPct: 61.92, orderCount: 6, previousGrossSales: 1950.0, previousGrossProfit: 1207.0 },
    { bucket: '2026-11-25T14:00', label: '14:00', grossSales: 860.0, grossProfit: 533.0, grossMarginPct: 61.98, orderCount: 3, previousGrossSales: 780.0, previousGrossProfit: 483.0 },
    { bucket: '2026-11-25T15:00', label: '15:00', grossSales: 1300.0, grossProfit: 773.0, grossMarginPct: 59.46, orderCount: 3, previousGrossSales: 1070.0, previousGrossProfit: 663.0 },
  ],
  peakHours: TRENDS_7D.peakHours,
}

const MENU_ENGINEERING = {
  benchmarks: {
    avgPopularityUnits: 28.5,
    avgUnitGrossProfit: 86.4,
    avgGrossMarginPct: 62.1,
    totalUnitsSold: 371,
    totalGrossSales: 84250.0,
    totalGrossProfit: 52180.0,
  },
  quadrantCounts: { star: 4, plowhorse: 3, puzzle: 3, dog: 3 },
  items: [
    { menuItemId: 'a1', itemName: 'Chicken Adobo Rice Meal', categoryId: 'c1', categoryName: 'Meals', isActive: true, isAvailable: true, unitsSold: 68, grossSales: 10200.0, cogs: 3740.0, grossProfit: 6460.0, unitGrossProfit: 95.0, grossMarginPct: 63.33, quadrant: 'star' },
    { menuItemId: 'a2', itemName: 'Pork Sisig', categoryId: 'c1', categoryName: 'Meals', isActive: true, isAvailable: true, unitsSold: 52, grossSales: 8840.0, cogs: 3380.0, grossProfit: 5460.0, unitGrossProfit: 105.0, grossMarginPct: 61.76, quadrant: 'star' },
    { menuItemId: 'a3', itemName: 'Beef Tapa', categoryId: 'c1', categoryName: 'Meals', isActive: true, isAvailable: true, unitsSold: 38, grossSales: 6840.0, cogs: 3040.0, grossProfit: 3800.0, unitGrossProfit: 100.0, grossMarginPct: 55.56, quadrant: 'star' },
    { menuItemId: 'a4', itemName: 'Fried Chicken (2 pcs)', categoryId: 'c1', categoryName: 'Meals', isActive: true, isAvailable: true, unitsSold: 44, grossSales: 7040.0, cogs: 3080.0, grossProfit: 3960.0, unitGrossProfit: 90.0, grossMarginPct: 56.25, quadrant: 'star' },
    { menuItemId: 'a5', itemName: 'Burger Steak Meal', categoryId: 'c1', categoryName: 'Meals', isActive: true, isAvailable: true, unitsSold: 36, grossSales: 5040.0, cogs: 2160.0, grossProfit: 2880.0, unitGrossProfit: 80.0, grossMarginPct: 57.14, quadrant: 'plowhorse' },
    { menuItemId: 'a6', itemName: 'Pancit Canton', categoryId: 'c1', categoryName: 'Meals', isActive: true, isAvailable: true, unitsSold: 32, grossSales: 3840.0, cogs: 1120.0, grossProfit: 2720.0, unitGrossProfit: 85.0, grossMarginPct: 70.83, quadrant: 'plowhorse' },
    { menuItemId: 'a7', itemName: 'Iced Latte', categoryId: 'c3', categoryName: 'Drinks', isActive: true, isAvailable: true, unitsSold: 30, grossSales: 3300.0, cogs: 840.0, grossProfit: 2460.0, unitGrossProfit: 82.0, grossMarginPct: 74.55, quadrant: 'plowhorse' },
    { menuItemId: 'a8', itemName: 'French Fries', categoryId: 'c2', categoryName: 'Sides', isActive: true, isAvailable: true, unitsSold: 22, grossSales: 1980.0, cogs: 550.0, grossProfit: 1430.0, unitGrossProfit: 65.0, grossMarginPct: 72.22, quadrant: 'puzzle' },
    { menuItemId: 'a9', itemName: 'Mango Shake', categoryId: 'c3', categoryName: 'Drinks', isActive: true, isAvailable: true, unitsSold: 18, grossSales: 1800.0, cogs: 684.0, grossProfit: 1116.0, unitGrossProfit: 62.0, grossMarginPct: 62.0, quadrant: 'puzzle' },
    { menuItemId: 'a10', itemName: 'Halo-halo', categoryId: 'c4', categoryName: 'Desserts', isActive: true, isAvailable: true, unitsSold: 14, grossSales: 1386.0, cogs: 560.0, grossProfit: 826.0, unitGrossProfit: 59.0, grossMarginPct: 59.6, quadrant: 'puzzle' },
    { menuItemId: 'a11', itemName: 'Iced Tea', categoryId: 'c3', categoryName: 'Drinks', isActive: true, isAvailable: true, unitsSold: 8, grossSales: 480.0, cogs: 64.0, grossProfit: 416.0, unitGrossProfit: 52.0, grossMarginPct: 86.67, quadrant: 'dog' },
    { menuItemId: 'a12', itemName: 'Bottled Water', categoryId: 'c3', categoryName: 'Drinks', isActive: true, isAvailable: true, unitsSold: 5, grossSales: 150.0, cogs: 60.0, grossProfit: 90.0, unitGrossProfit: 18.0, grossMarginPct: 60.0, quadrant: 'dog' },
    { menuItemId: 'a13', itemName: 'Leche Flan', categoryId: 'c4', categoryName: 'Desserts', isActive: true, isAvailable: true, unitsSold: 4, grossSales: 280.0, cogs: 88.0, grossProfit: 192.0, unitGrossProfit: 48.0, grossMarginPct: 68.57, quadrant: 'dog' },
  ],
}

const MENU_ENGINEERING_TOP5 = {
  ...MENU_ENGINEERING,
  items: MENU_ENGINEERING.items.slice(0, 5),
}

const PERFORMANCE = {
  cashier: {
    avgHandlingSeconds: 42,
    medianHandlingSeconds: 38,
    paymentsConfirmedCount: 248,
    byCashier: [
      { staffId: 's1', fullName: 'Cashier Staff', confirmedCount: 248, totalAmount: 84250.0, avgHandlingSeconds: 42, cashCount: 146, gcashCount: 102, onlineCount: 0 },
    ],
  },
  kitchen: {
    avgQueueWaitSeconds: 65,
    avgPrepSeconds: 480,
    avgFulfillmentSeconds: 720,
    completedOrdersCount: 237,
    activeInKitchenCount: 3,
  },
  tables: {
    byTable: [
      { tableId: 't1', tableCode: 'T01', label: 'Table 1', orderCount: 32, grossSales: 10860.0, grossProfit: 6730.0, averageOrderValue: 339.38 },
      { tableId: 't2', tableCode: 'T02', label: 'Table 2', orderCount: 28, grossSales: 9500.0, grossProfit: 5890.0, averageOrderValue: 339.29 },
      { tableId: 't3', tableCode: 'T03', label: 'Table 3', orderCount: 30, grossSales: 10180.0, grossProfit: 6310.0, averageOrderValue: 339.33 },
      { tableId: 't4', tableCode: 'T04', label: 'Table 4', orderCount: 24, grossSales: 8150.0, grossProfit: 5050.0, averageOrderValue: 339.58 },
      { tableId: 't5', tableCode: 'T05', label: 'Table 5', orderCount: 26, grossSales: 8830.0, grossProfit: 5470.0, averageOrderValue: 339.62 },
      { tableId: 't6', tableCode: 'T06', label: 'Table 6', orderCount: 22, grossSales: 7470.0, grossProfit: 4630.0, averageOrderValue: 339.55 },
      { tableId: 't7', tableCode: 'T07', label: 'Table 7', orderCount: 20, grossSales: 6790.0, grossProfit: 4210.0, averageOrderValue: 339.50 },
      { tableId: 't8', tableCode: 'T08', label: 'Table 8', orderCount: 24, grossSales: 8150.0, grossProfit: 5050.0, averageOrderValue: 339.58 },
      { tableId: 't9', tableCode: 'T09', label: 'Table 9', orderCount: 22, grossSales: 7470.0, grossProfit: 4630.0, averageOrderValue: 339.55 },
      { tableId: 't10', tableCode: 'T10', label: 'Table 10', orderCount: 20, grossSales: 6850.0, grossProfit: 4210.0, averageOrderValue: 342.50 },
    ],
  },
  orderOutcomes: { completed: 237, cancelled: 5, expired: 6, inProgress: 11 },
}

const RECENT_ORDERS = {
  orders: [
    { id: 'r1', orderRef: 'ORD-20261125-0038', tableCode: 'T03', tableLabel: 'Table 3', orderStatus: 'completed', paymentStatus: 'paid', paymentMethod: 'cash', itemCount: 3, total: 430.0, grossProfit: 266.0, grossMarginPct: 61.86, handlingSeconds: 35, createdAt: '2026-11-25T15:22:00+08:00', confirmedAt: '2026-11-25T15:23:10+08:00', completedAt: '2026-11-25T15:35:00+08:00' },
    { id: 'r2', orderRef: 'ORD-20261125-0037', tableCode: 'T07', tableLabel: 'Table 7', orderStatus: 'ready', paymentStatus: 'paid', paymentMethod: 'gcash', itemCount: 2, total: 320.0, grossProfit: 198.0, grossMarginPct: 61.88, handlingSeconds: 28, createdAt: '2026-11-25T15:18:00+08:00', confirmedAt: '2026-11-25T15:19:00+08:00', completedAt: null },
    { id: 'r3', orderRef: 'ORD-20261125-0036', tableCode: 'T01', tableLabel: 'Table 1', orderStatus: 'preparing', paymentStatus: 'paid', paymentMethod: 'cash', itemCount: 4, total: 580.0, grossProfit: 359.0, grossMarginPct: 61.9, handlingSeconds: 44, createdAt: '2026-11-25T15:10:00+08:00', confirmedAt: '2026-11-25T15:11:30+08:00', completedAt: null },
    { id: 'r4', orderRef: 'ORD-20261125-0035', tableCode: 'T05', tableLabel: 'Table 5', orderStatus: 'completed', paymentStatus: 'paid', paymentMethod: 'gcash', itemCount: 2, total: 280.0, grossProfit: 173.0, grossMarginPct: 61.79, handlingSeconds: 31, createdAt: '2026-11-25T14:52:00+08:00', confirmedAt: '2026-11-25T14:53:00+08:00', completedAt: '2026-11-25T15:08:00+08:00' },
    { id: 'r5', orderRef: 'ORD-20261125-0034', tableCode: 'T02', tableLabel: 'Table 2', orderStatus: 'completed', paymentStatus: 'paid', paymentMethod: 'cash', itemCount: 3, total: 390.0, grossProfit: 242.0, grossMarginPct: 62.05, handlingSeconds: 38, createdAt: '2026-11-25T14:40:00+08:00', confirmedAt: '2026-11-25T14:41:20+08:00', completedAt: '2026-11-25T14:55:00+08:00' },
    { id: 'r6', orderRef: 'ORD-20261125-0033', tableCode: 'T09', tableLabel: 'Table 9', orderStatus: 'cancelled', paymentStatus: 'cancelled', paymentMethod: null, itemCount: 1, total: 150.0, grossProfit: null, grossMarginPct: null, handlingSeconds: null, createdAt: '2026-11-25T14:30:00+08:00', confirmedAt: null, completedAt: null },
    { id: 'r7', orderRef: 'ORD-20261125-0032', tableCode: 'T04', tableLabel: 'Table 4', orderStatus: 'completed', paymentStatus: 'paid', paymentMethod: 'cash', itemCount: 2, total: 310.0, grossProfit: 192.0, grossMarginPct: 61.94, handlingSeconds: 40, createdAt: '2026-11-25T14:15:00+08:00', confirmedAt: '2026-11-25T14:16:00+08:00', completedAt: '2026-11-25T14:30:00+08:00' },
    { id: 'r8', orderRef: 'ORD-20261125-0031', tableCode: 'T06', tableLabel: 'Table 6', orderStatus: 'expired', paymentStatus: 'unpaid', paymentMethod: null, itemCount: 2, total: 260.0, grossProfit: null, grossMarginPct: null, handlingSeconds: null, createdAt: '2026-11-25T14:00:00+08:00', confirmedAt: null, completedAt: null },
  ],
  pagination: { total: 38, limit: 8, offset: 0 },
}

/**
 * Get preview fixture data for a given endpoint and preset.
 * @param {'summary'|'trends'|'menu-engineering'|'performance'|'recent-orders'} endpoint
 * @param {'today'|'7d'|'30d'|'month'} preset
 * @param {Object} params - additional params (e.g. { granularity, limit })
 */
export function getPreviewData(endpoint, preset, params = {}) {
  if (endpoint === 'summary') {
    return preset === 'today' ? SUMMARY_TODAY : SUMMARY_7D
  }

  if (endpoint === 'trends') {
    if (preset === 'today' || params.granularity === 'hour') {
      return TRENDS_TODAY_HOURLY
    }
    return TRENDS_7D
  }

  if (endpoint === 'menu-engineering') {
    if (params.limit && Number(params.limit) <= 5) {
      return MENU_ENGINEERING_TOP5
    }
    return MENU_ENGINEERING
  }

  if (endpoint === 'performance') {
    return PERFORMANCE
  }

  if (endpoint === 'recent-orders') {
    return RECENT_ORDERS
  }

  return null
}
