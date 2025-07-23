import { Expose, Transform } from "class-transformer";

export class CategoryDto {
    @Expose()
    id: number;

    @Expose()
    slug: string;

    @Expose()
    name: string;

    // Tambahkan untuk transform URL
    @Expose()
    @Transform(({ obj }) =>
        `https://${obj.networkSlug}.times.co.id/kanal/${obj.slug}`,
        { toClassOnly: true }
    )
    url: string;
}