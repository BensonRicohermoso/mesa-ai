import {
  getAllStaff,
  provisionStaff,
  setStaffStatus,
  updateStaff,
} from "./staff.service.js";
import {
  validateProvisionStaff,
  validateStaffId,
  validateStaffStatus,
  validateUpdateStaff,
} from "./staff.validators.js";

export async function getStaff(_req, res, next) {
  try {
    const staff = await getAllStaff();
    res.json({ staff });
  } catch (error) {
    next(error);
  }
}

export async function postStaff(req, res, next) {
  try {
    const validated = validateProvisionStaff(req.body);
    const created = await provisionStaff(validated);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function putStaff(req, res, next) {
  try {
    const id = validateStaffId(req.params.id);
    const validated = validateUpdateStaff(req.body);
    const updated = await updateStaff(id, validated);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function patchStaffStatus(req, res, next) {
  try {
    const id = validateStaffId(req.params.id);
    const { isActive } = validateStaffStatus(req.body);
    const updated = await setStaffStatus(id, isActive);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}
