import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return this.usersRepository.find();
  }

  async findOneByEmail(
    email: string,
    { throwIfNotFound = true }: { throwIfNotFound?: boolean } = {},
  ) {
    const user = await this.usersRepository.findOneBy({ email });

    if (!user && throwIfNotFound) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  async findOneByIdWithCompanies(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: {
        companies: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return this.purifyUser(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
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
