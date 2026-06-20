import { Injectable } from '@nestjs/common';
import type { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserProfileDto } from 'src/user/application/dto/userProfile.dto';
import { UserEntity } from 'src/user/domain/entities/user.entity';
import {
  IUserRepository,
  PaginatedUsers,
  ResetPasswordResult,
  UserProfileDetails,
  UserSearchParams,
  UserWithOrders,
} from 'src/user/domain/repositories/user.repository';

@Injectable()
export class UserPrismaRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async createUser(user: UserEntity): Promise<UserEntity> {
    const created = await this.prisma.user.create({
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        password: user.password!,
        phoneNumber: user.number,
      },
    });
    const createdUser = new UserEntity(
      created.id,
      created.firstName,
      created.lastName,
      created.name,
      created.email,
      created.password,
      created.phoneNumber,
      created.refreshToken,
      created.role,
      created.isVerified,
      created.isBanned,
    );
    return UserEntity.createUserResponse(
      createdUser.id!,
      createdUser.email,
      createdUser.firstName,
      createdUser.lastName,
      createdUser.name,
      createdUser.number,
      created.refreshToken ?? undefined,
      createdUser.role,
      createdUser.isVerified,
      createdUser.isBanned,
    );
  }

  // This function is to verify the user
  async verifyUser(email: string) {
    return await this.prisma.user.update({
      where: { email: email },
      data: {
        isVerified: true,
      },
    });
  }

  // find user by email
  async findUser(email: string) {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async storeUserRefresh(
    email: string,
    token: string | null,
  ): Promise<Partial<UserEntity> | null> {
    return await this.prisma.user.update({
      where: { email },
      data: { refreshToken: token },
    });
  }

  async invalidateUserTokens(email: string): Promise<ResetPasswordResult> {
    return await this.prisma.user.update({
      where: { email },
      data: {
        refreshToken: null,
        tokenVersion: { increment: 1 },
      },
      select: { id: true, email: true, tokenVersion: true },
    });
  }

  async getCartProductsCount(userId: number): Promise<number> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: {
        items: {
          select: {
            quantity: true,
          },
        },
      },
    });

    return cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  }

  private toUserProfileDetails(
    user: {
      id: number;
      firstName: string;
      lastName: string;
      phoneNumber: string;
      profile: {
        id: number;
        userId: number;
        governate: string;
        address: string;
        createdAt: Date;
        updatedAt: Date;
      } | null;
    },
    fallbackProfile?: {
      id: number;
      userId: number;
      governate: string;
      address: string;
      createdAt: Date;
      updatedAt: Date;
    },
  ): UserProfileDetails {
    const profile = user.profile ?? fallbackProfile;

    return {
      id: profile?.id ?? null,
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      governate: profile?.governate ?? '',
      address: profile?.address ?? '',
      createdAt: profile?.createdAt ?? null,
      updatedAt: profile?.updatedAt ?? null,
    };
  }

  async getUserProfile(userId: number): Promise<UserProfileDetails | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        profile: {
          select: {
            id: true,
            userId: true,
            governate: true,
            address: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return user ? this.toUserProfileDetails(user) : null;
  }

  async upsertUserProfile(
    userId: number,
    profile: UserProfileDto,
  ): Promise<UserProfileDetails> {
    const [user, savedProfile] = await this.prisma.$transaction([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          profile: {
            select: {
              id: true,
              userId: true,
              governate: true,
              address: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
      this.prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...profile,
        },
        update: profile,
      }),
    ]);

    return this.toUserProfileDetails(user, savedProfile);
  }

  async getUserOrders(email: string): Promise<UserWithOrders[]> {
    return await this.prisma.user.findMany({
      where: { email },
      include: { orders: true },
    });
  }

  async banUser(userToBanId: number): Promise<boolean> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userToBanId },
      select: { isBanned: true, role: true },
    });

    if (user.role === 'ADMIN') return user.isBanned;

    const updatedUser = await this.prisma.user.update({
      where: { id: userToBanId },
      data: { isBanned: !user.isBanned },
      select: { isBanned: true },
    });

    return updatedUser.isBanned;
  }

  private buildUserSearchWhere(
    params: UserSearchParams = {},
  ): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};
    const search = params.search?.trim();

    if (search) {
      const id = Number(search);

      where.OR = [
        ...(Number.isInteger(id) ? [{ id }] : []),
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { role: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (params.role) {
      where.role = params.role;
    }

    if (params.banStatus) {
      where.isBanned = params.banStatus === 'BANNED';
    }

    if (params.verificationStatus) {
      where.isVerified = params.verificationStatus === 'VERIFIED';
    }

    return where;
  }

  async getAllUsers(params: UserSearchParams = {}): Promise<PaginatedUsers> {
    const { page = 1, limit = 10 } = params;
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const skip = (safePage - 1) * safeLimit;
    const where = this.buildUserSearchWhere(params);
    const select = {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      name: true,
      phoneNumber: true,
      role: true,
      isVerified: true,
      isBanned: true,
      createdAt: true,
      updatedAt: true,
    };

    const [users, total, totalUsers, totalAdmins, totalVerified, totalBanned] =
      await this.prisma.$transaction([
        this.prisma.user.findMany({
          where,
          skip,
          take: safeLimit,
          select,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.user.count({ where }),
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: 'ADMIN' } }),
        this.prisma.user.count({ where: { isVerified: true } }),
        this.prisma.user.count({ where: { isBanned: true } }),
      ]);

    return {
      users,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
      stats: {
        totalUsers,
        totalAdmins,
        totalVerified,
        totalBanned,
      },
    };
  }
  async resetPassword(
    email: string,
    password: string,
  ): Promise<ResetPasswordResult> {
    return await this.prisma.user.update({
      where: { email },
      data: { password, tokenVersion: { increment: 1 } },
      select: { id: true, email: true, tokenVersion: true },
    });
  }
}
