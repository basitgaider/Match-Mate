import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ERROR_MESSAGES } from '../constants/error-messages';
import { SUCCESS_MESSAGES } from '../constants/success-messages';
import { User, PartnerPreference } from '@prisma/client';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const WEIGHT_AGE = 0.5;
const WEIGHT_LOCATION = 0.35;
const WEIGHT_GENDER = 0.15;
const MATCH_THRESHOLD = 60;
const MAX_CANDIDATES_PER_USER = 500;

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Called when mutual favourite is detected: create match records for both users. */
  async createMatchPair(userId1: string, userId2: string) {
    await Promise.all([
      this.prisma.match.upsert({
        where: {
          userId_targetUserId: { userId: userId1, targetUserId: userId2 },
        },
        create: { userId: userId1, targetUserId: userId2 },
        update: {},
      }),
      this.prisma.match.upsert({
        where: {
          userId_targetUserId: { userId: userId2, targetUserId: userId1 },
        },
        create: { userId: userId2, targetUserId: userId1 },
        update: {},
      }),
    ]);
  }

  /** Called when a favourite is removed: delete match records for this pair. */
  async removeMatchPair(userId1: string, userId2: string) {
    await Promise.all([
      this.prisma.match.deleteMany({
        where: {
          userId: userId1,
          targetUserId: userId2,
        },
      }),
      this.prisma.match.deleteMany({
        where: {
          userId: userId2,
          targetUserId: userId1,
        },
      }),
    ]);
  }

  async getMatches(
    userId: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const page = Math.max(1, options.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const [matches, total, newCount] = await Promise.all([
      this.prisma.match.findMany({
        where: { userId },
        include: {
          targetUser: {
            select: {
              id: true,
              profilePhoto: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              location: true,
              gender: true,
              profession: true,
              education: true,
            },
          },
        },
        orderBy: [{ seenAt: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.match.count({ where: { userId } }),
      this.prisma.match.count({ where: { userId, seenAt: null } }),
    ]);

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { partnerPreference: true },
    });
    if (!currentUser) {
      return { data: [], meta: { page, limit, total, totalPages: 0 }, newMatchesCount: 0 };
    }

    const data = matches.map((m) => {
      const percentage = this.computeMatchPercentage(currentUser, m.targetUser);
      const age = m.targetUser.dateOfBirth ? this.getAge(m.targetUser.dateOfBirth) : null;
      return {
        id: m.id,
        targetUser: {
          id: m.targetUser.id,
          profilePhoto: m.targetUser.profilePhoto,
          firstName: m.targetUser.firstName,
          lastName: m.targetUser.lastName,
          age,
          location: m.targetUser.location,
          gender: m.targetUser.gender,
          profession: m.targetUser.profession,
          education: m.targetUser.education,
        },
        matchPercentage: percentage,
        isNew: m.seenAt == null,
        seenAt: m.seenAt,
        createdAt: m.createdAt,
      };
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      newMatchesCount: newCount,
    };
  }

  async markAsSeen(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });
    if (!match) {
      throw new NotFoundException(ERROR_MESSAGES.MATCHES.NOT_FOUND);
    }
    if (match.userId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.MATCHES.NOT_FOUND);
    }
    return this.prisma.match.update({
      where: { id: matchId },
      data: { seenAt: new Date() },
    });
  }

  async markAllAsSeen(userId: string) {
    await this.prisma.match.updateMany({
      where: { userId, seenAt: null },
      data: { seenAt: new Date() },
    });
    return { success: true };
  }

  /** Runs daily: find preference-based matches for all users, store new matches, send notifications. */
  @Cron('0 2 * * *')
  async runMatchJobForAllUsers() {
    const usersWithPrefs = await this.prisma.user.findMany({
      where: {
        profileCompleted: true,
        partnerPreference: { isNot: null },
      },
      select: { id: true },
    });
    for (const { id } of usersWithPrefs) {
      try {
        await this.findAndStoreMatchesForUser(id);
      } catch {
        // continue with next user
      }
    }
  }

  /** For one user: find candidates by preferences, compute score, store new matches and notify. */
  async findAndStoreMatchesForUser(userId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { partnerPreference: true },
    });
    if (!currentUser?.partnerPreference) return;

    const existingMatchTargetIds = await this.prisma.match
      .findMany({
        where: { userId },
        select: { targetUserId: true },
      })
      .then((rows) => new Set(rows.map((r) => r.targetUserId)));

    const candidates = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        profileCompleted: true,
        dateOfBirth: { not: null },
      },
      select: {
        id: true,
        profilePhoto: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        location: true,
        gender: true,
        education: true,
        profession: true,
      },
      take: MAX_CANDIDATES_PER_USER,
    });

    for (const target of candidates) {
      if (existingMatchTargetIds.has(target.id)) continue;
      const percentage = this.computeMatchPercentage(currentUser, target);
      if (percentage < MATCH_THRESHOLD) continue;

      const existing = await this.prisma.match.findUnique({
        where: {
          userId_targetUserId: { userId, targetUserId: target.id },
        },
      });
      if (existing) continue;

      await this.prisma.match.create({
        data: { userId, targetUserId: target.id },
      });
      existingMatchTargetIds.add(target.id);

      const name = target.firstName || target.lastName || 'Someone';
      await this.notificationsService.create({
        userId,
        title: SUCCESS_MESSAGES.MATCHES.NEW_MATCH_TITLE,
        body: SUCCESS_MESSAGES.MATCHES.NEW_MATCH_BODY(name),
        image: target.profilePhoto ?? undefined,
      });
    }

    // Prune existing matches that no longer meet threshold (e.g. after preference edit)
    const existingMatches = await this.prisma.match.findMany({
      where: { userId },
      include: {
        targetUser: {
          select: {
            id: true,
            dateOfBirth: true,
            location: true,
            gender: true,
            education: true,
            profession: true,
          },
        },
      },
    });
    for (const m of existingMatches) {
      const percentage = this.computeMatchPercentage(currentUser, m.targetUser);
      if (percentage < MATCH_THRESHOLD) {
        await this.prisma.match.delete({
          where: { id: m.id },
        });
      }
    }
  }

  private getAge(dateOfBirth: Date): number {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  private computeMatchPercentage(
    currentUser: User & { partnerPreference: PartnerPreference | null },
    targetUser: {
      dateOfBirth: Date | null;
      location: string | null;
      gender: string | null;
      education: string | null;
      profession: string | null;
    },
  ): number {
    const pref = currentUser.partnerPreference;
    let ageScore = 50;
    let locationScore = 50;
    let genderScore = 50;

    if (pref && targetUser.dateOfBirth) {
      const age = this.getAge(targetUser.dateOfBirth);
      if (age >= pref.minAge && age <= pref.maxAge) {
        ageScore = 100;
      } else {
        const dist = Math.min(
          Math.abs(age - pref.minAge),
          Math.abs(age - pref.maxAge),
        );
        ageScore = Math.max(0, 100 - dist * 15);
      }
    }

    if (pref?.preferredCities?.length && targetUser.location) {
      const targetLoc = targetUser.location.toLowerCase();
      const inPreferred = pref.preferredCities.some(
        (c) => c.toLowerCase() === targetLoc,
      );
      if (inPreferred) locationScore = 100;
      else if (
        currentUser.location &&
        currentUser.location.toLowerCase() === targetLoc
      ) {
        locationScore = 80;
      } else locationScore = 40;
    } else if (currentUser.location && targetUser.location) {
      if (
        currentUser.location.toLowerCase() === targetUser.location.toLowerCase()
      ) {
        locationScore = 100;
      } else locationScore = 50;
    }

    if (pref && targetUser.gender) {
      genderScore =
        pref.interestedIn === targetUser.gender ? 100 : 0;
    }

    const raw =
      ageScore * WEIGHT_AGE +
      locationScore * WEIGHT_LOCATION +
      genderScore * WEIGHT_GENDER;
    return Math.round(Math.min(100, Math.max(0, raw)));
  }
}
