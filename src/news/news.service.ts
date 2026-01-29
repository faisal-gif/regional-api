import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { News } from "./news.entity"
import { Repository } from "typeorm";
import { NewsDto } from "./news.dto";
import { plainToInstance } from "class-transformer";
import { NewsDetailDto } from "./newsDetail.dto";

@Injectable()
export class NewsService {
    constructor(@InjectRepository(News) private repo: Repository<News>) { }

    async findAll(page: number, limit: number, networkId: number) {
        const offset = (page - 1) * limit;

        let result = await this.repo.query(`
    SELECT n.*, nc.name AS category_name, nc.slug as category_slug, w.name AS author
    FROM (
        SELECT news.id, news.cat_id, news.writer_id, news.datepub, news.image, 
               news.title, news.description, news.is_code, news.views
        FROM news
        INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
        WHERE news.status = 1
        AND (
            news.cat_id IN (SELECT id_kanal FROM network_kanal WHERE id_network = ?)
            OR 
            news.fokus_id IN (SELECT id_fokus FROM network_fokus WHERE id_network = ?)
        )
        ORDER BY news.datepub DESC
        LIMIT ? OFFSET ?
    ) AS n
    INNER JOIN news_cat nc ON nc.id = n.cat_id
    INNER JOIN writers w ON w.id = n.writer_id
`, [networkId, networkId, networkId, limit, offset]);

        // 2. Logic Fallback: Jika hasil kosong, tampilkan semua berita dari network tersebut
        if (result.length === 0) {
            result = await this.repo.query(`
            SELECT 
                n.id, n.is_code, n.image, n.title, n.description, n.datepub, n.is_code, 
                n.views, n.writer_id, nc.slug as category_slug, nc.name AS category_name, w.name AS author
            FROM (
                SELECT 
                    news.id, news.image, news.title, news.description, 
                    news.datepub, news.is_code, news.views, news.cat_id, news.writer_id
                FROM news
                INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
                WHERE news.status = 1
                ORDER BY news.datepub DESC
                LIMIT ? OFFSET ?
            ) AS n
            INNER JOIN news_cat nc ON nc.id = n.cat_id
            INNER JOIN writers w ON w.id = n.writer_id
        `, [networkId, limit, offset]);
        }

        // 3. Inject networkSlug dan Transform ke DTO
        const enrichedData = result.map((item) => ({
            ...item
        }));

        return plainToInstance(NewsDto, enrichedData, {
            excludeExtraneousValues: true,
        });

    }

    async findHeadline(page: number, limit: number, networkId: number) {
        const offset = (page - 1) * limit;

        // Gunakan parameter yang sama untuk mempermudah maintenance
        const queryParams = [networkId, networkId, limit, offset];

        // 1. Query Utama: Headline dengan filter kanal
        let result = await this.repo.query(`
        SELECT 
            n.*, 
            nc.slug as category_slug, nc.name AS category_name,
            w.name AS author
        FROM (
            SELECT 
                news.id, news.image, news.title, news.description, 
                news.datepub, news.is_code, news.views, news.cat_id, news.writer_id
            FROM news
            INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
            WHERE news.status = 1 
            AND news.is_headline = 1
            AND EXISTS (
                SELECT 1 FROM network_kanal nk 
                WHERE nk.id_kanal = news.cat_id AND nk.id_network = ?
            )
            ORDER BY news.datepub DESC
            LIMIT ? OFFSET ?
        ) AS n
        INNER JOIN news_cat nc ON nc.id = n.cat_id
        INNER JOIN writers w ON w.id = n.writer_id
    `, queryParams);

        // 2. Logic Fallback: Jika headline di kanal kosong
        if (result.length === 0) {
            result = await this.repo.query(`
            SELECT 
                n.*, 
                nc.slug as category_slug, nc.name AS category_name, 
                w.name AS author
            FROM (
                SELECT 
                    news.id, news.image, news.title, news.description, 
                    news.datepub, news.is_code, news.views, news.cat_id, news.writer_id
                FROM news
                INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
                WHERE news.status = 1
                AND news.is_headline = 1
                ORDER BY news.datepub DESC
                LIMIT ? OFFSET ?
            ) AS n
            INNER JOIN news_cat nc ON nc.id = n.cat_id
            INNER JOIN writers w ON w.id = n.writer_id
        `, [networkId, limit, offset]);
        }

        return plainToInstance(NewsDto, result, {
            excludeExtraneousValues: true,
        });
    }

