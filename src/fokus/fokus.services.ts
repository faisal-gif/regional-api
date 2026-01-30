import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";
import { Focus } from "./fokus.entity";
import { FocusDto } from "./fokus.dto";
import { plainToInstance } from "class-transformer";

@Injectable()
export class FocusService {
    constructor(@InjectRepository(Focus) private repo: Repository<Focus>) { }

    async findAll(networkSlug: string) {

        const queryMain = `
          SELECT nf.id, nf.name, nf.description, nf.status
          FROM news_fokus nf
          INNER JOIN network_fokus nfk ON nfk.id_fokus = nf.id
          INNER JOIN network n ON n.id = nfk.id_network
          WHERE n.slug = ? AND nf.status = '1'
          ORDER BY nf.id ASC
      `;

        let result = await this.repo.query(queryMain, [networkSlug]);

        if (result.length === 0) {
            const queryFallback = `
              SELECT id, name, description, status 
              FROM news_fokus
              WHERE status = '1'
              ORDER BY id ASC
            `;
            result = await this.repo.query(queryFallback);
        }

        return plainToInstance(FocusDto, result, { excludeExtraneousValues: true });
    }

    async findDetailFokus(id: number) {
        const result = await this.repo.findOne({
            where: { id: id, status: '1' },
            select: {
                id: true,
                keyword: true,
                img_desktop_list: true,
                img_desktop_news: true,
                img_mobile: true,
                name: true,
                description: true,
            }
        });

        if (!result) return null;

        // Transform menggunakan NewsDto
        return plainToInstance(FocusDto, result, {
            excludeExtraneousValues: true, // Memastikan hanya yang ada @Expose yang muncul
        });


    };



}
