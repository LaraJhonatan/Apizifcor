import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { QuoteRequest } from './quote-request.entity';

@Entity('quote_request_files')
export class QuoteRequestFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => QuoteRequest, (qr) => qr.archivos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quoteRequestId' })
  quoteRequest: QuoteRequest;

  @Column()
  quoteRequestId: string;

  @Column({ length: 1000 })
  url: string;

  @Column({ length: 300 })
  nombreOriginal: string;

  @Column({ nullable: true, length: 150 })
  mimeType: string;

  @Column({ type: 'int', nullable: true })
  tamanoBytes: number;

  @CreateDateColumn()
  createdAt: Date;
}