    async findPopular(page: number, limit: number, networkId: number, categoryId?: number) {
        const offset = (page - 1) * limit;

        // --- 1. QUERY UTAMA: Filter berdasarkan Kanal yang dipilih ---
        const queryWithFilter = `
        SELECT n.id, n.is_code, n.title, n.description, n.datepub, n.image, n.views, nc.name AS category_name, nc.slug as category_slug, w.name AS author_name
        FROM (
            SELECT news.id, news.is_code, news.image, news.title, news.description, news.datepub, news.views, news.cat_id, news.writer_id
            FROM news
            INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
            INNER JOIN network_kanal nk ON nk.id_kanal = news.cat_id AND nk.id_network = ?
            WHERE news.status = 1
            ${categoryId ? 'AND news.cat_id = ?' : ''}
            AND news.datepub >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            ORDER BY news.views DESC     
            LIMIT ? OFFSET ?
        ) AS n
        INNER JOIN news_cat nc ON nc.id = n.cat_id
        INNER JOIN writers w ON w.id = n.writer_id
    `;

        const bindingsFilter = categoryId
            ? [networkId, networkId, categoryId, limit, offset]
            : [networkId, networkId, limit, offset];

        let result = await this.repo.query(queryWithFilter, bindingsFilter);

        // --- 2. FALLBACK: Jika kosong (tidak pilih kanal atau tidak ada berita populer hari ini di kanal tsb) ---
        if (result.length === 0) {
            const queryFallback = `
            SELECT n.id, n.is_code, n.title, n.description, n.datepub, n.image, n.views, nc.name AS category_name, nc.slug AS category_slug, w.name AS author_name
            FROM (
                SELECT news.id, news.is_code, news.image, news.title, news.description, news.datepub, news.views, news.cat_id, news.writer_id
                FROM news
                INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
                WHERE news.status = 1
                ${categoryId ? 'AND news.cat_id = ?' : ''}
                AND news.datepub >= CURDATE()
                ORDER BY news.views DESC
                LIMIT ? OFFSET ?
            ) AS n
            INNER JOIN news_cat nc ON nc.id = n.cat_id
            INNER JOIN writers w ON w.id = n.writer_id
        `;

            const bindingsFallback = categoryId
                ? [networkId, categoryId, limit, offset]
                : [networkId, limit, offset];

            result = await this.repo.query(queryFallback, bindingsFallback);
        }

        // 3. Inject networkSlug dan Transform ke DTO
        const enrichedData = result.map((item) => ({
            ...item
        }));

        return plainToInstance(NewsDto, enrichedData, {
            excludeExtraneousValues: true,
        });
    }

