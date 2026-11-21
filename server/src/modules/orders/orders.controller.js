import {
  createOrder,
  getActiveTable,
  getCustomerMenu,
  getOrderByReference,
} from "./orders.service.js";

// Return a customer-safe table label or a not-found response.
export async function getTable(req, res, next) {
  try {
    const table = await getActiveTable(req.params.tableCode);
    if (!table) {
      const error = new Error("Table not found or inactive.");
      error.statusCode = 404;
      error.code = "TABLE_NOT_FOUND";
      throw error;
    }
    res.json({ tableCode: table.table_code, label: table.label });
  } catch (error) {
    next(error);
  }
}

// Return active categories and their customer-visible menu items.
export async function getMenu(_req, res, next) {
  try {
    res.json({ categories: await getCustomerMenu() });
  } catch (error) {
    next(error);
  }
}

// Validate and create an order, or repeat an idempotent submission.
export async function postOrder(req, res, next) {
  try {
    const result = await createOrder(req.validatedOrder);
    res.status(result.isNew ? 201 : 200).json(result.order);
  } catch (error) {
    next(error);
  }
}

// Return one order by its human-readable order reference.
export async function getOrder(req, res, next) {
  try {
    const order = await getOrderByReference(req.params.orderRef);
    if (!order) {
      const error = new Error("Order not found.");
      error.statusCode = 404;
      error.code = "ORDER_NOT_FOUND";
      throw error;
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
}
