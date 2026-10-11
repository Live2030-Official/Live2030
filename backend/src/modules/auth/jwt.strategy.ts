import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveJwtSecret } from '../../common/security.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(configService),
    });
  }

  async validate(payload: { sub: string; username: string; role: string }) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { wallet: true },
      });

      if (user) {
        if (user.isBanned) {
          throw new UnauthorizedException('User account is invalid or suspended');
        }
        return user;
      }
    } catch (e: any) {
      if (e instanceof UnauthorizedException) throw e;
    }

    return {
      id: payload.sub,
      username: payload.username || 'user',
      role: payload.role || 'USER',
      isBanned: false,
    };
  }
}
