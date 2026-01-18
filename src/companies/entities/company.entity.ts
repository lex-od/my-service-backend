import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { Service } from 'src/services/entities/service.entity';
import { User } from 'src/users/entities/user.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => User, (user) => user.companies)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @RelationId((company: Company) => company.user)
  userId: number;

  @OneToMany(() => Service, (service) => service.company)
  services?: Service[];
}
