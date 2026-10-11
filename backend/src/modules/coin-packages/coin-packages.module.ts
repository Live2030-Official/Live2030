import { Module } from '@nestjs/common';
import { CoinPackagesController } from './coin-packages.controller';
import { CoinPackagesService } from './coin-packages.service';
import { SignalingModule } from '../signaling/signaling.module';

@Module({
  imports: [SignalingModule],
  controllers: [CoinPackagesController],
  providers: [CoinPackagesService],
  exports: [CoinPackagesService],
})
export class CoinPackagesModule {}
