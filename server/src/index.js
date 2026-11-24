import "dotenv/config";
import cors from "cors";
import express from "express";
import { env } from "./config/server-config.js";
import authRoutes from "./modules/auth/auth.routes.js";
import menuRoutes from "./modules/menu/menu.routes.js";
import tablesRoutes from "./modules/tables/tables.routes.js";
import ordersRoutes from "./modules/orders/orders.routes.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/errorHandler.js";

const app = express();

app.use(cors({ origin: env.CLIENT_URL }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/tables", tablesRoutes);
app.use("/api", ordersRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});
