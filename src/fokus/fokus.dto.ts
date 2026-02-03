import { Expose, Transform } from "class-transformer";

export class FocusDto {
    @Expose()
    id: number;

    @Expose()
    name: string;

    @Expose()
    description: string;

    @Expose()
    keyword: string;

    @Expose()
    status: string;

    @Expose()
    img_desktop_list: string;

    @Expose()
    img_desktop_news: string;

    @Expose()
    img_mobile: string;


    // Tambahkan untuk transform URL
    @Expose()
    @Transform(({ obj }) => {
        // 1. Pastikan name ada, jika tidak kembalikan URL dasar atau string kosong
        if (!obj.name) return `/fokus/${obj.id}/`;

        // 2. Buat slug dari name
        const slug = obj.name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Hapus karakter non-alphanumeric (kecuali spasi dan dash)
            .replace(/[\s_-]+/g, '-') // Ganti spasi/underscore/dash berlebih dengan satu dash
            .replace(/^-+|-+$/g, ''); // Hapus dash di awal atau akhir string

        return `/fokus/${obj.id}/${slug}`;
    }, { toClassOnly: true })
    url: string;
}