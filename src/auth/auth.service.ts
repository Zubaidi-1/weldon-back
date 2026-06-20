import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { type IUserRepository } from 'src/user/domain/repositories/user.repository';
import { USER_REPOSITORY } from 'src/user/user.repo.token';
import * as bcrypt from 'bcrypt';
import { MailerService } from 'src/mailer/mailer.service';

type TokenType =
  | 'VERIFY_EMAIL'
  | 'REFRESH_TOKEN'
  | 'ACCESS_TOKEN'
  | 'RESET_PASSWORD';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private mailer: MailerService,
  ) {}

  //   Generate JWT
  generateToken = async (
    tokenType: TokenType,
    data: {
      id: number;
      email: string;
      tokenVersion?: number;
      firstName?: string;
      lastName?: string;
      name?: string;
      roleName?: string;
      isBanned?: boolean;
    },
    expiry: StringValue = '1d',
  ) => {
    data.tokenVersion = data.tokenVersion ?? 0;
    return this.jwt.signAsync(data, {
      secret: process.env[tokenType],
      expiresIn: expiry,
    });
  };

  //  Verify + decode JWT
  verifyToken = async (token: string, type: TokenType) => {
    try {
      return await this.jwt.verifyAsync(token, {
        secret: process.env[type],
      });
    } catch {
      return null;
    }
  };

  //  Signin
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
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: user.name,
          roleName: user.role,
          isBanned: user.isBanned,
          tokenVersion: user.tokenVersion,
        },
        '15m',
      );

      const refreshToken = await this.generateToken(
        'REFRESH_TOKEN',
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: user.name,
          roleName: user.role,
          isBanned: user.isBanned,
          tokenVersion: user.tokenVersion,
        },
        '7d',
      );

      const hashedRefresh = await bcrypt.hash(refreshToken, 10);

      await this.userRepo.storeUserRefresh(email, hashedRefresh);

      const cartProductsCount = await this.userRepo.getCartProductsCount(
        user.id,
      );

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: user.name,
          roleName: user.role,
          isBanned: user.isBanned,
          cartProductsCount,
        },
      };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException();
    }
  };

  // Refresh tokens
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

    if (payload.tokenVersion !== user.tokenVersion) {
      throw new ForbiddenException('Token has been revoked');
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
      {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        roleName: user.role,
        isBanned: user.isBanned,
        tokenVersion: user.tokenVersion,
      },
      '15m',
    );

    const newRefreshToken = await this.generateToken(
      'REFRESH_TOKEN',
      {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        roleName: user.role,
        isBanned: user.isBanned,
        tokenVersion: user.tokenVersion,
      },
      '7d',
    );

    const hashed = await bcrypt.hash(newRefreshToken, 10);

    await this.userRepo.storeUserRefresh(user.email, hashed);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken, // used by controller for cookie
    };
  };

  logout = async (email: string) => {
    await this.userRepo.invalidateUserTokens(email);

    return {
      message: 'Logged out successfully',
    };
  };

  // forgot Password flow

  // send forgot password email
  forgotPasswordEmail = async (email: string) => {
    const user = await this.userRepo.findUser(email);
    if (!user || !user.id || !user.email)
      throw new NotFoundException('No user found with this email');

    const resetToken = await this.generateToken(
      'RESET_PASSWORD',
      { id: user.id, email: user.email, tokenVersion: user.tokenVersion },
      '5m',
    );

    await this.mailer.sendMail(
      email,
      user.firstName,
      resetToken,
      'Reset Password',
      'RESET_PASSWORD',
    );
  };

  forgotNewPassword = async (token: string, newPassword: string) => {
    const payload = await this.verifyToken(token, 'RESET_PASSWORD');

    if (!payload) {
      throw new ForbiddenException('Invalid or expired token');
    }

    const user = await this.userRepo.findUser(payload.email);

    if (!user) {
      throw new NotFoundException('No user found with this email');
    }

    if (payload.tokenVersion !== user.tokenVersion) {
      throw new ForbiddenException('Invalid or expired token');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      throw new ForbiddenException('This password has already been used');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.userRepo.resetPassword(payload.email, hashedPassword);

    return { message: 'Password reset successfully' };
  };
}
