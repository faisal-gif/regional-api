import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";
import { Focus } from "./fokus.entity";
import { FocusDto } from "./fokus.dto";
import { plainToInstance } from "class-transformer";

@Injectable()
export class FocusService {
    constructor(@InjectRepository(Focus) private repo: Repository<Focus>) { }

    async findAll(networkSlug:string): Promise<FocusDto[]> {
         const data = await this.repo.find({
                 where: { status: '1' },
                 order: { created_at: "DESC" },
                 select: {
                     id: true,
                     name: true,
                  },
             });
     
     
             // Inject networkSlug secara manual ke setiap item
             const enrichedData = data.map((item) => ({
                 ...item,
                 networkSlug,
             }));
     
             return plainToInstance(FocusDto, enrichedData, {
                 excludeExtraneousValues: true,
             });
    }

    

}
