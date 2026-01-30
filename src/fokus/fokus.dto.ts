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
    total_articles: number;

    // Tambahkan untuk transform URL
    @Expose()
    @Transform(({ obj }) =>
        `/fokus/${obj.id}/`,
        { toClassOnly: true }
    )
    url: string;
}