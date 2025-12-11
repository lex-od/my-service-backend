import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { RefreshToken } from 'src/auth/refresh-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  password: string;

  @OneToMany(() => Company, (company) => company.user)
  companies?: Company[];

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens?: RefreshToken[];
}
