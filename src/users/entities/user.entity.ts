import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { RefreshToken } from 'src/auth/entities/refresh-token.entity';
import { VerificationCode } from 'src/auth/entities/verification-code.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @OneToMany(() => Company, (company) => company.user)
  companies?: Company[];

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens?: RefreshToken[];

  @OneToOne(() => VerificationCode, (vc) => vc.user)
  verificationCode?: VerificationCode;
}
