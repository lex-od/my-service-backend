import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
  Unique,
} from 'typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { RefreshToken } from 'src/auth/entities/refresh-token.entity';
import { RegistrationCode } from 'src/auth/entities/registration-code.entity';

@Entity('users')
@Unique('users_email_key', ['email'])
export class User {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'users_pkey' })
  id: number;

  @Column()
  email: string;

  @Column({ type: 'varchar', nullable: true })
  password: string | null;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @OneToMany(() => Company, (company) => company.user)
  companies?: Company[];

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens?: RefreshToken[];

  @OneToOne(() => RegistrationCode, (rc) => rc.user)
  registrationCode?: RegistrationCode;
}
