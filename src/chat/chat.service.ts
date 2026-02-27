import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ERROR_MESSAGES } from '../constants/error-messages';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getConversationList(userId: string) {
    const participants = await this.prisma.participant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { sender: { select: { id: true, firstName: true, lastName: true } } },
            },
            participants: {
              where: { userId: { not: userId } },
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    profilePhoto: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const unreadCounts = await Promise.all(
      participants.map((p) => this.getUnreadCountForParticipant(p)),
    );
    let totalUnread = 0;
    const list = participants.map((p, i) => {
      const conv = p.conversation;
      const lastMessage = conv.messages[0] ?? null;
      const otherParticipant = conv.participants[0]?.user ?? null;
      const unreadCount = unreadCounts[i];
      totalUnread += unreadCount;

      return {
        conversationId: conv.id,
        otherUser: otherParticipant,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
              sender: lastMessage.sender,
            }
          : null,
        unreadCount,
        lastReadAt: p.lastReadAt,
      };
    });

    return { conversations: list, totalUnread };
  }

  async getOrCreateConversation(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new ForbiddenException('Cannot create conversation with yourself');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException(ERROR_MESSAGES.CHAT.USER_NOT_FOUND);
    }

    const convsWithBoth = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: true,
      },
    });

    const found = convsWithBoth.find(
      (c) =>
        c.participants.length === 2 &&
        c.participants.some((p) => p.userId === userId) &&
        c.participants.some((p) => p.userId === targetUserId),
    );

    if (found) {
      return this.prisma.conversation.findUniqueOrThrow({
        where: { id: found.id },
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, profilePhoto: true },
              },
            },
          },
        },
      });
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId }, { userId: targetUserId }],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, profilePhoto: true },
            },
          },
        },
      },
    });

    return conversation;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_LIMIT,
  ) {
    const participant = await this.prisma.participant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });
    if (!participant) {
      throw new ForbiddenException(ERROR_MESSAGES.CHAT.NOT_PARTICIPANT);
    }

    const skip = (Math.max(1, page) - 1) * Math.min(MAX_LIMIT, Math.max(1, limit));
    const take = Math.min(MAX_LIMIT, Math.max(1, limit));

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      data: messages.reverse(),
      meta: {
        page: Math.max(1, page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async markAsRead(conversationId: string, userId: string) {
    const participant = await this.prisma.participant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });
    if (!participant) {
      throw new ForbiddenException(ERROR_MESSAGES.CHAT.NOT_PARTICIPANT);
    }

    await this.prisma.participant.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: { lastReadAt: new Date() },
    });

    return { success: true };
  }

  async saveMessage(conversationId: string, senderId: string, content: string) {
    const participant = await this.prisma.participant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: senderId },
      },
    });
    if (!participant) {
      throw new ForbiddenException(ERROR_MESSAGES.CHAT.NOT_PARTICIPANT);
    }

    const message = await this.prisma.message.create({
      data: { conversationId, senderId, content },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return message;
  }

  private async getUnreadCountForParticipant(participant: {
    conversationId: string;
    userId: string;
    lastReadAt: Date | null;
  }): Promise<number> {
    const where: {
      conversationId: string;
      senderId: { not: string };
      createdAt?: { gt: Date };
    } = {
      conversationId: participant.conversationId,
      senderId: { not: participant.userId },
    };
    if (participant.lastReadAt) {
      where.createdAt = { gt: participant.lastReadAt };
    }
    return this.prisma.message.count({ where });
  }
}
