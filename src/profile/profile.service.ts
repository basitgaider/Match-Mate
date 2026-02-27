import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from '../matches/matches.service';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { PartnerPreferenceDto } from './dto/partner-preference.dto';
import { Gender, MaritalStatus } from '@prisma/client';
import { ERROR_MESSAGES } from '../constants/error-messages';

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

  async listProfiles(
    currentUserId: string,
    options: { city?: 'my_city' | 'all'; page?: number; limit?: number },
  ) {
    const page = Math.max(1, options.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { location: true },
    });

    const where: { profileCompleted: boolean; id?: { not: string }; location?: string } = {
      profileCompleted: true,
      id: { not: currentUserId },
    };
    if (options.city === 'my_city' && currentUser?.location) {
      where.location = currentUser.location;
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

  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const dateOfBirth = new Date(dto.dateOfBirth);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        profilePhoto: dto.profilePhoto,
        firstName: dto.firstName,
        lastName: dto.lastName,
        gender: dto.gender as Gender,
        location: dto.location,
        maritalStatus: dto.maritalStatus as MaritalStatus,
        dateOfBirth,
        profession: dto.profession,
        education: dto.education,
        height: dto.height,
        aboutYourself: dto.aboutYourself,
      },
    });

    await this.updateProfileCompletedIfDone(userId);
    await this.matchesService.findAndStoreMatchesForUser(userId);
    return this.sanitizeUser(user);
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
      },
      update: {
        interestedIn: dto.interestedIn as Gender,
        minAge: dto.minAge,
        maxAge: dto.maxAge,
        preferredCities: dto.preferredCities,
      },
    });

    await this.updateProfileCompletedIfDone(userId);
    await this.matchesService.findAndStoreMatchesForUser(userId);
    return preference;
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
