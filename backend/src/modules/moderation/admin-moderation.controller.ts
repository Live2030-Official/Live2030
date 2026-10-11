import { Controller, Get, Post, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ModerationService } from './moderation.service';
import { NotificationsService } from './notifications.service';
import { AuditService } from './audit.service';
import { RequirePermissions } from '../auth/permissions.decorator';

@ApiTags('Admin Moderation')
@Controller('api/admin')
export class AdminModerationController {
  constructor(
    private readonly moderation: ModerationService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  private ctx(req: any) {
    return {
      adminId: req?.user?.id || req?.staff?.id || 'ADMIN',
      ipAddress: req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.ip || null,
    };
  }

  @Get('moderation/content')
  @RequirePermissions('content.view')
  @ApiOperation({ summary: 'Browse social content for moderation' })
  async content(
    @Query('type') type?: string,
    @Query('visibility') visibility?: string,
    @Query('search') search?: string,
    @Query('reportedOnly') reportedOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.moderation.listContent({
      type,
      visibility,
      search,
      reportedOnly: reportedOnly === 'true',
      page: Number(page) || 1,
      limit: Number(limit) || 30,
    });
  }

  @Post('moderation/posts/:id/hide')
  @RequirePermissions('content.moderate')
  async hide(@Param('id') id: string, @Body() body: { reason?: string }, @Req() req: any) {
    const { adminId, ipAddress } = this.civ(req);
    return this.moderation.hidePost(id, adminId, body?.reason, ipAddress);
  }

  @Post('moderation/posts/:id/restore')
  @RequirePermissions('content.moderate')
  async restore(@Param('id') id: string, @Req() req: any) {
    const { adminId, ipAddress } = this.civ(req);
    return this.moderation.restorePost(id, adminId, ipAddress);
  }

  @Post('moderation/posts/:id/remove')
  @RequirePermissions('content.moderate')
  async remove(@Param('id') id: string, @Body() body: { reason?: string }, @Req() req: any) {
    const { adminId, ipAddress } = this.civ(req);
    return this.moderation.removePost(id, adminId, body?.reason, ipAddress);
  }

  @Delete('moderation/posts/:id')
  @RequirePermissions('content.moderate')
  async deletePost(@Param('id') id: string, @Body() body: { reason?: string }, @Req() req: any) {
    const { adminId, ipAddress } = this.civ(req);
    return this.moderation.deletePost(id, adminId, body?.reason, ipAddress);
  }

  @Post('moderation/users/:id/warn')
  @RequirePermissions('content.moderate')
  async warn(
    @Param('id') id: string,
    @Body() body: { reason: string; details?: string },
    @Req() req: any,
  ) {
    const { adminId, ipAddress } = this.civ(req);
    return this.moderation.warnUser(id, adminId, body.reason, body.details, ipAddress);
  }

  @Get('moderation/users/:id/warnings')
  @RequirePermissions('content.view')
  async warnings(@Param('id') id: string) {
    return { warnings: await this.moderation.getWarnings(id) };
  }

  @Get('audit-logs')
  @RequirePermissions('audit.view')
  @ApiOperation({ summary: 'Query the admin audit log' })
  async auditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('adminId') adminId?: string,
    @Query('targetType') targetType?: string,
  ) {
    return this.audit.list({
      page: Number(page) || 1,
      limit: Number(limit) || 50,
      action,
      adminId,
      targetType,
    });
  }

  @Post('notifications/broadcast')
  @RequirePermissions('notifications.manage')
  @ApiOperation({ summary: 'Broadcast a platform notification' })
  async broadcast(
    @Body() body: { title: string; body?: string; type?: string; audience?: 'ALL' | 'HOSTS' | 'USERS' },
    @Req() req: any,
  ) {
    const { adminId } = this.civ(req);
    return this.notifications.broadcast(
      adminId,
      body.title,
      body.body,
      body.type || 'SYSTEM',
      body.audience || 'ALL',
    );
  }

  private civ(req: any) {
    return {
      adminId: req?.user?.id || req?.staff?.id || 'ADMIN',
      ipAddress: req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.ip || null,
    };
  }
}
