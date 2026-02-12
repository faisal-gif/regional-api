import { Expose, Transform } from "class-transformer";

export class NewsDetailDto {
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
    @Transform(({ obj }) => obj.writer?.name)
    writer_name: string;

    @Expose()
    @Transform(({ obj }) => obj.editor?.name)
    editor_name: string;

    @Expose()
    @Transform(({ obj }) => obj.publisher?.name)
    publisher_name: string;

    @Expose()
    @Transform(({ obj }) => obj.category?.id)
    category_id: string;

    @Expose()
    @Transform(({ obj }) => obj.category?.name)
    category_name: string;


    @Expose()
    @Transform(({ obj }) => obj.category?.slug)
    category_slug: string;

    @Expose()
    locus: string;

    @Expose()
    author: string;

    @Expose()
    views: number;

    @Expose()
    tag: string;

    @Expose()
    description: string;

    @Expose()
    content: string;


    // Tambahkan untuk transform URL
    @Expose()
    @Transform(({ obj }) => {
        // Kita hasilkan slug kembali dari title untuk dimasukkan ke URL
        const generatedSlug = obj.title_regional
            ? obj.title_regional.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
            : 'news';

        // Format URL: /news/kategori/is_code/judul-slug
        return `/news/${obj.category?.slug}/${obj.is_code}/${generatedSlug}`;
    }, { toClassOnly: true })
    url: string;
}