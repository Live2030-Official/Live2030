import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { StaffModule } from './modules/staff/staff.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { ResellersModule } from './modules/resellers/resellers.module';
import { SignalingModule } from './modules/signaling/signaling.module';
import { GiftsModule } from './modules/gifts/gifts.module';
import { AgenciesModule } from './modules/agencies/agencies.module';
import { WithdrawalsModule } from './modules/withdrawals/withdrawals.module';
import { UsersModule } from './modules/users/users.module';
import { UploadModule } from './modules/upload/upload.module';
import { SocialModule } from './modules/social/social.module';
import { LevelsModule } from './modules/levels/levels.module';
import { SupportModule } from './modules/support/support.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { LegalModule } from './modules/legal/legal.module';
import { GamesModule } from './modules/games/games.module';
import { CoinPackagesModule } from './modules/coin-packages/coin-packages.module';
import { ModerationModule } from './modules/moderation/moderation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    StaffModule,
    UsersModule,
    RoomsModule,
    ResellersModule,
    SignalingModule,
    GiftsModule,
    AgenciesModule,
    WithdrawalsModule,
    UploadModule,
    SocialModule,
    LevelsModule,
    SupportModule,
    PaymentsModule,
    LegalModule,
    GamesModule,
    CoinPackagesModule,
    ModerationModule,
  ],
})
export class AppModule {}
