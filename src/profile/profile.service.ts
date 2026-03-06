import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from '../matches/matches.service';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { PartnerPreferenceDto } from './dto/partner-preference.dto';
import { Gender, MaritalStatus, EducationLevel } from '@prisma/client';
import { ERROR_MESSAGES } from '../constants/error-messages';
import { SUCCESS_MESSAGES } from '../constants/success-messages';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matchesService: MatchesService,
  ) {}

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { partnerPreference: true },
    });
    return this.sanitizeUser(user);
  }

  /** Fetch detailed profile by id. Only completed profiles; 404 otherwise. */
  async getProfileById(currentUserId: string, profileId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: profileId,
        profileCompleted: true,
      },
      select: this.publicProfileSelect(),
    });
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.PROFILE.PROFILE_NOT_FOUND);
    }
    const sanitized = this.sanitizeUser(user);
    const age =
      user.dateOfBirth != null
        ? this.getAgeFromDateOfBirth(user.dateOfBirth)
        : null;
    return { data: { ...sanitized, age } };
  }

  private getAgeFromDateOfBirth(dateOfBirth: Date): number {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  async listProfiles(
    currentUserId: string,
    options: {
      city?: 'my_city' | 'all';
      search?: string;
      minAge?: number;
      maxAge?: number;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(1, options.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { location: true },
    });

    const where: {
      profileCompleted: boolean;
      location?: string;
      AND?: Array<Record<string, unknown>>;
      OR?: Array<Record<string, unknown>>;
      dateOfBirth?: { gte?: Date; lte?: Date };
    } = {
      profileCompleted: true,
    };
    if (options.city === 'my_city' && currentUser?.location) {
      where.location = currentUser.location;
    }

    const andParts: Array<Record<string, unknown>> = [];

    if (options.search?.trim()) {
      const term = options.search.trim();
      const searchConditions: Array<Record<string, unknown>> = [
        { firstName: { contains: term, mode: 'insensitive' as const } },
        { lastName: { contains: term, mode: 'insensitive' as const } },
        { location: { contains: term, mode: 'insensitive' as const } },
      ];
      const searchAge = parseInt(term, 10);
      if (!Number.isNaN(searchAge) && searchAge >= 18 && searchAge <= 120) {
        const { gte, lte } = this.dateOfBirthRangeForAge(searchAge, searchAge);
        searchConditions.push({ dateOfBirth: { gte, lte } });
      }
      andParts.push({ OR: searchConditions });
    }

    if (options.minAge != null || options.maxAge != null) {
      const min = options.minAge ?? 18;
      const max = options.maxAge ?? 120;
      const { gte, lte } = this.dateOfBirthRangeForAge(min, max);
      andParts.push({ dateOfBirth: { gte, lte } });
    }

    if (andParts.length > 0) {
      where.AND = andParts;
    }

    const [profiles, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: this.publicProfileSelect(),
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: profiles.map((u) => this.sanitizeUser(u)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Normalize profile photo: if app sends raw base64, store as data URL so listing returns usable img src. */
  private normalizeProfilePhoto(value: string | undefined): string | undefined {
    if (value == null || value === '') return undefined;
    if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://'))
      return value;
    if (/^[A-Za-z0-9+/]*={0,2}$/.test(value.replace(/\s/g, '')))
      return `data:image/jpeg;base64,${value}`;
    return value;
  }

  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const dateOfBirth = new Date(dto.dateOfBirth);
    const profilePhoto = this.normalizeProfilePhoto(dto.profilePhoto);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        profilePhoto,
        firstName: dto.firstName,
        lastName: dto.lastName,
        gender: dto.gender as Gender,
        location: dto.location,
        maritalStatus: dto.maritalStatus as MaritalStatus,
        dateOfBirth,
        profession: dto.profession,
        education: dto.education as EducationLevel,
        height: dto.height,
        aboutYourself: dto.aboutYourself,
      },
    });

    await this.updateProfileCompletedIfDone(userId);
    await this.matchesService.findAndStoreMatchesForUser(userId);
    return { data: this.sanitizeUser(user), message: SUCCESS_MESSAGES.PROFILE.COMPLETE };
  }

  async setPartnerPreference(userId: string, dto: PartnerPreferenceDto) {
    if (dto.maxAge < dto.minAge) {
      throw new BadRequestException(ERROR_MESSAGES.PROFILE.MAX_AGE_LESS_THAN_MIN);
    }

    const preference = await this.prisma.partnerPreference.upsert({
      where: { userId },
      create: {
        userId,
        interestedIn: dto.interestedIn as Gender,
        minAge: dto.minAge,
        maxAge: dto.maxAge,
        preferredCities: dto.preferredCities,
        preferredEducation: dto.preferredEducation ?? undefined,
        preferredMaritalStatus: dto.preferredMaritalStatus ?? [],
      },
      update: {
        interestedIn: dto.interestedIn as Gender,
        minAge: dto.minAge,
        maxAge: dto.maxAge,
        preferredCities: dto.preferredCities,
        preferredEducation: dto.preferredEducation ?? undefined,
        preferredMaritalStatus: dto.preferredMaritalStatus ?? [],
      },
    });

    await this.updateProfileCompletedIfDone(userId);
    await this.matchesService.findAndStoreMatchesForUser(userId);
    return { data: preference, message: SUCCESS_MESSAGES.PROFILE.PARTNER_PREFERENCE };
  }

  private async updateProfileCompletedIfDone(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        partnerPreference: true,
      },
    });

    const hasProfileFields =
      user.firstName != null &&
      user.lastName != null &&
      user.gender != null &&
      user.dateOfBirth != null;

    if (hasProfileFields && user.partnerPreference != null) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { profileCompleted: true },
      });
    }
  }

  /** Date range so that age is between minAge and maxAge (inclusive). */
  private dateOfBirthRangeForAge(minAge: number, maxAge: number): { gte: Date; lte: Date } {
    const now = new Date();
    return {
      gte: new Date(now.getFullYear() - maxAge - 1, now.getMonth(), now.getDate()),
      lte: new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate(), 23, 59, 59, 999),
    };
  }

  private publicProfileSelect() {
    return {
      id: true,
      profilePhoto: true,
      firstName: true,
      lastName: true,
      gender: true,
      location: true,
      maritalStatus: true,
      dateOfBirth: true,
      profession: true,
      education: true,
      height: true,
      aboutYourself: true,
      profileCompleted: true,
      isVerified: true,
      isPremiumMember: true,
      createdAt: true,
      updatedAt: true,
      partnerPreference: true,
    };
  }

  private sanitizeUser(user: {
    id: string;
    email?: string;
    firstName: string | null;
    lastName: string | null;
    profileCompleted: boolean;
    [key: string]: unknown;
  }) {
    const { password: _, ...rest } = user;
    return rest;
  }
}
