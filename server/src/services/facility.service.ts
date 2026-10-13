import { randomUUID } from 'node:crypto';
import {
  Facility,
  FacilityFilterOptions,
  PaginatedResult,
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

export class FacilityService {
  // Resilient memory store for ultra-fast, deterministic integration tests & offline dev
  private static facilitiesStore: Map<string, Facility> = new Map();

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
      managerUserId: data.managerUserId ?? (actor?.role === 'FACILITY_STAFF' ? actor.id : null),
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
    FacilityService.facilitiesStore.delete(id);
  }
}

export const facilityService = new FacilityService();
