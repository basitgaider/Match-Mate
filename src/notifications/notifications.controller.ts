import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ROUTES } from '../constants/routes';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

@Controller(ROUTES.NOTIFICATIONS.ROOT)
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.findAll(userId, {
      unreadOnly: query.unreadOnly,
      page: query.page,
      limit: query.limit,
    });
  }

  @Patch(`${ROUTES.NOTIFICATIONS.ID}/${ROUTES.NOTIFICATIONS.READ}`)
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch(ROUTES.NOTIFICATIONS.MARK_ALL_READ)
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }
}
