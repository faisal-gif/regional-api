import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('news_cat')
export class Category {
    @PrimaryGeneratedColumn() id: number;
    @Column() slug: string;
    @Column() name: string;
    @Column() description: string;
    @Column() keyword: string;
    @Column() status: string;
    @Column() created_at: Date;
    @Column() updated_at: Date;

}
