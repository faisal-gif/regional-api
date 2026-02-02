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
        // Kita hasilkan slug kembali dari title untuk dimasukkan ke URL
        const generatedSlug = obj.title
            ? obj.title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
            : 'news';

        // Format URL: /news/kategori/is_code/judul-slug
        return `/news/${obj.category_slug}/${obj.is_code}/${generatedSlug}`;
    }, { toClassOnly: true })
    url: string;
}