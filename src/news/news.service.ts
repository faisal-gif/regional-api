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

        const finalData = plainToInstance(NewsDto, enrichedData, {
            excludeExtraneousValues: true,
        });

        await this.cacheManager.set(cacheKey, finalData, 120000);

        return finalData;

    }

    async findHeadline(page: number, limit: number, networkId: number) {

        const cacheKey = `news_headline_net${networkId}_p${page}_l${limit}`;
        const cachedData = await this.cacheManager.get<NewsDto[]>(cacheKey);
        if (cachedData) return cachedData;

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

        const finalData = plainToInstance(NewsDto, result, {
            excludeExtraneousValues: true,
        });

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
                n.id, n.is_code, n.image, n.title, n.description, n.datepub, 
                n.views, n.writer_id, 
                nc.name AS category_name,   
                nc.slug AS category_slug,
                nf.name AS fokus_name,   
                w.name AS author
            FROM (
                SELECT 
                    news.id, news.image, news.title, news.description, 
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
        const cacheKey = `news_detail_${code}`;

        // 1. Jalankan Increment Views di background (tanpa await agar cepat)
        // Kita tetap update DB setiap kali fungsi ini dipanggil
        const randomViews = Math.floor(Math.random() * 800) + 1;
        this.repo.increment({ is_code: code }, "views", randomViews)
            .catch(err => console.error("Gagal update views:", err));

        // 2. Cek apakah data artikel ada di Cache
        const cachedData = await this.cacheManager.get<NewsDetailDto>(cacheKey);
        if (cachedData) {
            // Jika ada di cache, langsung kembalikan. 
            // Catatan: Angka 'views' di sini adalah angka saat cache dibuat.
            return cachedData;
        }

        // 3. Jika Cache kosong, ambil dari Database
        const result = await this.repo.findOne({
            where: { is_code: code, status: '1' },
            relations: {
                category: true,
                writer: true
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
                writer: { name: true },
                category: { id: true, name: true, slug: true }
            }
        });

        if (!result) return null;

        const data = plainToInstance(NewsDetailDto, result, {
            excludeExtraneousValues: true,
        });

        // 4. Simpan ke Cache (Misal: 30 menit = 1800000 ms)
        await this.cacheManager.set(cacheKey, data, 120000);

        return data;
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
