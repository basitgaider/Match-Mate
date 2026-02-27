import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from '../matches/matches.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ERROR_MESSAGES } from '../constants/error-messages';
import { SUCCESS_MESSAGES } from '../constants/success-messages';

@Injectable()
export class FavouritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matchesService: MatchesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async addFavourite(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException(ERROR_MESSAGES.FAVOURITES.CANNOT_FAVOURITE_SELF);
    }

    const targetExists = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetExists) {
      throw new NotFoundException(ERROR_MESSAGES.FAVOURITES.TARGET_USER_NOT_FOUND);
    }

    const existing = await this.prisma.favourite.findUnique({
      where: {
        userId_targetUserId: { userId, targetUserId },
      },
    });
    if (existing) {
      throw new ConflictException(ERROR_MESSAGES.FAVOURITES.ALREADY_FAVOURITED);
    }

    await this.prisma.favourite.create({
      data: { userId, targetUserId },
    });

    const mutual = await this.prisma.favourite.findUnique({
      where: {
        userId_targetUserId: { userId: targetUserId, targetUserId: userId },
      },
    });
    if (mutual) {
      await this.matchesService.createMatchPair(userId, targetUserId);
      const [me, other] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true, profilePhoto: true },
        }),
        this.prisma.user.findUnique({
          where: { id: targetUserId },
          select: { firstName: true, lastName: true, profilePhoto: true },
        }),
      ]);
      const myName = me?.firstName || me?.lastName || 'Someone';
      const otherName = other?.firstName || other?.lastName || 'Someone';
      await Promise.all([
        this.notificationsService.create({
          userId,
          title: SUCCESS_MESSAGES.MATCHES.LIKED_BACK_TITLE(otherName),
          body: SUCCESS_MESSAGES.MATCHES.LIKED_BACK_BODY,
          image: other?.profilePhoto ?? undefined,
        }),
        this.notificationsService.create({
          userId: targetUserId,
          title: SUCCESS_MESSAGES.MATCHES.LIKED_BACK_TITLE(myName),
          body: SUCCESS_MESSAGES.MATCHES.LIKED_BACK_BODY,
          image: me?.profilePhoto ?? undefined,
        }),
      ]);
    }

    return { message: 'Added to favourites', targetUserId };
  }

  async removeFavourite(userId: string, targetUserId: string) {
    const favourite = await this.prisma.favourite.findUnique({
      where: {
        userId_targetUserId: { userId, targetUserId },
      },
    });
    if (!favourite) {
      throw new NotFoundException(ERROR_MESSAGES.FAVOURITES.NOT_IN_FAVOURITES);
    }

    await this.prisma.favourite.delete({
      where: {
        userId_targetUserId: { userId, targetUserId },
      },
    });

    await this.matchesService.removeMatchPair(userId, targetUserId);

    return { message: 'Removed from favourites', targetUserId };
  }

  async getFavourites(userId: string) {
    const favourites = await this.prisma.favourite.findMany({
      where: { userId },
      include: {
        targetUser: {
          select: {
            id: true,
            profilePhoto: true,
            firstName: true,
            lastName: true,
            gender: true,
            location: true,
            dateOfBirth: true,
            profession: true,
            profileCompleted: true,
            createdAt: true,
            updatedAt: true,
            partnerPreference: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favourites.map((f) => ({
      favouritedAt: f.createdAt,
      profile: f.targetUser,
    }));
  }
}
