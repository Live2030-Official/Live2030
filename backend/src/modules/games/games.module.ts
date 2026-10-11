import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { SignalingModule } from '../signaling/signaling.module';
import { LevelsModule } from '../levels/levels.module';

@Module({
  imports: [PrismaModule, SignalingModule, LevelsModule],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}
