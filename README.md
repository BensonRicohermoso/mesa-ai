# MESA-AI: Final Scope

**Menu, Electronic Ordering, Service, and Analytics**

> Customers order from their table by scanning a QR code, so the cashier only scans the order QR and confirms payment. Every order automatically feeds an owner dashboard with AI insights and forecasting.

---

## 1. Problem Statement

Long ordering queues slow customers down and overload cashiers. Customers read the menu at the counter, cashiers type each order manually, and mistakes happen. Owners also lack an easy way to understand their sales and profit.

MESA addresses both problems:

1. **Ordering convenience:** shorter queues and less cashier work.
2. **Owner intelligence:** a dashboard with AI insights and forecasting, built from order data.

**Academic track:** Business Analytics (BA), with System Management (SM) as a secondary fit.

---

## 2. Scope

| In Scope                             | Phase 2 (Future)                       |
| ------------------------------------ | -------------------------------------- |
| Table QR menu, cart, order QR        | Online payment gateway (e.g. PayMongo) |
| Cashier POS (cash and counter GCash) | Inventory and stock tracking           |
| Kitchen display                      | Supplier and ingredient costing        |
| Real-time order tracking             | Multi-branch support                   |
| Owner dashboard and analytics        | Offline mode                           |
| AI insights panel and forecasting    | Voice and image input                  |
| Item cost and gross profit           |                                        |
| Menu, table, and staff management    |                                        |
| Seed data for demo                   |                                        |

---

## 3. System Flow

```
1. Customer scans TABLE QR, browses the menu, builds a cart, submits the order
2. System shows an ORDER QR (Order: Pending, Payment: Unpaid)
3. Customer joins the counter line (scan-only, no ordering at the counter)
4. Cashier scans the ORDER QR and checks the total
5. Cashier takes Cash or GCash and confirms payment
6. Order becomes Confirmed + Paid and appears on the Kitchen Display
7. Kitchen taps Preparing, then Ready
8. Order is served and marked Completed
9. All records feed the dashboard, AI insights, and forecasts
```

### Business Rules

- Validate orders and menu availability on the backend.
- Calculate totals on the server, never trust prices from the phone.
- Prevent duplicate order submissions.
- Keep **payment status** separate from **order status**.
- Unpaid orders never reach the kitchen.
- Unpaid orders auto-expire after a set time (e.g. 20 minutes).
- Only cashier and admin roles can confirm payments.
- Record timestamps for every status change and payment.
- Store the **price and cost at order time** on each order item, so historical profit stays accurate.
- Dashboard and AI use the same backend analytics functions.

---

## 4. Customer (Phone, No Login)

### UI

- **Menu:** category tabs, search, item cards, sold-out badges, floating cart button
- **Cart:** quantities, special instructions, total, submit button
- **Confirmation:** order QR and order reference number
- **Tracking:** live status bar with estimated wait time

### Use Cases

- Scan the table QR and browse the menu
- Add items and write special instructions
- Submit the order and receive an order QR
- Show the order QR at the counter to pay
- Track Pending → Confirmed → Preparing → Ready
- See add-on suggestions in the cart

---

## 5. Cashier (Tablet or Laptop, Login)

### UI

A single POS screen:

- **Left:** QR scanner with manual reference search
- **Center:** order details and total
- **Right:** payment panel (Cash or GCash) and receipt button
- **Below:** live orders queue

### Use Cases

- Scan the order QR to retrieve the order instantly
- Accept cash (amount tendered and change) or GCash (reference number)
- Confirm payment, which sends the order to the kitchen
- Print or show a receipt
- Cancel an unpaid order
- Mark served orders as Completed

### Tracked Metric

- **Cashier handling time:** QR scan to payment confirmed. This is the proof of reduced queueing.

---

## 6. Kitchen (Screen or Tablet, Login)

### UI

Order cards in columns (**New**, **Preparing**, **Ready**) showing table number, items, quantities, special instructions, and a waiting timer.

### Use Cases

- See newly paid orders appear automatically
- Tap **Preparing**, then **Ready**
- Identify late orders by the timer

### Tracked Metric

