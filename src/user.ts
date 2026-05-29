import type { Client } from "./client";
import { NotInitializedError } from "./exception";

export class UserInstance {
    public expiresIn: number;
    public expiryTime: Date;

    private accessToken: string;
    private refreshToken: string;
    private tokenType: string;
    private client: Client | null;

    constructor() {
        this.accessToken = '';
        this.refreshToken = '';
        this.tokenType = '';
        this.expiresIn = 0;
        this.expiryTime = new Date();
        this.client = null;
    }

    protected customInitUser(): void { };
    protected save(): void { };

    public initUser(accessToken: string, refreshToken: string, tokenType: string, expiresIn: number, client: Client) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenType = tokenType;
        this.expiresIn = expiresIn;
        this.client = client;
        this.expiryTime = new Date(Date.now() + expiresIn * 1000);
        this.save();
    }
    public isExpired() {
        return new Date(Date.now() + 60_000) > this.expiryTime;
    }
    public async getBasicInfo() {
        if (!this.client) throw new NotInitializedError();
        return this.client.getUserBasicInfo(this.accessToken, this.tokenType);
    }
    public async getVariable(key: string) {
        if (!this.client) throw new NotInitializedError();
        return this.client.variableAction('read', key, '', this.accessToken, this.tokenType);
    }
    public async setVariable(key: string, value: string) {
        if (!this.client) throw new NotInitializedError();
        await this.client.variableAction('write', key, value, this.accessToken, this.tokenType);
    }
    public async deleteVariable(key: string) {
        if (!this.client) throw new NotInitializedError();
        await this.client.variableAction('delete', key, '', this.accessToken, this.tokenType);
    }
}
