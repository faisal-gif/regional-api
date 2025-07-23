import { Expose, Transform } from "class-transformer";

export class FocusDto { 
    @Expose()
    id: number;

    @Expose()
    name: string;

    // Tambahkan untuk transform URL
    @Expose()
    @Transform(({ obj }) =>
        `https://${obj.networkSlug}.times.co.id/fokus/${obj.id}`,
        { toClassOnly: true }
    )
    url: string;
}