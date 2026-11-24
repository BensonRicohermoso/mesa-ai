import {
  createTable,
  getAllTables,
  setTableStatus,
  updateTable,
} from "./tables.service.js";
import {
  validateTable,
  validateTableId,
  validateTableStatus,
} from "./tables.validators.js";

export async function getTables(_req, res, next) {
  try {
    const tables = await getAllTables();
    res.json({ tables });
  } catch (error) {
    next(error);
  }
}

export async function postTable(req, res, next) {
  try {
    const validated = validateTable(req.body);
    const table = await createTable(validated);
    res.status(201).json(table);
  } catch (error) {
    next(error);
  }
}

export async function putTable(req, res, next) {
  try {
    const id = validateTableId(req.params.id);
    const validated = validateTable(req.body);
    const table = await updateTable(id, validated);
    res.json(table);
  } catch (error) {
    next(error);
  }
}

export async function patchTableStatus(req, res, next) {
  try {
    const id = validateTableId(req.params.id);
    const { isActive } = validateTableStatus(req.body);
    const table = await setTableStatus(id, isActive);
    res.json(table);
  } catch (error) {
    next(error);
  }
}
