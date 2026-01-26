import { News } from "src/news/news.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('writers')
export class Writers {
    // Define the properties of the Writers entity here
    // For example:
    @PrimaryGeneratedColumn() id: number;
    @Column() name: string;
    @Column() email: string;
    @Column() bio: string;
    @Column() profilePicture: string;
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;

    @Column({ type: 'timestamp', nullable: true }) updatedAt: Date;


    @OneToMany(() => News, (news) => news.writer)
    news: News[];


}