import { randomUUID } from 'node:crypto';
import {
  Facility,
  FacilityFilterOptions,
  PaginatedResult,
  OperatingHours,
} from '../types/facility.types.js';
import { AuthUser } from '../types/auth.types.js';
import {
  CreateFacilityInput,
  UpdateFacilityInput,
} from '../validators/facility.validator.js';
import {
  NotFoundError,
  ForbiddenError,
} from '../errors/appError.js';
import { getPrismaClient } from '../db/prisma.js';

export class FacilityService {
  // Resilient memory store for ultra-fast, deterministic unit tests & offline dev
  private static facilitiesStore: Map<string, Facility> = new Map();

  private static isPostgres(): boolean {
    return process.env.STORAGE_DRIVER === 'postgres';
  }

  private toFacility(record: {
    id: string;
    name: string;
    facilityType: string;
    address: string;
    city: string;
    state: string;
    postalCode: string | null;
    latitude: unknown;
    longitude: unknown;
    contactPhone: string;
    contactEmail: string | null;
    operatingHours: unknown;
    isVerified: boolean;
    managerUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Facility {
    return {
      id: record.id,
      name: record.name,
      facilityType: record.facilityType as Facility['facilityType'],
      address: record.address,
      city: record.city,
      state: record.state,
      postalCode: record.postalCode,
      latitude:
        record.latitude !== null && record.latitude !== undefined
          ? Number(record.latitude)
          : null,
      longitude:
        record.longitude !== null && record.longitude !== undefined
          ? Number(record.longitude)
          : null,
      contactPhone: record.contactPhone,
      contactEmail: record.contactEmail,
      operatingHours: record.operatingHours as OperatingHours | null,
      isVerified: record.isVerified,
      managerUserId: record.managerUserId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Resets the store — useful for isolated integration testing suites
   */
  public static resetStore(): void {
    FacilityService.facilitiesStore.clear();
  }

  /**
   * Seed store with initial facility data (e.g. for testing)
   */
  public static seedStore(facilities: Facility[]): void {
    for (const facility of facilities) {
      FacilityService.facilitiesStore.set(facility.id, facility);
    }
  }

  /**
   * Creates a new facility with validation and role enforcement
   */
  public async createFacility(
    data: CreateFacilityInput,
    actor?: AuthUser
  ): Promise<Facility> {
    // Ordinary users / staff cannot self-promote to verified status
    let isVerified = false;
    if (data.isVerified !== undefined) {
      if (actor?.role !== 'ADMIN' && data.isVerified === true) {
        throw new ForbiddenError(
          'Only administrators have permission to create verified facilities'
        );
      }
      if (actor?.role === 'ADMIN') {
        isVerified = data.isVerified;
      }
    }

    const managerUserId =
      data.managerUserId ??
      (actor?.role === 'FACILITY_STAFF' ? actor.id : null);

    if (FacilityService.isPostgres()) {
      const prisma = getPrismaClient();
      const created = await prisma.facility.create({
        data: {
          name: data.name,
          facilityType: data.facilityType,
          address: data.address,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode ?? null,
          latitude:
            data.latitude !== undefined && data.latitude !== null
              ? data.latitude
              : null,
          longitude:
            data.longitude !== undefined && data.longitude !== null
              ? data.longitude
              : null,
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail ?? null,
          operatingHours: (data.operatingHours as any) ?? null,
          isVerified,
          managerUserId,
        },
      });
      return this.toFacility(created);
    }

    const now = new Date();
    const facility: Facility = {
      id: randomUUID(),
      name: data.name,
      facilityType: data.facilityType,
      address: data.address,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail ?? null,
      operatingHours: data.operatingHours ?? null,
      isVerified,
      managerUserId,
      createdAt: now,
      updatedAt: now,
    };

    FacilityService.facilitiesStore.set(facility.id, facility);
    return facility;
  }

  /**
   * Retrieves a facility by its UUID
   */
  public async getFacilityById(id: string): Promise<Facility> {
    if (FacilityService.isPostgres()) {
      const prisma = getPrismaClient();
      const facility = await prisma.facility.findUnique({
        where: { id },
      });
      if (!facility) {
        throw new NotFoundError(`Facility with ID '${id}' was not found`);
      }
      return this.toFacility(facility);
    }

    const facility = FacilityService.facilitiesStore.get(id);
    if (!facility) {
      throw new NotFoundError(`Facility with ID '${id}' was not found`);
    }
    return facility;
  }

  /**
   * Lists facilities with filtering, search, and pagination
   */
  public async listFacilities(
    options: FacilityFilterOptions
  ): Promise<PaginatedResult<Facility>> {
    if (FacilityService.isPostgres()) {
      const prisma = getPrismaClient();
      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (options.city) {
        where.city = { contains: options.city, mode: 'insensitive' };
      }
      if (options.state) {
        where.state = { contains: options.state, mode: 'insensitive' };
      }
      if (options.facilityType) {
        where.facilityType = options.facilityType;
      }
      if (options.isVerified !== undefined) {
        where.isVerified = options.isVerified;
      }
      if (options.search) {
        where.OR = [
          { name: { contains: options.search, mode: 'insensitive' } },
          { address: { contains: options.search, mode: 'insensitive' } },
          { city: { contains: options.search, mode: 'insensitive' } },
        ];
      }

      const [records, total] = await Promise.all([
        prisma.facility.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.facility.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;
      return {
        data: records.map((r) => this.toFacility(r)),
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    }

    let facilities = Array.from(FacilityService.facilitiesStore.values());

    // Filter by city (case-insensitive substring)
    if (options.city) {
      const cityQuery = options.city.toLowerCase();
      facilities = facilities.filter((f) =>
        f.city.toLowerCase().includes(cityQuery)
      );
    }

    // Filter by state (case-insensitive substring)
    if (options.state) {
      const stateQuery = options.state.toLowerCase();
      facilities = facilities.filter((f) =>
        f.state.toLowerCase().includes(stateQuery)
      );
    }

    // Filter by facilityType
    if (options.facilityType) {
      facilities = facilities.filter((f) => f.facilityType === options.facilityType);
    }

    // Filter by isVerified status
    if (options.isVerified !== undefined) {
      facilities = facilities.filter((f) => f.isVerified === options.isVerified);
    }

    // Multi-criteria text search across name, address, and city
    if (options.search) {
      const searchQuery = options.search.toLowerCase();
      facilities = facilities.filter(
        (f) =>
          f.name.toLowerCase().includes(searchQuery) ||
          f.address.toLowerCase().includes(searchQuery) ||
          f.city.toLowerCase().includes(searchQuery)
      );
    }

    // Sort by creation date descending
    facilities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = facilities.length;
    const page = options.page || 1;
    const limit = options.limit || 10;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedData = facilities.slice(startIndex, startIndex + limit);

    return {
      data: paginatedData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Updates an existing facility, enforcing strict RBAC rules
   */
  public async updateFacility(
    id: string,
    updates: UpdateFacilityInput,
    actor?: AuthUser
  ): Promise<Facility> {
    const existing = await this.getFacilityById(id);

    // SECURITY RBAC ENFORCEMENT
    if (!actor) {
      throw new ForbiddenError('Authentication required to modify facility');
    }

    if (actor.role === 'USER') {
      throw new ForbiddenError(
        'Ordinary users are not authorized to modify facility records'
      );
    }

    if (actor.role === 'FACILITY_STAFF') {
      // Facility staff can ONLY modify their own assigned facility
      const managesFacility =
        actor.facilityId === existing.id || existing.managerUserId === actor.id;
      if (!managesFacility) {
        throw new ForbiddenError(
          'Facility staff are not authorized to modify facilities they do not manage'
        );
      }

      // Facility staff CANNOT promote facility to verified status
      if (updates.isVerified !== undefined && updates.isVerified !== existing.isVerified) {
        throw new ForbiddenError(
          'Only administrators have permission to update facility verification status'
        );
      }
    }

    if (FacilityService.isPostgres()) {
      const prisma = getPrismaClient();
      const updated = await prisma.facility.update({
        where: { id },
        data: {
          ...(updates.name !== undefined ? { name: updates.name } : {}),
          ...(updates.facilityType !== undefined
            ? { facilityType: updates.facilityType }
            : {}),
          ...(updates.address !== undefined ? { address: updates.address } : {}),
          ...(updates.city !== undefined ? { city: updates.city } : {}),
          ...(updates.state !== undefined ? { state: updates.state } : {}),
          ...(updates.postalCode !== undefined
            ? { postalCode: updates.postalCode ?? null }
            : {}),
          ...(updates.latitude !== undefined
            ? { latitude: updates.latitude ?? null }
            : {}),
          ...(updates.longitude !== undefined
            ? { longitude: updates.longitude ?? null }
            : {}),
          ...(updates.contactPhone !== undefined
            ? { contactPhone: updates.contactPhone }
            : {}),
          ...(updates.contactEmail !== undefined
            ? { contactEmail: updates.contactEmail ?? null }
            : {}),
          ...(updates.operatingHours !== undefined
            ? { operatingHours: (updates.operatingHours as any) ?? null }
            : {}),
          ...(updates.isVerified !== undefined && actor.role === 'ADMIN'
            ? { isVerified: updates.isVerified }
            : {}),
          ...(updates.managerUserId !== undefined && actor.role === 'ADMIN'
            ? { managerUserId: updates.managerUserId ?? null }
            : {}),
          updatedAt: new Date(),
        },
      });
      return this.toFacility(updated);
    }

    const updated: Facility = {
      ...existing,
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.facilityType !== undefined
        ? { facilityType: updates.facilityType }
        : {}),
      ...(updates.address !== undefined ? { address: updates.address } : {}),
      ...(updates.city !== undefined ? { city: updates.city } : {}),
      ...(updates.state !== undefined ? { state: updates.state } : {}),
      ...(updates.postalCode !== undefined
        ? { postalCode: updates.postalCode ?? null }
        : {}),
      ...(updates.latitude !== undefined
        ? { latitude: updates.latitude ?? null }
        : {}),
      ...(updates.longitude !== undefined
        ? { longitude: updates.longitude ?? null }
        : {}),
      ...(updates.contactPhone !== undefined
        ? { contactPhone: updates.contactPhone }
        : {}),
      ...(updates.contactEmail !== undefined
        ? { contactEmail: updates.contactEmail ?? null }
        : {}),
      ...(updates.operatingHours !== undefined
        ? { operatingHours: updates.operatingHours ?? null }
        : {}),
      ...(updates.isVerified !== undefined && actor.role === 'ADMIN'
        ? { isVerified: updates.isVerified }
        : {}),
      ...(updates.managerUserId !== undefined && actor.role === 'ADMIN'
        ? { managerUserId: updates.managerUserId ?? null }
        : {}),
      updatedAt: new Date(),
    };

    FacilityService.facilitiesStore.set(id, updated);
    return updated;
  }

  /**
   * Promotes/updates verification status (ADMIN only)
   */
  public async setVerificationStatus(
    id: string,
    isVerified: boolean,
    actor: AuthUser
  ): Promise<Facility> {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenError(
        'Only administrators have permission to verify or unverify facilities'
      );
    }

    await this.getFacilityById(id);

    if (FacilityService.isPostgres()) {
      const prisma = getPrismaClient();
      const updated = await prisma.facility.update({
        where: { id },
        data: {
          isVerified,
          updatedAt: new Date(),
        },
      });
      return this.toFacility(updated);
    }

    const existing = await this.getFacilityById(id);
    const updated: Facility = {
      ...existing,
      isVerified,
      updatedAt: new Date(),
    };

    FacilityService.facilitiesStore.set(id, updated);
    return updated;
  }

  /**
   * Deletes a facility (ADMIN only)
   */
  public async deleteFacility(id: string, actor: AuthUser): Promise<void> {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenError(
        'Only administrators have permission to delete facility records'
      );
    }

    await this.getFacilityById(id);

    if (FacilityService.isPostgres()) {
      const prisma = getPrismaClient();
      await prisma.facility.delete({ where: { id } });
      return;
    }

    FacilityService.facilitiesStore.delete(id);
  }
}

export const facilityService = new FacilityService();
