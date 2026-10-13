import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { facilityService } from '../services/facility.service.js';
import {
  createFacilitySchema,
  updateFacilitySchema,
  facilityQuerySchema,
  facilityIdParamSchema,
} from '../validators/facility.validator.js';
import { UnauthorizedError } from '../errors/appError.js';

export const createFacilityHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createFacilitySchema.parse(req.body);
    const facility = await facilityService.createFacility(validatedData, req.user);
    res.status(201).json({
      status: 'success',
      data: facility,
    });
  } catch (error) {
    next(error);
  }
};

export const listFacilitiesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = facilityQuerySchema.parse(req.query);
    const result = await facilityService.listFacilities(query);
    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getFacilityByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = facilityIdParamSchema.parse(req.params);
    const facility = await facilityService.getFacilityById(id);
    res.status(200).json({
      status: 'success',
      data: facility,
    });
  } catch (error) {
    next(error);
  }
};

export const updateFacilityHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = facilityIdParamSchema.parse(req.params);
    const updates = updateFacilitySchema.parse(req.body);
    const facility = await facilityService.updateFacility(id, updates, req.user);
    res.status(200).json({
      status: 'success',
      data: facility,
    });
  } catch (error) {
    next(error);
  }
};

const verifyBodySchema = z.object({
  isVerified: z.boolean(),
});

export const setVerificationStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required to verify facilities');
    }
    const { id } = facilityIdParamSchema.parse(req.params);
    const { isVerified } = verifyBodySchema.parse(req.body);
    const facility = await facilityService.setVerificationStatus(
      id,
      isVerified,
      req.user
    );
    res.status(200).json({
      status: 'success',
      data: facility,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFacilityHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required to delete facilities');
    }
    const { id } = facilityIdParamSchema.parse(req.params);
    await facilityService.deleteFacility(id, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Facility removed successfully',
    });
  } catch (error) {
    next(error);
  }
};
