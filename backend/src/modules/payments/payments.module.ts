import { Module, forwardRef } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { SignalingModule } from '../signaling/signaling.module';
import { LevelsModule } from '../levels/levels.module';
import { CoinPackagesModule } from '../coin-packages/coin-packages.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    LevelsModule,
    CoinPackagesModule,
    forwardRef(() => SignalingModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
