import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { USER_REPOSITORY } from './user.repo.token';
import { type IUserRepository } from './domain/repositories/user.repository';
import { CreateUserDto } from './application/dto/createUser.dto';
import { UserEntity } from './domain/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { MailerService } from 'src/mailer/mailer.service';
import { AuthService } from 'src/auth/auth.service';
import { PrismaClientKnownRequestError } from 'src/generated/prisma/internal/prismaNamespace';
import type { AuthPayload } from 'src/auth/types/auth-payload.type';
import { UserProfileDto } from './application/dto/userProfile.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private emailer: MailerService,
    private auth: AuthService,
  ) {}
  async register(createUserDto: CreateUserDto) {
    try {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      const user = UserEntity.createUserRequest(
        createUserDto.email,
        createUserDto.firstName,
        createUserDto.lastName,
        hashedPassword,
        createUserDto.phoneNumber,
      );
      const created = await this.userRepo.createUser(user);

      // Generate token
      const token = await this.auth.generateToken(
        'VERIFY_EMAIL',
        {
          id: created.id!,
          email: created.email!,
        },
        '2d',
      );
      // send email
      await this.emailer.sendMail(
        created.email,
        created.name,
        token,
        'Verify your email',
      );
      return created;
    } catch (error: any) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists');
      }

      throw new InternalServerErrorException(
        error.message || 'An error has occured',
      );
    }
  }
  async verifyUser(token: string) {
    try {
      const payload = await this.auth.verifyToken(token, 'VERIFY_EMAIL');

      if (!payload) {
        throw new ForbiddenException('Invalid or Expired token');
      }

      return await this.userRepo.verifyUser(payload.email);
    } catch (error: any) {
      if (error instanceof ForbiddenException) throw error;

      throw new InternalServerErrorException(`Error: ${error.message}`);
    }
  }

  // Get me
  async getMe(user?: AuthPayload) {
    if (!user) {
      return {
        id: null,
        email: null,
        firstName: null,
        lastName: null,
        name: null,
        roleName: 'GUEST',
        cartProductsCount: 0,
      };
    }

    const cartProductsCount = await this.userRepo.getCartProductsCount(user.id);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      roleName: user.roleName,
      cartProductsCount,
    };
  }

  async getProfile(user: AuthPayload) {
    const profile = await this.userRepo.getUserProfile(user.id);

    if (profile) return profile;

    return {
      id: null,
      userId: user.id,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phoneNumber: '',
      governate: '',
      address: '',
    };
  }

  async upsertProfile(user: AuthPayload, profile: UserProfileDto) {
    return await this.userRepo.upsertUserProfile(user.id, profile);
  }
}
