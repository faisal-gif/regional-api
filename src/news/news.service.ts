import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { News } from "./news.entity"
import { Repository } from "typeorm";
import { NewsDto } from "./news.dto";
import { plainToInstance } from "class-transformer";
import { NewsDetailDto } from "./newsDetail.dto";
import { Cache, CACHE_MANAGER } from "@nestjs/cache-manager";

@Injectable()
export class NewsService {
    constructor(@InjectRepository(News) private repo: Repository<News>,
        @Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    async findAll(page: number, limit: number, networkId: number) {
        const cacheKey = `news_all_net${networkId}_p${page}_l${limit}`;
        const cachedData = await this.cacheManager.get<NewsDto[]>(cacheKey);
        if (cachedData) return cachedData;

        const offset = (page - 1) * limit;
        const dateNow = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const yearStart = `2024-01-01 00:00:00`;

        // 1. Ambil ID kanal & fokus
        const kanalIdsResult = await this.repo.query<{ id_kanal: number }[]>(
            `SELECT id_kanal FROM network_kanal WHERE id_network = ?`, [networkId]
        );
        const fokusIdsResult = await this.repo.query<{ id_fokus: number }[]>(
            `SELECT id_fokus FROM network_fokus WHERE id_network = ?`, [networkId]
        );

        const strKanalIds = kanalIdsResult.map(i => i.id_kanal).join(',');
        const strFokusIds = fokusIdsResult.map(i => i.id_fokus).join(',');

        let filterNetwork = '';
        const conditions: string[] = [];
        if (strKanalIds) conditions.push(`n.cat_id IN (${strKanalIds})`);
        if (strFokusIds) conditions.push(`n.fokus_id IN (${strFokusIds})`);
        if (conditions.length > 0) filterNetwork = `AND (${conditions.join(' OR ')})`;

        // 2. Query Utama dengan JOIN Kategori
        // Kita panggil nc.name dan nc.slug di sini
        const result = await this.repo.query(`
        SELECT 
            n.*, 
            nc.name AS category_name, 
            nc.slug AS category_slug 
        FROM news n
        LEFT JOIN news_cat nc ON nc.id = n.cat_id
        WHERE n.id IN (
            SELECT news_id FROM news_network WHERE net_id = ?
        )
        ${filterNetwork}
        AND n.status = 1 
        AND n.datepub BETWEEN ? AND ?
        ORDER BY n.datepub DESC 
        LIMIT ? OFFSET ?
    `, [networkId, yearStart, dateNow, limit, offset]);

        // ... (Logika fallback jika result.length === 0 sama seperti sebelumnya)

        const finalData = plainToInstance(NewsDto, result, { excludeExtraneousValues: true });
        await this.cacheManager.set(cacheKey, finalData, 120000 + Math.floor(Math.random() * 60000));

        return finalData;
    }

    async findHeadline(page: number, limit: number, networkId: number) {
        const cacheKey = `news_headline_net${networkId}_p${page}_l${limit}`;
        const cachedData = await this.cacheManager.get<NewsDto[]>(cacheKey);
        if (cachedData) return cachedData;

        const offset = (page - 1) * limit;

        // 1. Query Utama: Headline dengan filter kanal (Optimized Columns)
        let result = await this.repo.query(`
        SELECT 
            n.id, n.image, n.title, n.title_regional, n.description, 
            n.datepub, n.is_code, n.views,
            nc.slug as category_slug, nc.name AS category_name,
            w.name AS author
        FROM (
            SELECT 
                news.id, news.image, news.title, news.title_regional, news.description, 
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
    `, [networkId, networkId, limit, offset]);

        // 2. Logic Fallback: Jika headline di kanal kosong (Optimized Columns)
        if (result.length === 0) {
            result = await this.repo.query(`
            SELECT 
                n.id, n.image, n.title, n.title_regional, n.description, 
                n.datepub, n.is_code, n.views,
                nc.slug as category_slug, nc.name AS category_name, 
                w.name AS author
            FROM (
                SELECT 
                    news.id, news.image, news.title, news.title_regional, news.description, 
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

        const finalData = plainToInstance(NewsDto, result, {
            excludeExtraneousValues: true,
        });

        // Cache selama 2 menit (120000 ms)
        await this.cacheManager.set(cacheKey, finalData, 120000);

        return finalData;
    }

    async findPopular(page: number, limit: number, networkId: number, categoryId?: number) {

        const cacheKey = `news_popular_net${networkId}_p${page}_l${limit}_cat${categoryId}`;
        const cachedData = await this.cacheManager.get<NewsDto[]>(cacheKey);
        if (cachedData) return cachedData;

        const offset = (page - 1) * limit;

        // --- 1. QUERY UTAMA: Filter berdasarkan Kanal yang dipilih ---
        const queryWithFilter = `
        SELECT n.id, n.is_code, n.title, n.title_regional, n.description, n.datepub, n.image, n.views, nc.name AS category_name, nc.slug as category_slug, w.name AS author_name
        FROM (
            SELECT news.id, news.is_code, news.image, news.title, news.title_regional, news.description, news.datepub, news.views, news.cat_id, news.writer_id
            FROM news
            INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
            INNER JOIN network_kanal nk ON nk.id_kanal = news.cat_id AND nk.id_network = ?
            WHERE news.status = 1
            ${categoryId ? 'AND news.cat_id = ?' : ''}
            AND news.datepub >= CURDATE()
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
            SELECT n.id, n.is_code, n.title, n.title_regional, n.description, n.datepub, n.image, n.views, nc.name AS category_name, nc.slug AS category_slug, w.name AS author_name
            FROM (
                SELECT news.id, news.is_code, news.image, news.title, news.title_regional, news.description, news.datepub, news.views, news.cat_id, news.writer_id
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

        const finalData = plainToInstance(NewsDto, enrichedData, {
            excludeExtraneousValues: true,
        });

        await this.cacheManager.set(cacheKey, finalData, 120000);

        return finalData;
    }

    async findByCategory(
        page: number,
        limit: number,
        networkId: number,
        categoryId: number
    ) {

        const cacheKey = `news_by_cat_net${networkId}_p${page}_l${limit}_cat${categoryId}`;
        const cachedData = await this.cacheManager.get<NewsDto[]>(cacheKey);
        if (cachedData) return cachedData;

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
                n.id, n.is_code, n.image, n.title, n.title_regional, n.description, n.datepub, 
                n.views, n.writer_id, nc.name AS category_name, 
                nc.slug AS category_slug, w.name AS author
            FROM (
                SELECT 
                    news.id, news.image, news.title, news.title_regional, news.description, 
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



        // --- TRANSFORM & WRAP RESPONSE ---
        const data = plainToInstance(NewsDto, result, {
            excludeExtraneousValues: true,
        });

        const finalResponse = {
            data,
            meta: {
                total,
                page,
                limit,
                lastPage: Math.ceil(total / limit)
            }
        };

        // 3. SIMPAN KE CACHE (120000 ms = 2 menit)
        await this.cacheManager.set(cacheKey, finalResponse, 120000);

        return finalResponse;
    }

    async findByFokus(
        page: number,
        limit: number,
        networkId: number,
        fokusId: number
    ) {
        // 1. Update Cache Key agar spesifik untuk Fokus
        const cacheKey = `news_by_fokus_net${networkId}_p${page}_l${limit}_fok${fokusId}`;
        const cachedData = await this.cacheManager.get<any>(cacheKey);
        if (cachedData) return cachedData;

        const offset = (page - 1) * limit;
        let result = [];
        let total = 0;

        // --- SKENARIO: Cari berdasarkan Network DAN Fokus ---
        const countResult = await this.repo.query(`
        SELECT COUNT(news.id) as total 
        FROM news 
        INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
        WHERE news.status = 1 AND news.fokus_id = ?
    `, [networkId, fokusId]);

        total = parseInt(countResult[0].total);

        if (total > 0) {
            result = await this.repo.query(`
            SELECT 
                n.id, n.is_code, n.image, n.title, n.title_regional, n.description, n.datepub, 
                n.views, n.writer_id, 
                nc.name AS category_name,   
                nc.slug AS category_slug,
                nf.name AS fokus_name,   
                w.name AS author
            FROM (
                SELECT 
                    news.id, news.image, news.title, news.title_regional, news.description, 
                    news.datepub, news.is_code, news.views, news.cat_id, news.writer_id, news.fokus_id
                FROM news
                INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
                WHERE news.status = 1 AND news.fokus_id = ?
                ORDER BY news.datepub DESC
                LIMIT ? OFFSET ?
            ) AS n
            INNER JOIN news_cat nc ON nc.id = n.cat_id 
            INNER JOIN news_fokus nf ON nf.id = n.fokus_id
            INNER JOIN writers w ON w.id = n.writer_id
        `, [networkId, fokusId, limit, offset]);
        }

        // --- TRANSFORM & WRAP RESPONSE ---
        const data = plainToInstance(NewsDto, result, {
            excludeExtraneousValues: true,
        });

        const finalResponse = {
            data,
            meta: {
                total,
                page,
                limit,
                lastPage: Math.ceil(total / limit)
            }
        };

        // SIMPAN KE CACHE
        await this.cacheManager.set(cacheKey, finalResponse, 120000);

        return finalResponse;
    }

    async findOne(code: string) {

        const randomViews = Math.floor(Math.random() * 200) + 1;
        this.repo.query(
            `UPDATE news SET views = views + ? WHERE is_code = ?`,
            [randomViews, code]
        ).catch(err => console.error("Gagal update views:", err));

        const cacheKey = `news_detail_${code}`;

        // 2. Cek Cache
        const cachedData = await this.cacheManager.get<NewsDetailDto>(cacheKey);
        if (cachedData) return cachedData;

        // 3. Raw SQL Query (Pengganti findOne)
        // Kita gunakan LEFT JOIN untuk mengambil data writer dan category sekaligus
        const result = await this.repo.query(`
            SELECT 
                n.id, n.is_code, n.title, n.title_regional, n.tag, 
                n.description, n.caption, n.content, n.image, 
                n.views, n.datepub, n.locus,
                w.name AS writer_name,
                nc.id AS category_id, nc.name AS category_name, nc.slug AS category_slug
            FROM news n
            LEFT JOIN writers w ON w.id = n.writer_id
            LEFT JOIN news_cat nc ON nc.id = n.cat_id
            WHERE n.is_code = ? AND n.status = 1
            LIMIT 1
        `, [code]);

        if (result.length === 0) return null;

        const rawRow = result[0];

        // 4. Manual Mapping (PENTING)
        // Karena Raw SQL mengembalikan data flat (writer_name, category_id),
        // kita harus memasukkannya ke dalam object 'writer' dan 'category'
        // agar cocok dengan struktur NewsDetailDto
        const mappedResult = {
            ...rawRow,
            writer: {
                name: rawRow.writer_name
            },
            category: {
                id: rawRow.category_id,
                name: rawRow.category_name,
                slug: rawRow.category_slug
            }
        };

        // 5. Transform ke DTO
        const data = plainToInstance(NewsDetailDto, mappedResult, {
            excludeExtraneousValues: true,
        });

        // 6. Simpan ke Cache (120000 ms = 2 menit)
        await this.cacheManager.set(cacheKey, data, 120000);

        return data;
    }

    async updateView(code: string) {
        const randomViews = Math.floor(Math.random() * 20) + 1;
        return await this.repo.query(`UPDATE news SET views = views + ? WHERE is_code = ?`, [randomViews, code]);
    }

    async getOnlyViews(code: string) {
        // Query ini sangat cepat karena hanya mengambil satu kolom angka
        const result = await this.repo.query(
            `SELECT views FROM news WHERE is_code = ? LIMIT 1`,
            [code]
        );

        if (!result || result.length === 0) return { views: 0 };
        return { views: result[0].views };
    }

    async search(query: string, page: number, limit: number, networkId: number) {
        const take = Number(limit) || 10;
        const skip = (Number(page) - 1) * take;
        const searchTerm = `%${query.trim()}%`;

        if (!query) return { data: [], meta: { total: 0, page, limit, lastPage: 0 } };

        try {
            // 2. Hitung Total untuk Pagination Meta
            const countResult = await this.repo.query(`
            SELECT COUNT(n.id) as total 
            FROM news n
            INNER JOIN news_network nn ON nn.news_id = n.id
            WHERE n.status = 1 
            AND nn.net_id = ? 
            AND MATCH(n.title) AGAINST(? IN NATURAL LANGUAGE MODE)
        `, [networkId, searchTerm]);

            const total = parseInt(countResult[0].total);
            let result = [];

            // 3. Ambil Data jika total > 0
            if (total > 0) {
                result = await this.repo.query(`
                SELECT 
                    n.id, n.is_code, n.image, n.title, n.title_regional, n.description, n.datepub, 
                    n.views, n.writer_id, nc.name AS category_name, 
                    nc.slug AS category_slug, w.name AS author
                FROM (
                    SELECT news.id
                    FROM news
                    INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
                    WHERE news.status = 1 AND news.title LIKE ?
                    ORDER BY news.datepub DESC
                    LIMIT ? OFFSET ?
                ) AS fast_search
                INNER JOIN news n ON n.id = fast_search.id
                INNER JOIN news_cat nc ON nc.id = n.cat_id
                INNER JOIN writers w ON w.id = n.writer_id
                ORDER BY n.datepub DESC
            `, [Number(networkId), searchTerm, take, skip]);
            }

            // 4. Transform & Wrap Response
            const data = plainToInstance(NewsDto, result, {
                excludeExtraneousValues: true,
            });

            const finalResponse = {
                data,
                meta: {
                    total,
                    page: Number(page),
                    limit: take,
                    lastPage: Math.ceil(total / take)
                }
            };


            return finalResponse;

        } catch (error) {
            console.error("SQL Error:", error);
            return { data: [], meta: { total: 0, page, limit, lastPage: 0 } };
        }
    }
}
