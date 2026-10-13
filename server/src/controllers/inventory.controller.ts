import { Request, Response, NextFunction } from 'express';
import { inventoryService } from '../services/inventory.service.js';
import {
  createBloodBatchSchema,
  updateBloodStockSchema,
  bloodInventoryQuerySchema,
  createMedicineSchema,
  medicineCatalogQuerySchema,
  createMedicineBatchSchema,
  updateMedicineStockSchema,
  medicineInventoryQuerySchema,
  reserveStockSchema,
  releaseStockSchema,
  idParamSchema,
} from '../validators/inventory.validator.js';
import { facilityIdParamSchema } from '../validators/facility.validator.js';

// ==========================================
// 1. BLOOD COMPONENT CATALOG HANDLERS
// ==========================================

export const listBloodComponentsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const components = await inventoryService.listBloodComponents();
    res.status(200).json({
      status: 'success',
      data: components,
    });
  } catch (error) {
    next(error);
  }
};

export const getBloodComponentByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const component = await inventoryService.getBloodComponentById(id);
    res.status(200).json({
      status: 'success',
      data: component,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. MEDICINE MASTER CATALOG HANDLERS
// ==========================================

export const listMedicinesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = medicineCatalogQuerySchema.parse(req.query);
    const result = await inventoryService.listMedicines(query);
    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getMedicineByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const medicine = await inventoryService.getMedicineById(id);
    res.status(200).json({
      status: 'success',
      data: medicine,
    });
  } catch (error) {
    next(error);
  }
};

export const createMedicineHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = createMedicineSchema.parse(req.body);
    const medicine = await inventoryService.createMedicine(data, req.user);
    res.status(201).json({
      status: 'success',
      data: medicine,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. BLOOD INVENTORY HANDLERS
// ==========================================

export const createBloodBatchHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = createBloodBatchSchema.parse(req.body);
    const batch = await inventoryService.createBloodBatch(data, req.user);
    res.status(201).json({
      status: 'success',
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

export const listBloodInventoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = bloodInventoryQuerySchema.parse(req.query);
    const result = await inventoryService.listBloodInventory(query);
    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const listFacilityBloodInventoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: facilityId } = facilityIdParamSchema.parse({ id: req.params.facilityId });
    const query = bloodInventoryQuerySchema.parse({ ...req.query, facilityId });
    const result = await inventoryService.listBloodInventory(query);
    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getBloodBatchByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const batch = await inventoryService.getBloodBatchById(id);
    res.status(200).json({
      status: 'success',
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBloodStockHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const updates = updateBloodStockSchema.parse(req.body);
    const updated = await inventoryService.updateBloodStock(id, updates, req.user);
    res.status(200).json({
      status: 'success',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const reserveBloodStockHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = reserveStockSchema.parse(req.body);
    const reservation = await inventoryService.reserveBloodStock(
      id,
      body.quantity,
      body.requestItemId,
      body.holdDurationMinutes,
      req.user
    );
    res.status(201).json({
      status: 'success',
      data: reservation,
    });
  } catch (error) {
    next(error);
  }
};

export const releaseBloodStockHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = releaseStockSchema.parse(req.body);
    await inventoryService.releaseBloodStock(
      id,
      body.quantity,
      body.requestItemId,
      req.user
    );
    res.status(200).json({
      status: 'success',
      message: 'Reserved blood stock released successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. MEDICINE INVENTORY HANDLERS
// ==========================================

export const createMedicineBatchHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = createMedicineBatchSchema.parse(req.body);
    const batch = await inventoryService.createMedicineBatch(data, req.user);
    res.status(201).json({
      status: 'success',
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

export const listMedicineInventoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = medicineInventoryQuerySchema.parse(req.query);
    const result = await inventoryService.listMedicineInventory(query);
    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const listFacilityMedicineInventoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: facilityId } = facilityIdParamSchema.parse({ id: req.params.facilityId });
    const query = medicineInventoryQuerySchema.parse({ ...req.query, facilityId });
    const result = await inventoryService.listMedicineInventory(query);
    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getMedicineBatchByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const batch = await inventoryService.getMedicineBatchById(id);
    res.status(200).json({
      status: 'success',
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMedicineStockHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const updates = updateMedicineStockSchema.parse(req.body);
    const updated = await inventoryService.updateMedicineStock(id, updates, req.user);
    res.status(200).json({
      status: 'success',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const reserveMedicineStockHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = reserveStockSchema.parse(req.body);
    const reservation = await inventoryService.reserveMedicineStock(
      id,
      body.quantity,
      body.requestItemId,
      body.holdDurationMinutes,
      req.user
    );
    res.status(201).json({
      status: 'success',
      data: reservation,
    });
  } catch (error) {
    next(error);
  }
};

export const releaseMedicineStockHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = releaseStockSchema.parse(req.body);
    await inventoryService.releaseMedicineStock(
      id,
      body.quantity,
      body.requestItemId,
      req.user
    );
    res.status(200).json({
      status: 'success',
      message: 'Reserved medicine stock released successfully',
    });
  } catch (error) {
    next(error);
  }
};
