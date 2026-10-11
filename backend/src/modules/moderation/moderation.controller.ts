import { Controller, Get, Post, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { ModerationService } from './moderation.service';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';

@ApiTags('Notifications & Safety')
@ApiBearerAuth()
@UseGuards(UserAuthGuard)
@Controller('api')
export class ModerationController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly moderation: ModerationService,
  ) {}

  @Get('notifications')
  @ApiOperation({ summary: 'List notifications for the authenticated user' })
  async list(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notifications.list(
      req.user.id,
      Number(page) || 1,
      Number(limit) || 30,
      unreadOnly === 'true',
    );
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get unread notification count for the authenticated user' })
  async unreadCount(@Req() req: any) {
    return this.notifications.unreadCount(req.user.id);
  }

  @Post('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications read for the authenticated user' })
  async readAll(@Req() req: any) {
    return this.notifications.markAllRead(req.user.id);
  }

  @Post('notifications/:id/read')
  @ApiOperation({ summary: 'Mark a single notification read' })
  async readOne(@Req() req: any, @Param('id') id: string) {
    return this.notifications.markRead(req.user.id, id);
  }

  @Get('blocks')
  @ApiOperation({ summary: 'List users blocked by the authenticated user' })
  async listBlocks(@Req() req: any) {
    return { blocked: await this.moderation.listBlocked(req.user.id) };
  }

  @Post('blocks')
  @ApiOperation({ summary: 'Block a user' })
  async block(@Req() req: any, @Body('userId') userId: string) {
    return this.moderation.blockUser(req.user.id, userId);
  }

  @Delete('blocks/:userId')
  @ApiOperation({ summary: 'Unblock a user' })
  async unblock(@Req() req: any, @Param('userId') userId: string) {
    return this.moderation.unblockUser(req.user.id, userId);
  }
}
