# MESA-AI Staff Accounts & Credentials

This document contains staff test credentials, roles, and shift security workflows for the MESA-AI restaurant terminal system.

---

## 1. Active Staff Accounts

All staff accounts are pre-configured in Supabase Auth and linked to `public.staff_profiles`.

| Role | Staff Name | Email | Master Password | Quick Switch PIN | Permitted Workspaces |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Admin** | Admin | `admin@gmail.com` | `weareithink` | **`1234`** | `/owner` (Full Management, Analytics, AI) |
| **Cashier** | Cashier | `cashier@gmail.com` | `weareithink` | **`2222`** | `/pos` (Orders, Tables, Billing) |
| **Kitchen** | Kitchen Staff | `kitchen@gmail.com` | `weareithink` | **`3333`** | `/kds` (Kitchen Display System) |

---

## 2. Shift & Terminal Lifecycle (POS Shift Model)

Restaurant floor terminals (POS and KDS) operate under a **6-Hour Shift Model**:

```
[1. Shift Clock-In]
   └─► Master sign-in once per shift using Email + Password.
   └─► 6-Hour Shift Timer begins.
         │
         ▼
[2. Floor Shift Operations (PIN-Only)]
   ├─► Screen lock / idle timeout (10 min): Prompts for 4-digit PIN to resume.
   ├─► Browser refresh / tab reopen: Prompts for 4-digit PIN (no password needed).
   └─► Shift handoff: Tap "Switch Staff" → pick incoming operator → enter PIN.
         │
         ▼
[3. Shift End (After 6 Hours)]
   └─► Shift expires automatically.
   └─► Terminal logs out to protect station; full Email + Password required to start next shift.
```

---

## 3. Security Specifications

- **6-Hour Shift Window**: Sessions carry a hard `shiftExpiresAt` timestamp. Proactive token refresh keeps Supabase tokens fresh within the shift window without extending the master 6-hour period.
- **Inactivity Auto-Lock**: 10 minutes of no user interaction (touch, click, keypress) automatically engages the **Lock Screen** overlay.
- **PIN Keypad**: Strict 4-digit numeric keypad (`○ ○ ○ ○`) with tactile touch response and auto-submit upon entering the 4th digit.
- **Rate Limiting**:
  - `POST /api/auth/login`: Maximum 10 attempts per 15 minutes per IP.
  - `POST /api/auth/pin-switch`: Maximum 15 attempts per 5 minutes per IP.

---

## 4. Auth API Reference

| Endpoint | Method | Auth Required | Purpose |
| :--- | :---: | :---: | :--- |
| `/api/auth/login` | `POST` | No (Rate-limited) | Master email + password shift sign-in |
| `/api/auth/refresh` | `POST` | No | Silent proactive access token renewal |
| `/api/auth/staff` | `GET` | No | Returns list of active staff for terminal avatar switcher |
| `/api/auth/pin-switch` | `POST` | No (Rate-limited) | Fast operator switch by 4-digit PIN |
| `/api/auth/me` | `GET` | Bearer Token | Retrieves current authenticated staff identity |
| `/api/auth/pin` | `POST` | Bearer Token | Staff sets or updates their personal 4-digit PIN |
| `/api/auth/logout` | `POST` | Bearer Token | Revokes active session server-side |
