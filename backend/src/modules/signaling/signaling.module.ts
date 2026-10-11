import { Module, forwardRef } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { RoomsModule } from '../rooms/rooms.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    forwardRef(() => RoomsModule),
    forwardRef(() => UsersModule),
  ],
  providers: [SignalingGateway],
  exports: [SignalingGateway],
})
export class SignalingModule {}
