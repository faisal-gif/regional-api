import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { plainToInstance } from "class-transformer";
import { Ads } from "./ads.entity";

@Injectable()
export class AdsService {
    constructor(
        @InjectRepository(Ads) private repo: Repository<Ads>
    ) {}

    /**
     * Mengambil ads bertipe testimonials ('t') berdasarkan network ID 
     * yang sedang aktif (hari ini berada di antara datestart dan dateend)
     */
    async getActiveTestimonialsByNetworkId(netId: string | number): Promise<Ads[]> {
        const sqlQuery = `
            SELECT a.* FROM ads a
            INNER JOIN ads_network an ON a.id = an.ads_id
            WHERE a.type = 't' 
            AND an.net_id = ?
            AND CURRENT_DATE() >= a.datestart 
            AND CURRENT_DATE() <= a.dateend
        `;

        // Anda juga bisa menggunakan sintaks BETWEEN sebagai alternatif yang lebih singkat:
        // AND CURRENT_DATE() BETWEEN a.datestart AND a.dateend

        const rawResults = await this.repo.query(sqlQuery, [netId]);

        return rawResults;
    }
}