    async findByCategory(
        page: number,
        limit: number,
        networkId: number,
        categoryId: number
    ) {
        const offset = (page - 1) * limit;
        let result = [];
        let total = 0;

        // --- SKENARIO 1: Cari berdasarkan Network DAN Kategori ---
        const countResult = await this.repo.query(`
        SELECT COUNT(news.id) as total 
        FROM news 
        INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
        WHERE news.status = 1 AND news.cat_id = ?
    `, [networkId, categoryId]);

        total = parseInt(countResult[0].total);

        if (total > 0) {
            result = await this.repo.query(`
            SELECT 
                n.id, n.is_code, n.image, n.title, n.description, n.datepub, 
                n.views, n.writer_id, nc.name AS category_name, 
                nc.slug AS category_slug, w.name AS author
            FROM (
                SELECT 
                    news.id, news.image, news.title, news.description, 
                    news.datepub, news.is_code, news.views, news.cat_id, news.writer_id
                FROM news
                INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
                WHERE news.status = 1 AND news.cat_id = ?
                ORDER BY news.datepub DESC
                LIMIT ? OFFSET ?
            ) AS n
            INNER JOIN news_cat nc ON nc.id = n.cat_id
            INNER JOIN writers w ON w.id = n.writer_id
        `, [networkId, categoryId, limit, offset]);
        }

        // --- SKENARIO 2: Fallback (Jika skenario 1 kosong) ---
        if (total === 0) {
            const fallbackCount = await this.repo.query(`
            SELECT COUNT(news.id) as total 
            FROM news 
            WHERE news.status = 1 AND news.cat_id = ?
        `, [categoryId]);

            total = parseInt(fallbackCount[0].total);

            if (total > 0) {
                result = await this.repo.query(`
                SELECT 
                    n.id, n.image, n.title, n.description, n.datepub, 
                    n.views, n.writer_id, nc.name AS category_name, 
                    nc.slug AS category_slug, w.name AS author
                FROM (
                    SELECT 
                        news.id, news.image, news.title, news.description, 
                        news.datepub, news.is_code, news.views, news.cat_id, news.writer_id
                    FROM news
                    WHERE news.status = 1 AND news.cat_id = ?
                    ORDER BY news.datepub DESC
                    LIMIT ? OFFSET ?
                ) AS n
                INNER JOIN news_cat nc ON nc.id = n.cat_id
                INNER JOIN writers w ON w.id = n.writer_id
            `, [categoryId, limit, offset]);
            }
        }

        // --- TRANSFORM & WRAP RESPONSE ---
        const data = plainToInstance(NewsDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            data,
            meta: {
                total,
                page,
                limit,
                lastPage: Math.ceil(total / limit)
            }
        };
    }

    async findOne(code: string) {
        const result = await this.repo.findOne({
            where: { is_code: code, status: '1' },
            relations: {
                category: true, // relasi ke kategori
                writer: true    // relasi ke writers
            },
            select: {
                id: true,
                is_code: true,
                title: true,
                tag: true,
                description: true,
                caption: true,
                content: true,
                image: true,
                views: true,
                datepub: true,
                locus: true,
                writer: {
                    name: true
                },
                category: {
                    id: true,
                    name: true,
                    slug: true,
                }
            }
        });

        if (!result) return null;

        // Transform menggunakan NewsDto
        return plainToInstance(NewsDetailDto, result, {
            excludeExtraneousValues: true, // Memastikan hanya yang ada @Expose yang muncul
        });


    }

    async search(query, page, limit, networkId) {
        const offset = (page - 1) * limit;
        const searchTerm = `%${query?.trim() || ''}%`;

        if (!query || query.trim() === '') return []; // Atau bisa kembalikan semua data

        return this.repo.query(
            `
    SELECT n.id, n.title, n.description, n.datepub, n.image, n.views,
           nc.name AS category_name, w.name AS author
    FROM (
        SELECT news.id, news.image, news.title, news.description, news.datepub,
               news.views, news.cat_id, news.writer_id
        FROM news
        INNER JOIN news_network nn ON nn.news_id = news.id
        WHERE news.status = 1 AND nn.net_id = ?
          AND (news.title LIKE ? OR news.description LIKE ?)
        ORDER BY news.datepub DESC
        LIMIT ? OFFSET ?
    ) AS n
    INNER JOIN news_cat nc ON nc.id = n.cat_id
    INNER JOIN writers w ON w.id = n.writer_id
    WHERE w.name LIKE ?
    `,
            [networkId, searchTerm, searchTerm, limit, offset, searchTerm]
        );
    }

}
