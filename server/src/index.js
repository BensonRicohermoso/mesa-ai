import "dotenv/config";
import cors from "cors";
import express from "express";
import { env } from "./config/server-config.js";
import authRoutes from "./modules/auth/auth.routes.js";
import menuRoutes from "./modules/menu/menu.routes.js";
import tablesRoutes from "./modules/tables/tables.routes.js";
import staffRoutes from "./modules/staff/staff.routes.js";
import ordersRoutes from "./modules/orders/orders.routes.js";
import aiRoutes from "./modules/ai/ai.routes.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/errorHandler.js";

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow any localhost origin in development
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    // Allow the configured CLIENT_URL in production
    if (origin === env.CLIENT_URL) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/tables", tablesRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api", ordersRoutes);
app.use("/api/ai", aiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});