- **Preparation time** from each timestamped status change.

---

## 7. Owner (Laptop, Login)

### UI

```
+-----------------------------------+--------------------+
| KPI cards: revenue, gross profit, |  AI INSIGHTS PANEL |
| orders, avg order, queue metrics  |  Daily briefing    |
| Charts: sales trend, peak hours   |  Alerts            |
| Tables: top items, recent orders  |  Forecast          |
| Filters: date range               |  Recommendations   |
|                                   |  Ask a question    |
+-----------------------------------+--------------------+
```

### Other Owner Pages

- **Analytics and Reports:** detailed charts, comparisons, report tables, export
- **Menu Management:** items, categories, price, cost, availability
- **Table Management:** register tables, generate and print table QR codes
- **Staff Management:** create accounts, assign cashier or kitchen roles, deactivate
- **Orders and Transactions:** history, payment records, status timeline

### Dashboard Use Cases

- Track sales, gross profit and margin, order counts, and best sellers
- See peak hours, payment mix, cancellations, and prep time
- See cashier handling time and online/offline share
- Filter by date range and export reports

### AI Insights Use Cases

| Insight                    | Description                                                                   |
| -------------------------- | ----------------------------------------------------------------------------- |
| **Daily briefing**         | Yesterday's results and what to watch today                                   |
| **Alerts**                 | Unusual sales drops, cancellation spikes, slow prep times                     |
| **Forecast**               | Expected orders, revenue, gross profit, and peak hours                        |
| **Menu engineering**       | Stars, Workhorses, Puzzles, and Dogs by popularity and margin                 |
| **Profit insights**        | Revenue vs. gross profit, top profit contributors, margin by category         |
| **Recommendations**        | Promos for slow hours, price tweaks, bundle ideas                             |
| **Ask questions**          | "Why did profit drop this week?" with follow-up questions                     |
| **Approval-based actions** | The AI drafts a change (e.g. mark an item unavailable) and the owner confirms |

### Menu Engineering Matrix

|                     | High Margin                   | Low Margin                                 |
| ------------------- | ----------------------------- | ------------------------------------------ |
| **High Popularity** | Star: protect and feature     | Workhorse: consider a small price increase |
| **Low Popularity**  | Puzzle: promote or reposition | Dog: reconsider or remove                  |

### AI Rules

- The backend computes every number. The AI only explains verified results.
- Responses clearly separate **data** from **AI interpretation**.
- API keys stay on the server.
- Use "gross profit" and "gross margin" only. Never "net profit", since rent, labor, and utilities are not tracked.

### Suggested Backend Analytics Functions

`getSalesSummary`, `comparePeriods`, `getTopAndBottomProducts`, `getMenuEngineering`, `getProductPairings`, `getPeakHours`, `getKitchenPerformance`, `getCashierMetrics`, `getCancellationAnalysis`, `getForecast`

---

## 8. Data Strategy

| Type                 | Examples                                               | How it is created                                                                     |
| -------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| **Setup data**       | Menu, prices, costs, categories, tables, staff         | Entered once by the owner via Menu, Table, and Staff Management (optional CSV import) |
| **Transaction data** | Orders, items, payments, status history, cancellations | Created automatically by customers and staff using the system                         |
| **Demo seed data**   | 4-6 weeks of past orders                               | One-time `npm run seed` script, for the demo only                                     |

### Cost Tracking

| Table         | Key Fields                                                   |
| ------------- | ------------------------------------------------------------ |
| `menu_items`  | `price`, `cost_price`                                        |
| `order_items` | `quantity`, `unit_price`, `unit_cost` (copied at order time) |

### Sample Menu (PHP)

