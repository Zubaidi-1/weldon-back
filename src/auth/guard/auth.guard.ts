import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];

    let payload: Record<string, any>;

    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: process.env.ACCESS_TOKEN,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
      select: { isBanned: true, tokenVersion: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token user');
    }

    if (payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException('Token has been revoked');
    }

    const roleName = payload.roleName ?? payload.role;

    if (user.isBanned && roleName !== 'ADMIN') {
      throw new ForbiddenException('Your account has been banned');
    }

    // attach user to request
    request['user'] = {
      ...payload,
      isBanned: user.isBanned,
    };

    return true;
  }
}
