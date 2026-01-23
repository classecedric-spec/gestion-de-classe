
export interface ISystemRepository {
    checkAndFixProgressions(): Promise<number>;
    generateDemoData(userId: string): Promise<void>;
    hardReset(userId: string): Promise<void>;
}
