import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { Company } from 'src/companies/entities/company.entity';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'services_pkey' })
  id: number;

  @Column()
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @ManyToOne(() => Company, (company) => company.services)
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'services_company_id_fkey',
  })
  company?: Company;

  @RelationId((service: Service) => service.company)
  companyId: number;
}
