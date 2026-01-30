import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";
import { Focus } from "./fokus.entity";
import { FocusDto } from "./fokus.dto";
import { plainToInstance } from "class-transformer";

@Injectable()
export class FocusService {
    constructor(@InjectRepository(Focus) private repo: Repository<Focus>) { }

    async findAll(networkSlug: string, limit: number) {
        // Tambahkan nc.parent_id di sini
        const queryMain = `
          SELECT nf.id, nf.name, nf.description, nf.status 
          FROM news_fokus nf
          INNER JOIN network_fokus nfk ON nfk.id_kanal = nf.id
          INNER JOIN network n ON n.id = nfk.id_network
          WHERE n.slug = ? AND nf.status = '1'
          ORDER BY nf.id ASC
          LIMIT ?
      `;

        let result = await this.repo.query(queryMain, [networkSlug, limit]);

        if (result.length === 0) {
            const queryFallback = `
              SELECT id, s name, description, status 
              FROM news_fokus
              WHERE status = '1'
              ORDER BY id ASC
              LIMIT ?
          `;
            result = await this.repo.query(queryFallback, [limit]);
        }

        // Penambahan networkSlug ke tiap item
        const enrichedData = result.map((item) => ({
            ...item,
            networkSlug,
        }));

        const buildTree = (items, parentId = null) => {
            return items
                .filter(item => item.parent_kanal === parentId)
                .map(item => ({
                    ...item,
                    children: buildTree(items, item.id)
                }));
        };

        const treeData = buildTree(enrichedData);
        return plainToInstance(FocusDto, treeData, { excludeExtraneousValues: true });
    }



}
