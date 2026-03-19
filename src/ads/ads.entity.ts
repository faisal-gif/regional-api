import { 
    Column, 
    Entity, 
    PrimaryGeneratedColumn, 
    CreateDateColumn, 
    UpdateDateColumn 
} from "typeorm";

// 1. Definisikan Enum untuk tipe agar lebih aman (type-safe)
export enum AdsType {
    D = 'd',
    M = 'm',
    T = 't',
}

@Entity('ads')
export class Ads {
    // Gunakan type 'bigint' dan unsigned sesuai skema. 
    // Di TypeScript, bigint direpresentasikan sebagai string untuk mencegah isu presisi.
    @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true }) 
    id: string;

    @Column({ type: 'enum', enum: AdsType }) 
    type: AdsType;

    @Column({ type: 'bigint', unsigned: true }) 
    locate_id: string;

    @Column({ type: 'date' }) 
    datestart: Date;

    @Column({ type: 'date' }) 
    dateend: Date;

    @Column({ type: 'varchar', length: 255 }) 
    title: string;

    @Column({ type: 'varchar', length: 255, nullable: true }) 
    image: string;

    @Column({ type: 'varchar', length: 255 }) 
    url: string;

    @Column({ type: 'int' }) 
    cpc: number;

    @Column({ type: 'int' }) 
    cost: number;

    // int(1) biasanya digunakan untuk boolean atau status sederhana
    @Column({ type: 'int', width: 1 }) 
    status: number;

    @Column({ type: 'bigint', unsigned: true }) 
    created_by: string;

    // Sesuai dengan nama di database Anda (modifed_by - perhatikan tiponya jika memang di DB begitu)
    @Column({ type: 'bigint', unsigned: true, nullable: true }) 
    modifed_by: string;

    // Gunakan dekorator bawaan TypeORM untuk auto-handle timestamp
    @CreateDateColumn({ type: 'timestamp', nullable: true }) 
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp', nullable: true }) 
    updated_at: Date;
}