import { Expose, Transform, Type } from "class-transformer";
import { NewsDto } from "src/news/news.dto";

export class CategoryDto {
    @Expose()
    id: number;

    @Expose()
    slug: string;

    @Expose()
    name: string;

    @Expose()
    description: string;

    @Expose()
    keyword: string;

    @Expose()
    parent_kanal: number | null;

    // Tambahkan untuk transform URL
    @Expose()
    @Transform(({ obj }) =>
        `/kanal/${obj.slug}`,
        { toClassOnly: true }
    )
    url: string;

    @Expose()
    @Type(() => CategoryDto)
    children?: CategoryDto[];

    @Expose()
    @Type(() => NewsDto) // Mengonversi array di dalamnya menjadi NewsDto
    @Expose()
    news: NewsDto[];
}