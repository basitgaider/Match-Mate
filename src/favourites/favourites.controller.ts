import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FavouritesService } from './favourites.service';
import { ROUTES } from '../constants/routes';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller(ROUTES.FAVOURITES.ROOT)
@UseGuards(JwtAuthGuard)
export class FavouritesController {
  constructor(private readonly favouritesService: FavouritesService) {}

  @Get(ROUTES.FAVOURITES.LIST)
  async getFavourites(@CurrentUser('id') userId: string) {
    return this.favouritesService.getFavourites(userId);
  }

  @Post(ROUTES.FAVOURITES.ID)
  async addFavourite(
    @CurrentUser('id') userId: string,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.favouritesService.addFavourite(userId, targetUserId);
  }

  @Delete(ROUTES.FAVOURITES.ID)
  async removeFavourite(
    @CurrentUser('id') userId: string,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.favouritesService.removeFavourite(userId, targetUserId);
  }
}
