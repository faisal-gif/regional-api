import { Expose, Transform } from "class-transformer";

export class NewsDto {
    @Expose()
    id: number;

    @Expose()
    is_code: string;

    @Expose()
    image: string;

    @Expose()
    caption: string;

    @Expose()
    datepub: Date;

    @Expose()
    title: string;

    @Expose()
    title_regional: string;

    @Expose()
    category_name: string;

    @Expose()
    author: string;

    @Expose()
    views: number;

    @Expose()
    description: string;

    // Tambahkan untuk transform URL
    @Expose()
    @Transform(({ obj }) => {
        // 1. Pilih title_regional jika ada, jika tidak gunakan title
        const targetTitle = obj.title_regional || obj.title;

        // 2. Jika keduanya tidak ada, fallback ke 'news'
        if (!targetTitle) {
            return `/news/${obj.category_slug}/${obj.is_code}/news`;
        }

        // 3. Hasilkan slug dari targetTitle
        const generatedSlug = targetTitle
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')     // Hapus karakter non-alfanumerik
            .replace(/[\s_-]+/g, '-')     // Ganti spasi/underscore jadi dash
            .replace(/^-+|-+$/g, '');     // Bersihkan dash di awal/akhir

        // 4. Format URL
        return `/news/${obj.category_slug}/${obj.is_code}/${generatedSlug}`;
    }, { toClassOnly: true })
    url: string;
}