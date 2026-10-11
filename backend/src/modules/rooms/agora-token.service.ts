import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RtcTokenBuilder, RtcRole } from 'agora-token';

@Injectable()
export class AgoraTokenService {
  private readonly appId: string;
  private readonly appCertificate: string;

  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.get<string>('AGORA_APP_ID', '95efa72862664489bcdf5c10451bef33');
    this.appCertificate = this.configService.get<string>('AGORA_APP_CERTIFICATE', '507f24e08cdd417286848f752eb237af');
  }

  /**
   * Generates an Agora RTC Token for a Broadcaster (Host) or Audience member.
   * @param channelName The unique room channel identifier
   * @param uid The numerical user ID (0 allows Agora to auto-assign)
   * @param isPublisher True for host broadcasting, false for audience viewing
   * @param expireSeconds Token lifespan (defaults to 24 hours = 86400s)
   */
  generateRtcToken(
    channelName: string,
    uid: number = 0,
    isPublisher: boolean = false,
    expireSeconds: number = 86400,
  ): { token: string; appId: string; channelName: string; uid: number } {
    const role = isPublisher ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const tokenExpirationInSecond = expireSeconds;
    const privilegeExpirationInSecond = expireSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      uid,
      role,
      tokenExpirationInSecond,
      privilegeExpirationInSecond,
    );

    return {
      token,
      appId: this.appId,
      channelName,
      uid,
    };
  }
}
