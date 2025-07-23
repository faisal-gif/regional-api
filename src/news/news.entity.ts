import { NewsNetwork } from "src/news_network/news.entity";
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class News {
    @PrimaryGeneratedColumn() id: number;
    @Column() title: string;
    @Column() description: string;
    @Column() caption: string;
    @Column('text') content: string;
    @Column() image: string;
    @Column({ type: 'timestamp' }) datepub: Date;
    @Column() views: number;

    @ManyToMany(() => NewsNetwork, (network) => network.news)
    @JoinTable({
        name: 'news_network', // nama tabel pivot
        joinColumn: { name: 'news_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'net_id', referencedColumnName: 'id' },
    })
    networks: NewsNetwork[];

}
