import { Expose, Transform } from "class-transformer";

export class FocusDto { 
    @Expose()
    id: number;

    @Expose()
    name: string;

    @Expose()
    description: string;

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
    @Transform(({ obj }) =>
        `/fokus/${obj.id}/`,
        { toClassOnly: true }
    )
    url: string;
}