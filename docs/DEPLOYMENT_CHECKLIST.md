# Deployment checklist

## Before release

- [ ] Apply Supabase migrations in numeric order, including `20261124100000_staff_pin.sql`, `20261125100000_fix_drinks_category_and_order_check.sql`, and `20261126120000_security_and_order_workflow.sql`.
- [ ] Confirm every public URL uses HTTPS. Camera/QR features require it outside localhost.
- [ ] Set `NODE_ENV=production` and an exact HTTPS `CLIENT_URL`; verify the browser Origin is accepted by CORS.
- [ ] Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (or legacy service-role key) only in the server host’s secret store. Never expose either to Vite.
- [ ] Set `ORDER_EXPIRY_MINUTES`; set `ERROR_MONITOR_WEBHOOK_URL` if a central alerting service is used.
- [ ] Start the API once with the production environment: startup must reject missing secrets and a non-HTTPS production client origin.

## Data protection and recovery

- [ ] Enable automated Supabase backups/PITR for the production project and record the retention window and restore owner.
- [ ] Run and document one restore rehearsal into a non-production project before demo day.
- [ ] Schedule `select public.expire_unpaid_orders();` (for example, every minute through Supabase Cron) so expired orders are updated even when no new request arrives.

## Verify and monitor

- [ ] Check `GET /api/health` through the deployed HTTPS URL from an external monitor.
- [ ] Alert on failed health checks, 5xx log events, database availability, and elevated rate-limit responses.
- [ ] Confirm structured request logs and error events arrive in the chosen log/monitoring sink; never log Authorization, PINs, or request bodies.
- [ ] Smoke-test customer ordering, tracking token enforcement, payment confirmation, and kitchen transitions with a non-production order.
