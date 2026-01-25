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
    const dtoCopy = { ...dto };

    if (dto.password) {
      dtoCopy.password = await bcrypt.hash(
        dto.password,
        this.passwordSaltRounds,
      );
    }
    return this.usersRepository.save(dtoCopy);
  }

  async update(id: number, dto: UpdateUserDto, { silent }: BaseOptions = {}) {
    const dtoCopy = { ...dto };

    if (dto.password) {
      dtoCopy.password = await bcrypt.hash(
        dto.password,
        this.passwordSaltRounds,
      );
    }
    const { affected } = await this.usersRepository.update(id, dtoCopy);

    if (!affected && !silent) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return !!affected;
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

  async findOneByEmail(email: string, { silent }: BaseOptions = {}) {
    const user = await this.usersRepository.findOneBy({ email });

    if (!user && !silent) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  purifyUser(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...restUser } = user;
    return restUser;
  }
}
