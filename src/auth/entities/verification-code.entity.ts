import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  RelationId,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity('verification_codes')
export class VerificationCode {
  @PrimaryGeneratedColumn({
    primaryKeyConstraintName: 'verification_codes_pkey',
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
    foreignKeyConstraintName: 'verification_codes_user_id_fkey',
  })
  @Index('verification_codes_user_id_idx')
  user?: User;

  @RelationId((vc: VerificationCode) => vc.user)
  userId: number;
}
