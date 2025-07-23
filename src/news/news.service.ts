import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { News } from "./news.entity";
import { Repository } from "typeorm";

@Injectable()
export class NewsService {
    constructor(@InjectRepository(News) private repo: Repository<News>) { }

    async findAll(page: number, limit: number, networkId: number) {
        const offset = (page - 1) * limit;
        const result = await this.repo.query(`
              SELECT n.id, n.image, n.title, n.description, n.datepub, n.views, nc.name AS category_name
                FROM (
                    SELECT news.id, news.image, news.title, news.description, news.datepub, news.views, news.cat_id
                    FROM news
                    INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
                    WHERE status = 1
                    ORDER BY datepub DESC
                    LIMIT ? OFFSET ?
                ) AS n
                INNER JOIN news_cat nc ON nc.id = n.cat_id;
                `, [networkId, limit, offset]);

        return result;
    }

    async findHeadline(networkId: number) {
        return this.repo.query(`
            SELECT n.id, n.title, n.description, n.datepub, n.image, n.views, nc.name AS category_name
             FROM (
                    SELECT news.id, news.image, news.title, news.description, news.datepub, news.views, news.cat_id
                    FROM news
                    INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
                    WHERE status = 1
                    AND news.is_headline = 1
                    ORDER BY datepub DESC
                    LIMIT 5
                ) AS n
             INNER JOIN news_cat nc ON nc.id = n.cat_id
            `, [networkId]);
    }

    async findPopular(page: number, limit: number, networkId: number, categoryId?: number) {
        const offset = (page - 1) * limit;
        const baseQuery = `
        SELECT n.id, n.title, n.description, n.datepub, n.image, n.views, nc.name AS category_name
        FROM (
            SELECT news.id, news.image, news.title, news.description, news.datepub, news.views, news.cat_id
            FROM news
            INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
            WHERE news.status = 1
              ${categoryId ? 'AND news.cat_id = ?' : ''}
            ORDER BY news.datepub DESC
            LIMIT ? OFFSET ?
        ) AS n
        INNER JOIN news_cat nc ON nc.id = n.cat_id
        ORDER BY n.views DESC
    `;

        const bindings = categoryId
            ? [networkId, categoryId, limit, offset]
            : [networkId, limit, offset];

        return this.repo.query(baseQuery, bindings);
    }

    async findOne(id: number) {
        // Tambah views random antara 1-5 setiap kali diakses
        const randomViews = Math.floor(Math.random() * 5) + 1;
        await this.repo.increment({ id }, "views", randomViews);

        return this.repo.findOne({
            where: { id },
            select: {
                id: true,
                title: true,
                description: true,
                caption: true,
                content: true,
                image: true,
                views: true,
                datepub: true
            }
        });
    }

}
