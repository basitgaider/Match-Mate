import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ROUTES } from '../constants/routes';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { MessagesQueryDto } from './dto/messages-query.dto';

@Controller(ROUTES.CHAT.ROOT)
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  async getConversationList(@CurrentUser('id') userId: string) {
    return this.chatService.getConversationList(userId);
  }

  @Post(ROUTES.CHAT.WITH_USER)
  async getOrCreateConversation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.getOrCreateConversation(userId, dto.targetUserId);
  }

  @Get(`${ROUTES.CHAT.ID}/${ROUTES.CHAT.MESSAGES}`)
  async getMessages(
    @Param('conversationId') conversationId: string,
    @CurrentUser('id') userId: string,
    @Query() query: MessagesQueryDto,
  ) {
    return this.chatService.getMessages(
      conversationId,
      userId,
      query.page,
      query.limit,
    );
  }

  @Patch(`${ROUTES.CHAT.ID}/${ROUTES.CHAT.READ}`)
  async markAsRead(
    @Param('conversationId') conversationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.markAsRead(conversationId, userId);
  }
}
