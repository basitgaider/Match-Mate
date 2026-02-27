import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  @IsNotEmpty()
  targetUserId: string;
}
