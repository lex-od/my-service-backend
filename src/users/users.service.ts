import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

interface BaseOptions {
  silent?: boolean;
}

@Injectable()
export class UsersService {
  private readonly passwordSaltRounds = 10;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto) {
    let passwordHash: string | null = null;

    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, this.passwordSaltRounds);
    }
    return this.usersRepository.save({
      ...dto,
      password: passwordHash,
    });
  }

  findAll() {
    return this.usersRepository.find();
  }

  async findOneByEmail(email: string, { silent }: BaseOptions = {}) {
    const user = await this.usersRepository.findOneBy({ email });

    if (!user && !silent) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  async findOneByIdWithCompanies(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { companies: true },
    });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return this.purifyUser(user);
  }

  async update(id: number, dto: UpdateUserDto, { silent }: BaseOptions = {}) {
    const entity = { ...dto };

    if (entity.password) {
      entity.password = await bcrypt.hash(
        entity.password,
        this.passwordSaltRounds,
      );
    }
    const { affected } = await this.usersRepository.update(id, entity);

    if (!affected && !silent) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return !!affected;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  purifyUser(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...restUser } = user;
    return restUser;
  }
}
