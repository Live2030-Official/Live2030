import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RoomsService } from './rooms.service';
import { StartRoomDto, JoinRoomDto } from './dto/room.dto';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';

@ApiTags('Live Rooms & Agora Streaming')
@Controller('api/rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('discovery')
  @ApiOperation({ summary: 'Get active live streams feed for mobile discovery page (supports category/language/country filters)' })
  @ApiResponse({ status: 200, description: 'Filtered list of active rooms' })
  async getDiscovery(
    @Query('category') category?: string,
    @Query('language') language?: string,
    @Query('country') country?: string,
    @Query('roomType') roomType?: string,
  ) {
    return this.roomsService.getDiscoveryFeed({ category, language, country, roomType });
  }

  @Post('start')
  @UseGuards(UserAuthGuard)
  @ApiOperation({ summary: 'Host starts a live stream & receives Agora Publisher RTC Token' })
  @ApiResponse({ status: 201, description: 'Room created with Agora Publisher Token' })
  async startRoom(@Request() req: any, @Body() dto: StartRoomDto) {
    const hostId = dto.hostId || req.user?.id || `host_${Date.now()}`;
    return this.roomsService.startRoom(hostId, dto);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Audience viewer joins a room & receives Agora Subscriber RTC Token' })
  @ApiResponse({ status: 200, description: 'Agora Subscriber Token granted' })
  async joinRoom(@Request() req: any, @Body() dto: JoinRoomDto) {
    const userId = dto.userId || req.user?.id || `viewer_${Date.now()}`;
    const effectiveRoomId = (dto.roomId && dto.roomId.trim().length > 0) ? dto.roomId.trim() : (dto.channelName || `live_${Date.now()}`);
    return this.roomsService.joinRoom(userId, effectiveRoomId, dto.channelName, dto.roomPin);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Audience viewer leaves a room (decrements live viewer count)' })
  async leaveRoom(@Param('id') roomId: string) {
    return this.roomsService.leaveRoom(roomId);
  }

  @Post(':id/end')
  @UseGuards(UserAuthGuard)
  @ApiOperation({ summary: 'Host ends their live broadcast & gets stream summary' })
  async endRoom(@Request() req: any, @Param('id') roomId: string, @Query('hostId') hostId?: string) {
    const resolvedHostId = req.user?.id || (hostId && hostId.trim().length > 0 ? hostId.trim() : 'admin');
    return this.roomsService.endRoom(resolvedHostId, roomId);
  }

  @Get(':id/moderators')
  @ApiOperation({ summary: 'List room host and assigned moderators' })
  async listModerators(@Param('id') roomId: string) {
    return this.roomsService.listModerators(roomId);
  }

  @Post(':id/moderators')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Host assigns a room moderator' })
  async addModerator(
    @Request() req: any,
    @Param('id') roomId: string,
    @Body() body: { userId: string; hostId?: string },
    @Query('hostId') hostId?: string,
  ) {
    const requester = req.user?.id || body.hostId || hostId || '';
    return this.roomsService.addModerator(roomId, requester, body.userId);
  }

  @Delete(':id/moderators/:userId')
  @UseGuards(UserAuthGuard)
  @ApiOperation({ summary: 'Host removes a room moderator' })
  async removeModerator(
    @Request() req: any,
    @Param('id') roomId: string,
    @Param('userId') userId: string,
    @Query('hostId') hostId?: string,
  ) {
    const requester = req.user?.id || hostId || '';
    return this.roomsService.removeModerator(roomId, requester, userId);
  }
}
