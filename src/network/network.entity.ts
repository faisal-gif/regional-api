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
    @Column() logo: string;
    @Column() logo_m: string;



}
