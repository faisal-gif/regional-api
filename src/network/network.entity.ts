import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('network')
export class Network {
    @PrimaryGeneratedColumn() id: number;
    @Column() name: string;
    @Column() domain: string;
    @Column() slug: string;
    @Column() title: string;
    @Column() tagline: string;
    @Column() description: string;
    @Column() keyword: string;
    @Column() analytics: string;
    @Column() gverify: string;
    @Column() fb: string;
    @Column() tw: string;
    @Column() yt: string;
    @Column() ig: string;
    @Column() gp: string;
    @Column() logo: string;
    @Column() logo_m: string;
    @Column() img_socmed: string;



}
