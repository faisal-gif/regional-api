import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";
import { Category } from "./categories.entity";
import { plainToInstance } from "class-transformer";
import { CategoryDto } from "./categories.dto";

@Injectable()
export class CategoryService {
    constructor(@InjectRepository(Category) private repo: Repository<Category>) { }

    async findAll(networkSlug: string): Promise<CategoryDto[]> {

        const data = await this.repo.find({
            where: { status: '1' },
            order: { created_at: "DESC" },
            select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                keyword: true,
                status: true,
            },
        });


        // Inject networkSlug secara manual ke setiap item
        const enrichedData = data.map((item) => ({
            ...item,
            networkSlug,
        }));

        return plainToInstance(CategoryDto, enrichedData, {
            excludeExtraneousValues: true,
        });

    

    }


}
