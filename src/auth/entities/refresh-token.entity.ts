import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  CreateDateColumn,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'refresh_tokens_pkey' })
  id: number;

  @Column({ name: 'token_hash' })
  @Index('refresh_tokens_token_hash_idx')
  tokenHash: string;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'refresh_tokens_user_id_fkey',
  })
  @Index('refresh_tokens_user_id_idx')
  user?: User;

  @RelationId((rt: RefreshToken) => rt.user)
  userId: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;
}
