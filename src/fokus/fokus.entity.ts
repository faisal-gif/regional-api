import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('news_fokus')
export class Focus {
    @PrimaryGeneratedColumn() id: number;
    @Column() name: string;
    @Column() keyword: string;
    @Column() description: string;
    @Column() img_desktop_list: string;
    @Column() img_desktop_news: string;
    @Column() img_mobile: string;
    @Column() status: string;
    @Column() created_at: Date;
    @Column() updated_at: Date;

}
