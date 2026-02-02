import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";
import { Category } from "./categories.entity";
import { plainToInstance } from "class-transformer";
import { CategoryDto } from "./categories.dto";

@Injectable()
export class CategoryService {
    constructor(@InjectRepository(Category) private repo: Repository<Category>) { }

    async findAll(networkSlug: string, limit: number) {
        // Tambahkan nc.parent_id di sini
        const queryMain = `
        SELECT nc.id, nc.slug, nc.name, nc.description, nc.status, nc.parent_kanal 
        FROM news_cat nc
        INNER JOIN network_kanal nk ON nk.id_kanal = nc.id
        INNER JOIN network n ON n.id = nk.id_network
        WHERE n.slug = ? AND nc.status = '1'
        ORDER BY nc.parent_kanal ASC, nk.sequence ASC 
        LIMIT ?
    `;

        let result = await this.repo.query(queryMain, [networkSlug, limit]);

        if (result.length === 0) {
            const queryFallback = `
            SELECT id, slug, name, description, status, parent_kanal 
            FROM news_cat
            WHERE status = '1'
            ORDER BY parent_kanal ASC, name ASC
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
        return plainToInstance(CategoryDto, treeData, { excludeExtraneousValues: true });
    }

    async findAllCategoryWithNews(networkSlug: string) {
        // 1. Ambil networkId berdasarkan slug
        const netData = await this.repo.query(`SELECT id FROM network WHERE slug = ? LIMIT 1`, [networkSlug]);
        if (!netData.length) return [];
        const networkId = netData[0].id;

        // 2. Ambil Kategori (Kanal)
        let categories = await this.repo.query(`
        SELECT nc.id, nc.slug, nc.name, nc.description
        FROM news_cat nc
        INNER JOIN network_kanal nk ON nk.id_kanal = nc.id
        INNER JOIN network n ON n.id = nk.id_network
        WHERE n.slug = ? AND nc.status = '1'
        ORDER BY nc.name ASC
    `, [networkSlug]);

        if (categories.length === 0) {
            categories = await this.repo.query(`SELECT id, slug, name, description FROM news_cat WHERE status = '1' ORDER BY name ASC`);
        }

        // 3. Ambil Berita untuk masing-masing Kategori
        const enrichedData = await Promise.all(
            categories.map(async (cat) => {
                const news = await this.repo.query(`
                SELECT 
                    n.id, n.image, n.title, n.title_regional, n.description, n.datepub, n.is_code,
                    n.views, nc.name AS category_name, nc.slug as category_slug, 
                    w.name AS author
                FROM (
                    SELECT 
                        news.id, news.image, news.title, news.title_regional, news.description, 
                        news.datepub, news.is_code, news.views, news.cat_id, news.writer_id
                    FROM news
                    INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
                    WHERE news.status = 1 AND news.cat_id = ?
                    ORDER BY news.datepub DESC
                    LIMIT 10
                ) AS n
                INNER JOIN news_cat nc ON nc.id = n.cat_id
                INNER JOIN writers w ON w.id = n.writer_id
            `, [networkId, cat.id]);

                return {
                    ...cat,
                    news: news
                };
            })
        );

        return plainToInstance(CategoryDto, enrichedData, {
            excludeExtraneousValues: true,
        });
    }

    async findDetailCategory(cat_slug: string) {
        const result = await this.repo.findOne({
            where: { slug: cat_slug, status: '1' },
            select: {
                id: true,
                slug: true,
                keyword: true,
                name: true,
                description: true,
            }
        });

        if (!result) return null;

        // Transform menggunakan NewsDto
        return plainToInstance(CategoryDto, result, {
            excludeExtraneousValues: true, // Memastikan hanya yang ada @Expose yang muncul
        });


    };

    async findNewsByCategory(networkId: number, categoryId: number, page: number, limit: number) {
        const offset = (page - 1) * limit;
        const params = [networkId, categoryId, limit, offset];

        const result = await this.repo.query(`
        SELECT n.id, n.image, n.title, n.description, n.datepub, n.views, w.name AS author, nc.name AS category
                FROM (
                    SELECT news.id, news.image, news.title, news.description, news.datepub, news.views, news.cat_id, news.writer_id
                    FROM news
                    INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
                    WHERE status = 1 AND news.cat_id = ?
                    ORDER BY datepub DESC
                    LIMIT ? OFFSET ?
                ) AS n
                INNER JOIN news_cat nc ON nc.id = n.cat_id
                INNER JOIN writers w ON w.id = n.writer_id
                `, params);

        return result;
    }

    async findPopularNewsByCategory(networkId: number, categoryId: number, limit: number) {

        const result = await this.repo.query(`
            SELECT n.id, n.image, n.title, n.description, n.datepub, n.views, w.name AS author
            FROM (
                SELECT news.id, news.image, news.title, news.description, news.datepub, news.views, news.cat_id, news.writer_id
                FROM news
                INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
                WHERE status = 1 AND news.cat_id = ?
                ORDER BY news.datepub DESC
                LIMIT ?
            ) AS n
            INNER JOIN writers w ON w.id = n.writer_id
            ORDER BY n.views DESC
        `, [networkId, categoryId, limit]);

        return result;
    }
}
