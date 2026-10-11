import { Controller, Get, Post, Put, Patch, Body, Param, Query } from '@nestjs/common';
import { GamesService, PlayGameDto, UpdateGameConfigDto } from './games.service';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('api/games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  /**
   * Public catalog. Pass ?userId= to receive per-user lock info (VIP/level gates).
   */
  @Get('catalog')
  getCatalog(@Query('userId') userId?: string) {
    return this.gamesService.getCatalog(userId);
  }

  @Post('play')
  playGame(@Body() dto: PlayGameDto) {
    return this.gamesService.playGame(dto);
  }

  @Get('history/:userId')
  getUserHistory(@Param('userId') userId: string) {
    return this.gamesService.getUserGameHistory(userId);
  }

  // -------------------- Admin management --------------------

  @Get('admin/all')
  @RequirePermissions('games.view')
  getAllConfigs() {
    return this.gamesService.getAllConfigs();
  }

  @Put('admin/:gameId')
  @RequirePermissions('games.manage')
  updateConfig(@Param('gameId') gameId: string, @Body() dto: UpdateGameConfigDto) {
    return this.gamesService.updateConfig(gameId, dto);
  }

  @Patch('admin/:gameId/toggle')
  @RequirePermissions('games.manage')
  toggleConfig(@Param('gameId') gameId: string) {
    return this.gamesService.toggleConfig(gameId);
  }
}
