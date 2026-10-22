import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  ParseIntPipe,
  Query,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LevelsService } from './levels.service';
import { RequirePermissions, Public } from '../auth/permissions.decorator';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import {
  UpdateLevelConfigDto,
  AwardXpDto,
  SetUserVipDto,
  UpdateVipSettingsDto,
  TestEntranceDto,
  VipAnnouncementDto,
  RecordVisitDto,
  SetCustomIdDto,
} from './dto/level.dto';

@ApiTags('VIP & Level Progression System')
@Controller('api/levels')
export class LevelsController {
  constructor(private readonly levelsService: LevelsService) {}

  private assertSelfOrStaff(req: any, targetUserId: string) {
    const isStaff = req.user?.isStaff === true || ['SUPER_ADMIN', 'AGENCY_ADMIN'].includes(req.user?.role);
    if (!isStaff && targetUserId !== req.user?.id) {
      throw new ForbiddenException('You can only manage your own account settings.');
    }
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all 8 independent VIP level configurations ($500 to $15,000)' })
  @ApiResponse({ status: 200, description: 'List of all 8 VIP stages' })
  async getLevels() {
    return this.levelsService.getLevels();
  }

  @Public()
  @Get('configs')
  @ApiOperation({ summary: 'Alias: Get all VIP configurations' })
  async getVipConfigs() {
    return this.levelsService.getLevels();
  }

  @Public()
  @Get('features')
  @ApiOperation({ summary: 'Get the canonical catalog of toggleable VIP benefits grouped by category' })
  async getFeatureCatalog() {
    return this.levelsService.getFeatureCatalog();
  }

  @Get('user/:userId')
  @UseGuards(UserAuthGuard)
  @ApiOperation({ summary: 'Get user VIP status, recharge progress, unlocked perks & privacy toggles' })
  async getUserVipStatus(@Param('userId') userId: string, @Request() req: any) {
    const isStaff = req.user?.isStaff === true || ['SUPER_ADMIN', 'AGENCY_ADMIN'].includes(req.user?.role);
    if (!isStaff && userId !== req.user?.id) {
      throw new ForbiddenException('You can only view your own VIP status.');
    }
    return this.levelsService.getUserVipStatus(userId);
  }

  @Public()
  @Get(':level')
  @ApiOperation({ summary: 'Get single VIP level configuration' })
  async getLevel(@Param('level', ParseIntPipe) level: number) {
    return this.levelsService.getLevel(level);
  }

  @Put(':level')
  @RequirePermissions('vip.manage')
  @ApiOperation({ summary: 'Admin updates VIP parameters, threshold, frame, badges, perks, or feature flags' })
  async updateLevel(
    @Param('level', ParseIntPipe) level: number,
    @Body() dto: UpdateLevelConfigDto,
  ) {
    return this.levelsService.updateLevel(level, dto);
  }

  @Put('user/:userId/settings')
  @UseGuards(UserAuthGuard)
  @ApiOperation({ summary: 'User updates personal VIP privacy toggles (Mystery mode, hide location, etc.)' })
  async updateVipSettings(
    @Param('userId') userId: string,
    @Request() req: any,
    @Body() dto: UpdateVipSettingsDto,
  ) {
    this.assertSelfOrStaff(req, userId);
    return this.levelsService.updateVipSettings(userId, dto);
  }

  @Put('user/:userId/custom-id')
  @UseGuards(UserAuthGuard)
  @ApiOperation({ summary: 'VIP 1+ users claim a custom vanity ID' })
  async setCustomId(
    @Param('userId') userId: string,
    @Request() req: any,
    @Body() dto: SetCustomIdDto,
  ) {
    this.assertSelfOrStaff(req, userId);
    return this.levelsService.setCustomId(userId, dto);
  }

  @Post('admin/set-user-vip')
  @RequirePermissions('vip.manage')
  @ApiOperation({ summary: 'Super Admin: Manually set user VIP level (0 to 8) or credit recharge USD' })
  async setUserVip(@Body() dto: SetUserVipDto) {
    return this.levelsService.setUserVip(dto);
  }

  @Post('monthly-evaluation')
  @RequirePermissions('vip.manage')
  @ApiOperation({ summary: 'Run monthly VIP evaluation & single-step downgrade cycle' })
  async runMonthlyVipEvaluation(@Body() body?: { targetMonth?: string }) {
    return this.levelsService.runMonthlyVipEvaluation(body?.targetMonth);
  }

  @Post('award-xp')
  @RequirePermissions('vip.manage')
  @ApiOperation({ summary: 'Award XP to user' })
  async awardXp(@Body() dto: AwardXpDto) {
    return this.levelsService.awardXp(dto.userId, dto.xpAmount, dto.reason);
  }

  @Post('test-celebration')
  @RequirePermissions('vip.manage')
  @ApiOperation({ summary: 'Emit real-time test VIP level-up celebration to connected apps' })
  async triggerTestCelebration(@Body() body: { userId?: string; targetLevel?: number }) {
    return this.levelsService.triggerTestCelebration(body.userId || 'test-user', body.targetLevel || 5);
  }

  @Post('test-entrance')
  @RequirePermissions('vip.manage')
  @ApiOperation({ summary: 'Emit real-time test VIP room entrance effect banner & animations' })
  async triggerTestEntrance(@Body() dto: TestEntranceDto) {
    return this.levelsService.triggerTestEntrance(dto);
  }

  @Post('announcement')
  @RequirePermissions('vip.manage')
  @ApiOperation({ summary: 'VIP 6+ global room announcement broadcast' })
  async broadcastVipAnnouncement(@Body() dto: VipAnnouncementDto) {
    return this.levelsService.broadcastVipAnnouncement(dto);
  }

  @Post('visitors/visit')
  @UseGuards(UserAuthGuard)
  @ApiOperation({ summary: 'Record profile visit with mystery / ghost mode check' })
  async recordProfileVisit(@Request() req: any, @Body() dto: RecordVisitDto) {
    return this.levelsService.recordProfileVisit({ ...dto, visitorId: req.user?.id || dto.visitorId });
  }

  @Get('visitors/:profileId')
  @UseGuards(UserAuthGuard)
  @ApiOperation({ summary: 'Get profile visitors (VIP 1+ required)' })
  async getProfileVisitors(
    @Param('profileId') profileId: string,
    @Request() req: any,
    @Query('requestingUserId') requestingUserId: string,
  ) {
    return this.levelsService.getProfileVisitors(profileId, req.user?.id || requestingUserId);
  }
}
