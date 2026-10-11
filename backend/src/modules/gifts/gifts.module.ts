import { Module } from '@nestjs/common';
import { GiftsController } from './gifts.controller';
import { GiftsService } from './gifts.service';
import { SignalingModule } from '../signaling/signaling.module';
import { LevelsModule } from '../levels/levels.module';

@Module({
  imports: [SignalingModule, LevelsModule],
  controllers: [GiftsController],
  providers: [GiftsService],
  exports: [GiftsService],
})
export class GiftsModule {}
