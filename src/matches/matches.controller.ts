import { Controller, Get, Patch, Param, Query, Post, UseGuards } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { ROUTES } from '../constants/routes';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ListMatchesQueryDto } from './dto/list-matches-query.dto';

@Controller(ROUTES.MATCHES.ROOT)
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  /** Trigger preference-based match job for the current user (e.g. for testing or on-demand). */
  @Post(ROUTES.MATCHES.RUN_JOB)
  async runMatchJob(@CurrentUser('id') userId: string) {
    await this.matchesService.findAndStoreMatchesForUser(userId);
    return { message: 'Match job completed' };
  }

  @Get()
  async getMatches(
    @CurrentUser('id') userId: string,
    @Query() query: ListMatchesQueryDto,
  ) {
    return this.matchesService.getMatches(userId, {
      page: query.page,
      limit: query.limit,
    });
  }

  @Patch(`${ROUTES.MATCHES.ID}/${ROUTES.MATCHES.SEEN}`)
  async markAsSeen(
    @Param('id') matchId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.matchesService.markAsSeen(matchId, userId);
  }

  @Patch(ROUTES.MATCHES.SEEN_ALL)
  async markAllAsSeen(@CurrentUser('id') userId: string) {
    return this.matchesService.markAllAsSeen(userId);
  }
}
