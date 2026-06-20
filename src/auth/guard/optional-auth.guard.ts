import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return true;
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: process.env.ACCESS_TOKEN,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
        select: { isBanned: true, tokenVersion: true },
      });

      if (!user || payload.tokenVersion !== user.tokenVersion) {
        return true;
      }

      request['user'] = {
        ...payload,
        isBanned: user.isBanned,
      };
    } catch {
      return true;
    }

    return true;
  }
}
