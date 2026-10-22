import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { GamesService, PlayGameDto, UpdateGameConfigDto } from './games.service';
import { RequirePermissions, Public } from '../auth/permissions.decorator';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';

@Controller('api/games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  /**
   * Public catalog. Pass ?userId= to receive per-user lock info (VIP/level gates).
   */
  @Public()
  @Get('catalog')
  getCatalog(@Query('userId') userId?: string) {
    return this.gamesService.getCatalog(userId);
  }

  @Post('play')
  @UseGuards(UserAuthGuard)
  playGame(@Request() req: any, @Body() dto: PlayGameDto) {
    return this.gamesService.playGame({ ...dto, userId: req.user.id });
  }

  @Get('history/:userId')
  @UseGuards(UserAuthGuard)
  getUserHistory(@Param('userId') userId: string, @Request() req: any) {
    const isStaff = req.user?.isStaff === true || ['SUPER_ADMIN', 'AGENCY_ADMIN'].includes(req.user?.role);
    if (!isStaff && userId !== req.user?.id) {
      throw new ForbiddenException('You can only view your own game history.');
    }
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
