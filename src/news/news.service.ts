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

        // 1. Ambil ID kanal dan fokus terlebih dahulu (Sangat Cepat)
        const [kanals, fokus] = await Promise.all([
            this.repo.query(`SELECT id_kanal FROM network_kanal WHERE id_network = ?`, [networkId]),
            this.repo.query(`SELECT id_fokus FROM network_fokus WHERE id_network = ?`, [networkId])
        ]);

        const kanalIds = kanals.map(k => k.id_kanal);
        const fokusIds = fokus.map(f => f.id_fokus);

        // 2. Gunakan query yang lebih flat (tanpa subquery di FROM jika memungkinkan)
        // Gunakan parameter binding untuk array jika library mendukung, 
        // atau susun string IN secara manual yang aman.

        let query = `
        SELECT 
            news.id, news.is_code, news.image, news.title, news.description, 
            news.datepub, news.views, news.writer_id, news.cat_id,
            nc.name AS category_name, nc.slug as category_slug, w.name AS author
        FROM news
        INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
        INNER JOIN news_cat nc ON nc.id = news.cat_id
        INNER JOIN writers w ON w.id = news.writer_id
        WHERE news.status = 1
    `;

        const params = [networkId];

        // Tambahkan filter jika ada data kanal/fokus
        if (kanalIds.length > 0 || fokusIds.length > 0) {
            query += ` AND (news.cat_id IN (?) OR news.fokus_id IN (?)) `;
            params.push(kanalIds.length ? kanalIds : [0], fokusIds.length ? fokusIds : [0]);
        }

        query += ` ORDER BY news.datepub DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        let result = await this.repo.query(query, params);

        // ... (logic fallback tetap bisa ada, tapi pastikan query utama sudah cepat)

        return plainToInstance(NewsDto, result, { excludeExtraneousValues: true });
    }

    async findHeadline(page: number, limit: number, networkId: number) {
        const offset = (page - 1) * limit;

        // 1. Query Utama: Headline dari kanal ATAU fokus pilihan
        let result = await this.repo.query(`
        SELECT 
            n.id, n.title, n.description, n.datepub, n.is_code, n.image, 
            n.views,  nc.slug as category_slug, nc.name AS category_name,
            w.name AS author
        FROM (
            SELECT 
                news.id, news.image, news.title, news.description, 
                news.datepub, news.is_code, news.views, news.cat_id, news.writer_id, news.fokus_id
            FROM news
            INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
            WHERE news.status = 1 
            AND news.is_headline = 1
            AND (
                news.cat_id IN (SELECT id_kanal FROM network_kanal WHERE id_network = ?)
               
            )
            ORDER BY news.datepub DESC
            LIMIT ? OFFSET ?
        ) AS n
        INNER JOIN news_cat nc ON nc.id = n.cat_id
        INNER JOIN writers w ON w.id = n.writer_id
    `, [networkId, networkId, limit, offset]);
        // 2. Logic Fallback: Jika headline di kanal terpilih kosong
        if (result.length === 0) {
            result = await this.repo.query(`
            SELECT n.id, n.title, n.description, n.datepub, n.is_code, n.image, n.views, nc.slug as category_slug, nc.name AS category_name, w.name AS author
            FROM (
                SELECT news.id, news.image, news.title, news.description, news.datepub, news.is_code, news.views, news.cat_id, news.writer_id
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


        // 3. Inject networkSlug dan Transform ke DTO
        const enrichedData = result.map((item) => ({
            ...item
        }));

        return plainToInstance(NewsDto, enrichedData, {
            excludeExtraneousValues: true,
        });
    }

    async findPopular(page: number, limit: number, networkId: number, categoryId?: number) {
        const offset = (page - 1) * limit;

        // --- 1. QUERY UTAMA: Filter berdasarkan Kanal yang dipilih ---
        const queryWithFilter = `
        SELECT n.id, news.is_code, n.title, n.description, n.datepub, n.image, n.views, nc.name AS category_name, w.name AS author_name
        FROM (
            SELECT news.id, news.is_code ,news.image, news.title, news.description, news.datepub, news.views, news.cat_id, news.writer_id
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
            SELECT n.id, n.title, n.description, n.datepub, n.image, n.views, nc.name AS category_name, w.name AS author_name
            FROM (
                SELECT news.id, news.image, news.title, news.description, news.datepub, news.views, news.cat_id, news.writer_id
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

        // 1. Query Utama: Cari berita berdasarkan Network DAN Kategori
        let result = await this.repo.query(`
        SELECT 
            n.id, n.is_code,n.image, n.title, n.description, n.datepub, 
            n.views, n.writer_id, nc.name AS category_name, 
            nc.slug AS category_slug, w.name AS author
        FROM (
            SELECT 
                news.id, news.image, news.title, news.description, 
                news.datepub, news.is_code, news.views, news.cat_id, news.writer_id
            FROM news
            INNER JOIN news_network nn ON nn.news_id = news.id AND nn.net_id = ?
            WHERE news.status = 1 
            AND news.cat_id = ?
            ORDER BY news.datepub DESC
            LIMIT ? OFFSET ?
        ) AS n
        INNER JOIN news_cat nc ON nc.id = n.cat_id
        INNER JOIN writers w ON w.id = n.writer_id
    `, [networkId, categoryId, limit, offset]);

        // 2. Logic Fallback: Jika result kosong, ambil semua berita dalam kategori tersebut (Global/Tanpa Network)
        if (result.length === 0) {
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
                WHERE news.status = 1 
                AND news.cat_id = ?
                ORDER BY news.datepub DESC
                LIMIT ? OFFSET ?
            ) AS n
            INNER JOIN news_cat nc ON nc.id = n.cat_id
            INNER JOIN writers w ON w.id = n.writer_id
        `, [categoryId, limit, offset]);
        }

        // 3. Transform ke DTO
        return plainToInstance(NewsDto, result, {
            excludeExtraneousValues: true,
        });
    }

    async findOne(code: string) {
        // Tambah views random antara 1-5 setiap kali diakses
        const randomViews = Math.floor(Math.random() * 800) + 1;
        await this.repo.increment({ is_code: code }, "views", randomViews);

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
