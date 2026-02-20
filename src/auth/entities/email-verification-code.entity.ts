import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  RelationId,
  Unique,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity('email_verification_codes')
@Unique('email_verification_codes_user_id_key', ['user'])
export class EmailVerificationCode {
  @PrimaryGeneratedColumn({
    primaryKeyConstraintName: 'email_verification_codes_pkey',
  })
  id: number;

  @Column()
  code: string;

  @Column({ default: 0 })
  attempts: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'email_verification_codes_user_id_fkey',
  })
  user?: User;

  @RelationId((vc: EmailVerificationCode) => vc.user)
  userId: number;
}
