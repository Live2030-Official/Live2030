import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SignalingModule } from '../signaling/signaling.module';
import { LevelsService } from './levels.service';
import { LevelsController } from './levels.controller';
import { VipController } from './vip.controller';

@Module({
  imports: [PrismaModule, SignalingModule],
  controllers: [LevelsController, VipController],
  providers: [LevelsService],
  exports: [LevelsService],
})
export class LevelsModule {}
