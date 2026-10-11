import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LevelsService } from './levels.service';
import {
  UpdateLevelConfigDto,
  SetUserVipDto,
  UpdateVipSettingsDto,
  TestEntranceDto,
  VipAnnouncementDto,
  RecordVisitDto,
  SetCustomIdDto,
} from './dto/level.dto';
import { RequirePermissions } from '../auth/permissions.decorator';

@ApiTags('VIP System (8 Independent Stages)')
@Controller('api/vip')
export class VipController {
  constructor(private readonly levelsService: LevelsService) {}

  @Get('configs')
  @ApiOperation({ summary: 'Get all 8 independent VIP level configurations ($500 to $15,000)' })
  @ApiResponse({ status: 200, description: 'List of all 8 VIP stages' })
  async getVipConfigs() {
    return this.levelsService.getLevels();
  }

  @Get('features')
  @ApiOperation({ summary: 'Get the canonical catalog of toggleable VIP benefits grouped by category' })
  async getFeatureCatalog() {
    return this.levelsService.getFeatureCatalog();
  }

  @Get('configs/:level')
  @ApiOperation({ summary: 'Get single VIP level configuration' })
  async getVipConfig(@Param('level', ParseIntPipe) level: number) {
    return this.levelsService.getLevel(level);
  }

  @Put('configs/:level')
  @RequirePermissions('vip.manage')
  @ApiOperation({ summary: 'Admin updates VIP parameters, threshold, frame, badges, perks, or feature flags' })
  async updateVipConfig(
    @Param('level', ParseIntPipe) level: number,
    @Body() dto: UpdateLevelConfigDto,
  ) {
    return this.levelsService.updateLevel(level, dto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user VIP status, recharge progress, unlocked perks & privacy toggles' })
  async getUserVipStatus(@Param('userId') userId: string) {
    return this.levelsService.getUserVipStatus(userId);
  }

  @Get('status/:userId')
  @ApiOperation({ summary: 'Alias: Get user VIP status' })
  async getUserStatusAlias(@Param('userId') userId: string) {
    return this.levelsService.getUserVipStatus(userId);
  }

  @Put('user/:userId/settings')
  @ApiOperation({ summary: 'User updates personal VIP privacy toggles (Mystery mode, hide location, etc.)' })
  async updateVipSettings(
    @Param('userId') userId: string,
    @Body() dto: UpdateVipSettingsDto,
  ) {
    return this.levelsService.updateVipSettings(userId, dto);
  }

  @Put('settings/:userId')
  @ApiOperation({ summary: 'Alias: User updates personal VIP privacy toggles' })
  async updateSettingsAlias(
    @Param('userId') userId: string,
    @Body() dto: UpdateVipSettingsDto,
  ) {
    return this.levelsService.updateVipSettings(userId, dto);
  }

  @Put('user/:userId/custom-id')
  @ApiOperation({ summary: 'VIP 1+ users claim a custom vanity ID' })
  async setCustomId(
    @Param('userId') userId: string,
    @Body() dto: SetCustomIdDto,
  ) {
    return this.levelsService.setCustomId(userId, dto);
  }

  @Put('custom-id/:userId')
  @ApiOperation({ summary: 'Alias: VIP 1+ users claim custom ID' })
  async setCustomIdAlias(
    @Param('userId') userId: string,
    @Body() dto: SetCustomIdDto,
  ) {
    return this.levelsService.setCustomId(userId, dto);
  }

  @Post('admin/set-user-vip')
  @RequirePermissions('vip.manage')
  @ApiOperation({ summary: 'Super Admin: Manually set user VIP level (0 to 8) or credit recharge USD' })
  async setUserVip(@Body() dto: SetUserVipDto) {
    return this.levelsService.setUserVip(dto);
  }

  @Post('admin/award-recharge')
  @RequirePermissions('vip.manage')
  @ApiOperation({ summary: 'Super Admin: Award cumulative recharge USD to trigger VIP progression' })
  async awardRecharge(@Body() body: { userId: string; amountUSD: number }) {
    return this.levelsService.awardRechargeUSD(body.userId, body.amountUSD);
  }

  @Post('admin/recharge/:userId')
  @RequirePermissions('vip.manage')
  @ApiOperation({ summary: 'Alias: Award recharge USD to user' })
  async awardRechargeParam(
    @Param('userId') userId: string,
    @Body() body: { amountUSD: number },
  ) {
    return this.levelsService.awardRechargeUSD(userId, body.amountUSD);
  }

  @Post('admin/test-celebration')
  @RequirePermissions('vip.manage')
  @ApiOperation({ summary: 'Emit real-time test VIP level-up celebration to connected apps' })
  async triggerTestCelebration(@Body() body: { userId?: string; targetLevel?: number }) {
    return this.levelsService.triggerTestCelebration(body.userId || 'test-user', body.targetLevel || 5);
  }

  @Post('celebration/test')
  @ApiOperation({ summary: 'Alias: Emit real-time test VIP celebration' })
  async triggerCelebrationAlias(@Body() body: { userId?: string; level?: number }) {
    return this.levelsService.triggerTestCelebration(body.userId || 'test-user', body.level || 5);
  }

  @Post('admin/test-entrance')
  @RequirePermissions('vip.manage')
  @ApiOperation({ summary: 'Emit real-time test VIP room entrance effect banner & animations' })
  async triggerTestEntrance(@Body() dto: TestEntranceDto) {
    return this.levelsService.triggerTestEntrance(dto);
  }

  @Post('entrance/test')
  @ApiOperation({ summary: 'Alias: Emit real-time test VIP room entrance' })
  async triggerEntranceAlias(@Body() dto: TestEntranceDto) {
    return this.levelsService.triggerTestEntrance(dto);
  }

  @Post('announcement')
  @ApiOperation({ summary: 'VIP 6+ global room announcement broadcast' })
  async broadcastVipAnnouncement(@Body() dto: VipAnnouncementDto) {
    return this.levelsService.broadcastVipAnnouncement(dto);
  }

  @Post('announcements')
  @ApiOperation({ summary: 'Alias: VIP 6+ global room announcement broadcast' })
  async broadcastVipAnnouncements(@Body() dto: VipAnnouncementDto) {
    return this.levelsService.broadcastVipAnnouncement(dto);
  }

  @Post('visitors/visit')
  @ApiOperation({ summary: 'Record profile visit with mystery / ghost mode check' })
  async recordProfileVisit(@Body() dto: RecordVisitDto) {
    return this.levelsService.recordProfileVisit(dto);
  }

  @Post('profile-visitors/visit')
  @ApiOperation({ summary: 'Alias: Record profile visit' })
  async recordProfileVisitAlias(@Body() dto: RecordVisitDto) {
    return this.levelsService.recordProfileVisit(dto);
  }

  @Get('visitors/:profileId')
  @ApiOperation({ summary: 'Get profile visitors (VIP 1+ required)' })
  async getProfileVisitors(
    @Param('profileId') profileId: string,
    @Query('requestingUserId') requestingUserId: string,
  ) {
    return this.levelsService.getProfileVisitors(profileId, requestingUserId);
  }

  @Get('profile-visitors/:profileId')
  @ApiOperation({ summary: 'Alias: Get profile visitors' })
  async getProfileVisitorsAlias(
    @Param('profileId') profileId: string,
    @Query('requestingUserId') requestingUserId: string,
  ) {
    return this.levelsService.getProfileVisitors(profileId, requestingUserId);
  }
}
