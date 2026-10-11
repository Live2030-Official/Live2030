import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { AgoraTokenService } from './agora-token.service';
import { SignalingModule } from '../signaling/signaling.module';

@Module({
  imports: [ConfigModule, forwardRef(() => SignalingModule)],
  controllers: [RoomsController],
  providers: [RoomsService, AgoraTokenService],
  exports: [RoomsService, AgoraTokenService],
})
export class RoomsModule {}
