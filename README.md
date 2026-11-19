# MESA-AI

**Menu, Electronic Ordering, Service, and Analytics**

*An AI-Powered Restaurant Management, QR Ordering, and Business Intelligence System*

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core System Components](#2-core-system-components)
3. [AI Analytics Workflow](#3-ai-analytics-workflow)
4. [Database and Data Sources](#4-database-and-data-sources)
5. [Technology Stack](#5-technology-stack)
6. [Important Business and Technical Rules](#6-important-business-and-technical-rules)
7. [Recommended Development Scope](#7-recommended-development-scope)
8. [Project's Main Innovation](#8-projects-main-innovation)

---

## 1. Project Overview

MESA is an AI-powered restaurant management and business intelligence platform that integrates QR-based ordering, payment processing, kitchen coordination, conventional business analytics, and a conversational AI assistant.

The system provides restaurant owners and administrators with a centralized platform to manage daily operations and understand business performance.

MESA consists of three major functional areas:

1. **Restaurant Ordering and Management** – Handles customer ordering, payments, menu management, cashier operations, and kitchen coordination.
2. **Dashboard and Analytics** – Provides conventional dashboards, interactive visualizations, business metrics, and detailed reports based on restaurant transactions.
3. **AI Restaurant Analytics Assistant** – Provides a dedicated conversational interface where administrators can ask questions, explore business data, request customized reports, and receive AI-generated insights and recommendations.

The AI assistant enhances the existing analytics experience by allowing administrators to interact with their business information through natural language rather than relying exclusively on manually navigating dashboards and reports.

---

## 2. Core System Components

### A. AI Restaurant Analytics Assistant

The AI Restaurant Analytics Assistant is MESA's signature intelligent feature.

It provides a dedicated chat interface where administrators can communicate with an AI agent to retrieve business information, analyze restaurant performance, generate reports, and receive recommendations.

Unlike a traditional dashboard, administrators can simply describe what information they need and let the assistant retrieve and interpret the relevant data.

**Key capabilities:**

- Natural-language business data queries.
- Sales and revenue analysis.
- Product and category performance analysis.
- Order and payment analysis.
- Operational performance analysis.
- Customized report generation.
- AI-generated business insights and recommendations.
- Contextual follow-up conversations.
- Data tables and visualizations within chat responses.

**Example conversations:**

- "How much did we earn this month?"
- "Compare our sales this month with last month."
- "What are our top five best-selling products?"
- "Which products have the lowest sales?"
- "What are our busiest hours?"
- "Generate a detailed monthly sales report."
- "Analyze our cancelled orders."
- "Give me a summary of our restaurant's performance."
- "What should we focus on improving based on our current data?"

The assistant should be able to respond with actual figures, explanations, tables, charts, and recommendations depending on the request.

It should also support follow-up questions so administrators can explore a particular report without starting a new conversation.

---

### B. Dashboard and Analytics

MESA will retain a conventional dashboard and a dedicated analytics page. These remain fully functional even without using the AI assistant.

#### B.1 Main Dashboard

Provides administrators with an overview of the restaurant's current business performance.

**Possible dashboard components:**

- Total sales revenue.
- Total orders.
- Average order value.
- Completed and cancelled orders.
- Best-selling products.
- Recent transactions.
- Sales trends.
- Order activity.
- Payment summaries.

#### B.2 Analytics and Reports Page

Provides a more detailed and interactive way to examine restaurant performance.

**Features include:**

- Daily, weekly, and monthly sales analysis.
- Revenue trends and comparisons.
- Product performance rankings.
- Category performance.
- Order volume analysis.
- Payment method distribution.
- Peak ordering hours and busiest days.
- Cancellation analysis.
- Average preparation time.
- Date-range filters and report tables.

Administrators can explore the charts and metrics directly, filter information according to reporting periods, and review the underlying business data.

#### B.3 Relationship Between Analytics and AI

The dashboard and analytics pages provide predefined visualizations and structured reports.

The AI assistant provides a conversational alternative for exploring the same business information and requesting more specific or customized analysis.

**For example:**

| Experience | Example |
|---|---|
| **Dashboard** | Shows the current month's total sales. |
| **Analytics** | Shows monthly revenue trends and comparisons. |
| **AI Assistant** | Answers "Why did our sales decrease this month?" by examining available sales, product, and order metrics and explaining possible contributing patterns. |

All three experiences use the same underlying restaurant records to maintain consistency.

---

### C. QR-Based Restaurant Ordering System

The ordering system remains an essential part of MESA and generates the operational data used by its analytics features.

#### C.1 Table-Specific QR Menu

- Unique QR code assigned to each table.
- Mobile-friendly digital menu.
- Food and drink categories.
- Product images, descriptions, and prices.
- Availability and sold-out indicators.

#### C.2 Customer Cart and Order Submission

- Add and remove menu items.
- Modify quantities.
- Calculate subtotals and total prices.
- Add special instructions.
- Review and submit orders.
- Generate unique order references.

#### C.3 Counter Payment Through Order QR

- Generate a unique QR code for counter-payment orders.
- Allow cashiers to scan the order QR.
- Retrieve order details and total amount.
- Confirm payments through authorized staff.
- Update payment records.

#### C.4 Online Payment

- Support online checkout through an integrated payment gateway.
- Process transactions securely.
- Verify payment results through backend confirmation or webhooks.
- Handle pending, failed, and cancelled transactions.

#### C.5 Cashier Dashboard

- Display incoming orders.
- View order details, table numbers, and payment statuses.
- Retrieve orders through QR scanning.
- Confirm counter payments.
- Monitor order progress.

#### C.6 Kitchen Display

- Display confirmed orders.
- Show food items, quantities, and special instructions.
- Update orders to **Preparing** and **Ready**.
- Synchronize status updates with other interfaces.

#### C.7 Customer Order Tracking

- Allow customers to view their order progress.
- Display **Pending**, **Confirmed**, **Preparing**, **Ready**, and **Completed** statuses.

---

### D. Restaurant Administration

Administrators can manage the operational components of the restaurant.

#### D.1 Menu Management

- Create, edit, and deactivate menu items.
- Manage product descriptions, prices, and images.
- Create and manage categories.
- Update product availability.

#### D.2 Table Management

- Register and manage restaurant tables.
- Assign table identifiers.
- Generate table-specific QR codes.

#### D.3 Staff Management

- Create staff accounts.
- Assign cashier and kitchen roles.
- Manage access permissions.
- Deactivate staff accounts.

#### D.4 Order and Transaction Management

- View historical orders.
- Review transaction details.
- Monitor payment records.
- Review completed and cancelled orders.

---

## 3. AI Analytics Workflow

1. Administrator opens the AI Analytics Assistant.
2. Administrator enters a business-related question.
3. The backend authenticates the user and validates the request.
4. The AI agent identifies the required business information.
5. The agent calls predefined backend analytics functions.
6. The backend retrieves and calculates the relevant information from the database.
7. The AI interprets the returned results.
8. MESA displays the response through text, data tables, visualizations, or recommendations.
9. Administrator can continue the conversation with follow-up questions.

> **Important:** The AI must not invent numerical business information. Actual calculations and database retrieval must be handled by the backend. The AI is responsible for interpreting the verified results and presenting them in an understandable way.

---

## 4. Database and Data Sources

**Suggested database entities:**

- Users and Staff Roles
- Tables
- Menu Categories
- Menu Items
- Orders
- Order Items
- Payments
- Order Status History
- Customer Feedback *(optional)*

The ordering system continuously generates records that support the dashboard, analytics page, and AI assistant.

---

## 5. Technology Stack

| Component | Suggested Technology |
|---|---|
| Frontend | React, HTML, CSS, JavaScript |
| Backend | Node.js and Express.js |
| Database | PostgreSQL / Supabase |
| AI Integration | Gemini API or another suitable LLM API |
| Data Visualization | Chart.js |
| Real-Time Updates | Socket.IO or Supabase Realtime |
| QR Generation and Scanning | QR code libraries |
| Payment Integration | PayMongo or another supported gateway |

> The AI integration must be handled by the backend. API credentials must never be exposed in the frontend.

---

## 6. Important Business and Technical Rules

- Validate orders and menu availability on the backend.
- Calculate order totals on the server.
- Prevent duplicate order submissions.
- Keep payment status separate from order preparation status.
- Verify online payments through the payment provider.
- Restrict management and payment actions according to user roles.
- Preserve transaction records for historical analytics.
- Record timestamps for important order events.
- Ensure dashboard metrics and AI responses use consistent business rules.
- Allow AI access only to authorized and relevant business data.
- Clearly distinguish actual data from AI-generated interpretations.

---

## 7. Recommended Development Scope

Given the project timeline, prioritize a fully working core system:

1. Customer QR ordering and cart.
2. Counter payment and order QR retrieval.
3. Cashier and kitchen dashboards.
4. Menu, table, and staff management.
5. Main business dashboard.
6. Dedicated analytics and reports page.
7. AI Restaurant Analytics Assistant with natural-language queries, contextual conversations, and report generation.
8. Online payment sandbox integration, subject to available credentials.

Additional AI capabilities, such as advanced forecasting and customer feedback analysis, can be considered after the primary AI assistant is working reliably.

---

## 8. Project's Main Innovation

MESA combines a functioning restaurant ordering and management system with conventional business analytics and a conversational AI business intelligence assistant.

Its main differentiator is that restaurant administrators are not limited to predefined dashboards and reports. They can communicate directly with an AI agent, ask questions about their restaurant, request customized reports, explore business trends, and receive understandable insights based on actual operational data.

MESA transforms restaurant data from something administrators simply view into something they can actively explore through conversation.