| Item                    | Category | Price | Cost | Margin |
| ----------------------- | -------- | ----- | ---- | ------ |
| Chicken Adobo Rice Meal | Meals    | 150   | 55   | 63%    |
| Pork Sisig              | Meals    | 170   | 65   | 62%    |
| Beef Tapa               | Meals    | 180   | 80   | 56%    |
| Burger Steak Meal       | Meals    | 140   | 60   | 57%    |
| Fried Chicken (2 pcs)   | Meals    | 160   | 70   | 56%    |
| Pancit Canton           | Meals    | 120   | 35   | 71%    |
| French Fries            | Sides    | 90    | 25   | 72%    |
| Iced Latte              | Drinks   | 110   | 28   | 75%    |
| Iced Tea                | Drinks   | 60    | 8    | 87%    |
| Mango Shake             | Drinks   | 100   | 38   | 62%    |
| Bottled Water           | Drinks   | 30    | 12   | 60%    |
| Halo-halo               | Desserts | 99    | 40   | 60%    |
| Leche Flan              | Desserts | 70    | 22   | 69%    |

### Seed Data Patterns (so insights have something to find)

- Lunch rush (12-1 PM) and dinner peak, higher weekend volume
- One popular but low-margin item (Beef Tapa)
- One high-margin but rarely ordered item (Iced Tea)
- A few slow weekday afternoons
- A handful of cancelled and expired orders

---

## 9. Technology Stack

| Component                  | Technology                     |
| -------------------------- | ------------------------------ |
| Frontend                   | React, HTML, CSS, JavaScript   |
| Backend                    | Node.js and Express.js         |
| Database                   | PostgreSQL / Supabase          |
| AI Integration             | Gemini API (backend only)      |
| Data Visualization         | Chart.js                       |
| Real-Time Updates          | Socket.IO or Supabase Realtime |
| QR Generation and Scanning | QR code libraries              |

---

## 10. Page List (About 15 Screens)

| Area         | Pages                                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Customer** | QR Menu, Cart and Checkout, Order Confirmation, Order Tracking                                                               |
| **Shared**   | Staff Login                                                                                                                  |
| **Cashier**  | POS and Orders Queue                                                                                                         |
| **Kitchen**  | Kitchen Display                                                                                                              |
| **Owner**    | Dashboard with AI Panel, Analytics and Reports, Menu Management, Table Management, Staff Management, Orders and Transactions |

---

## 11. Development Priority

1. **Must-have:** auth and roles, menu and table management, QR menu, cart, order submission, cashier POS, kitchen display, order tracking, seed data
2. **Must-have for BA track:** owner dashboard and analytics page
3. **Signature feature:** AI insights panel (briefing, forecast, recommendations, ask questions)
4. **Bonus:** approval-based AI actions, estimated wait time, add-on suggestions, CSV menu import

### Team Roles (Suggested)

| Member   | Responsibility                                                                      |
| -------- | ----------------------------------------------------------------------------------- |
| Member 1 | Customer ordering, cashier POS, kitchen display, real-time updates                  |
| Member 2 | Owner dashboard, analytics page, management pages, charts, seed data                |
| Member 3 | Database schema, auth, order and payment logic, analytics functions, AI integration |

---

## 12. Rubric Alignment (IT 314)

| Criteria                          | Points | How MESA Addresses It                                                  |
| --------------------------------- | ------ | ---------------------------------------------------------------------- |
| Website Functionality             | 30     | Working ordering, payment, kitchen, dashboard, AI, plus error handling |
| Design, Usability, Responsiveness | 20     | Mobile-first customer UI, tablet POS and kitchen, desktop owner pages  |
| Creativity and Innovation         | 15     | QR ordering plus agentic AI insights and forecasting                   |
| Relevance to Track                | 15     | KPIs, profit analysis, forecasting, menu engineering (BA)              |
| Technical Implementation          | 10     | React frontend, Node/Express backend, PostgreSQL, documented repo      |
| Presentation and Demo             | 10     | Live QR scan, cashier confirmation, kitchen update, AI insight demo    |

### Demo Risks and Fallbacks

- Prepare seed data so charts are never empty.
- Keep pre-generated insight cards in case the AI API fails.
- Deploy over HTTPS so camera scanning works.
- Test on a real phone and tablet before the presentation.

## Documentation

- [Structure](/docs/STRUCTURE.md)
- [Team Ownership](/docs/OWNERSHIP.md)
- [Database](/docs/DATABASE.md)
- [API](/docs/API.md)
- [Progress](/docs/PROGRESS.md)
