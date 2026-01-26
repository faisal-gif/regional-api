import { Category } from "src/categories/categories.entity";
import { NewsNetwork } from "src/news_network/news.entity";
import { Writers } from "src/writers/writers.entity";
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class News {
    @PrimaryGeneratedColumn() id: number;
    @Column() title: string;
    @Column() is_code: string;
    @Column() description: string;
    @Column() caption: string;
    @Column('text') content: string;
    @Column() image: string;
    @Column({ type: 'timestamp' }) datepub: Date;
    @Column() views: number;
    @Column() status: string;
    @Column() tag: string;
    @Column() locus: string;

    @ManyToMany(() => NewsNetwork, (network) => network.news)
    @JoinTable({
        name: 'news_network', // nama tabel pivot
        joinColumn: { name: 'news_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'net_id', referencedColumnName: 'id' },
    })

    networks: NewsNetwork[];

    @ManyToOne(() => Writers, (writer) => writer.news)
    @JoinColumn({ name: 'writer_id' })
    writer: Writers;

    @ManyToOne(() => Category, (category) => category.id)
    @JoinColumn({ name: 'cat_id' })
    category: Category;

}
