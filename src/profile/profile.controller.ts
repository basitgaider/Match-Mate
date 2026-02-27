import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { PartnerPreferenceDto } from './dto/partner-preference.dto';
import { ListProfilesQueryDto } from './dto/list-profiles-query.dto';
import { ROUTES } from '../constants/routes';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller(ROUTES.PROFILE.ROOT)
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get(ROUTES.PROFILE.ME)
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.profileService.getMyProfile(userId);
  }

  @Get(ROUTES.PROFILE.LIST)
  async listProfiles(
    @CurrentUser('id') userId: string,
    @Query() query: ListProfilesQueryDto,
  ) {
    return this.profileService.listProfiles(userId, {
      city: query.city,
      page: query.page,
      limit: query.limit,
    });
  }

  @Patch(ROUTES.PROFILE.COMPLETE)
  async completeProfile(
    @Body() dto: CompleteProfileDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.profileService.completeProfile(userId, dto);
  }

  @Patch(ROUTES.PROFILE.PARTNER_PREFERENCE)
  async setPartnerPreference(
    @Body() dto: PartnerPreferenceDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.profileService.setPartnerPreference(userId, dto);
  }
}
