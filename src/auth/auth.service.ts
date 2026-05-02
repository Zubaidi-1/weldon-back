import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { type IUserRepository } from 'src/user/domain/repositories/user.repository';
import { USER_REPOSITORY } from 'src/user/user.repo.token';
import * as bcrypt from 'bcrypt';

type TokenType = 'VERIFY_EMAIL' | 'REFRESH_TOKEN' | 'ACCESS_TOKEN';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  // 🔐 Generate JWT
  generateToken = async (
    tokenType: TokenType,
    data: { id: number; email: string },
    expiry: StringValue = '1d',
  ) => {
    return this.jwt.signAsync(data, {
      secret: process.env[tokenType],
      expiresIn: expiry,
    });
  };

  // 🔍 Verify + decode JWT
  verifyToken = async (token: string, type: TokenType) => {
    try {
      return await this.jwt.verifyAsync(token, {
        secret: process.env[type],
      });
    } catch {
      return null;
    }
  };

  // 🔑 Signin
  signin = async (email: string, password: string) => {
    try {
      // normalize email
      email = email.toLowerCase().trim();

      const user = await this.userRepo.findUser(email);

      // prevent timing attacks
      const passwordHash =
        user?.password ||
        '$2b$10$invalidhashinvalidhashinvalidhash1234567890123456789012';

      const isValid = await bcrypt.compare(password, passwordHash);

      if (!user || !isValid) {
        throw new ForbiddenException('Invalid credentials');
      }

      if (!user.isVerified) {
        throw new ForbiddenException('Please verify your email first');
      }

      const accessToken = await this.generateToken(
        'ACCESS_TOKEN',
        { id: user.id!, email: user.email! },
        '15m',
      );

      const refreshToken = await this.generateToken(
        'REFRESH_TOKEN',
        { id: user.id!, email: user.email! },
        '7d',
      );

      const hashedRefresh = await bcrypt.hash(refreshToken, 10);

      await this.userRepo.storeUserRefresh(email, hashedRefresh);

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException();
    }
  };

  // 🔄 Refresh tokens
  refresh = async (incomingRefreshToken: string) => {
    if (!incomingRefreshToken) {
      throw new ForbiddenException('No refresh token');
    }

    const payload = await this.verifyToken(
      incomingRefreshToken,
      'REFRESH_TOKEN',
    );

    if (!payload) {
      throw new ForbiddenException('Invalid token');
    }

    const user = await this.userRepo.findUser(payload.email);

    if (!user || !user.refreshToken || !user.isVerified) {
      throw new ForbiddenException('Access denied');
    }

    const isMatch = await bcrypt.compare(
      incomingRefreshToken,
      user.refreshToken,
    );

    if (!isMatch) {
      throw new ForbiddenException('Invalid refresh token');
    }

    const newAccessToken = await this.generateToken(
      'ACCESS_TOKEN',
      { id: user.id!, email: user.email! },
      '15m',
    );

    const newRefreshToken = await this.generateToken(
      'REFRESH_TOKEN',
      { id: user.id!, email: user.email! },
      '7d',
    );

    const hashed = await bcrypt.hash(newRefreshToken, 10);

    await this.userRepo.storeUserRefresh(user.email!, hashed);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken, // used by controller for cookie
    };
  };
}
