import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";
import { Network } from "./network.entity";


@Injectable()
export class NetworkService {
    constructor(@InjectRepository(Network) private repo: Repository<Network>) { }

    async findOne(slug: string) {
        return this.repo.findOne({
            where: { slug },
            select: {
                id: true,
                name: true,
                slug: true,
                title: true,
                tagline: true,
                description: true,
                keyword: true,
                domain: true,
                logo: true,
                logo_m: true,
            }
        });
    }

}
