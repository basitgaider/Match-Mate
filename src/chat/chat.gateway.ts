import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { ChatService } from './chat.service';

export const CHAT_EVENTS = {
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',
  SEND_MESSAGE: 'send_message',
  NEW_MESSAGE: 'new_message',
} as const;

const ROOM_PREFIX = 'conversation:';

@Injectable()
@WebSocketGateway({ cors: true, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    const token =
      client.handshake?.auth?.token ?? client.handshake?.query?.token;
    if (!token || typeof token !== 'string') {
      client.disconnect();
      return;
    }
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.authService.validateUserById(payload.sub);
      if (!user) {
        client.disconnect();
        return;
      }
      (client.data as { userId: string }).userId = user.id;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: unknown) {}

  @SubscribeMessage(CHAT_EVENTS.JOIN_CONVERSATION)
  handleJoinConversation(client: Socket, conversationId: string) {
    const userId = (client.data as { userId?: string }).userId;
    if (!userId || !conversationId) return;
    client.join(`${ROOM_PREFIX}${conversationId}`);
  }

  @SubscribeMessage(CHAT_EVENTS.LEAVE_CONVERSATION)
  handleLeaveConversation(client: Socket, conversationId: string) {
    if (conversationId) {
      client.leave(`${ROOM_PREFIX}${conversationId}`);
    }
  }

  @SubscribeMessage(CHAT_EVENTS.SEND_MESSAGE)
  async handleSendMessage(
    client: Socket,
    payload: { conversationId: string; content: string },
  ) {
    const userId = (client.data as { userId?: string }).userId;
    if (!userId || !payload?.conversationId || !payload?.content?.trim()) {
      return;
    }
    try {
      const message = await this.chatService.saveMessage(
        payload.conversationId,
        userId,
        payload.content.trim(),
      );
      this.server
        .to(`${ROOM_PREFIX}${payload.conversationId}`)
        .emit(CHAT_EVENTS.NEW_MESSAGE, message);
    } catch {
      // emit error to sender only if needed
    }
  }
}
