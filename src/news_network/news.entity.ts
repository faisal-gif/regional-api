import { News } from "src/news/news.entity";
import { Column, Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('news_network')
export class NewsNetwork {
    @PrimaryGeneratedColumn() id: number;
    @Column() news_id: number;
    @Column() net_id: number;

    
  @ManyToMany(() => News, (news) => news.networks)
  news: News[];
}
