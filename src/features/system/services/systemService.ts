
import { ISystemRepository } from '../repositories/ISystemRepository';
import { SupabaseSystemRepository } from '../repositories/SupabaseSystemRepository';

export class SystemService {
    constructor(private repository: ISystemRepository) { }

    async checkAndFixProgressions(): Promise<number> {
        return await this.repository.checkAndFixProgressions();
    }

    async generateDemoData(userId: string): Promise<void> {
        return await this.repository.generateDemoData(userId);
    }

    async hardReset(userId: string): Promise<void> {
        return await this.repository.hardReset(userId);
    }
}

export const systemService = new SystemService(new SupabaseSystemRepository());
