import type { Client } from "./client";
import { NotInitializedError } from "./exception";
import type { MMOJoinRoomResponse, MMONewRoomResponse } from "./models";

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

    public async newRoom(protocol?: string): Promise<MMONewRoomResponse> {
        if (!this.client) throw new NotInitializedError();
        const raw = await this.client.mmoRequest<{ connect_key: string; edge_url: string; room_id: string; protocol: string }>(
            '/api/mmo/room/new', {}, this.accessToken, this.tokenType, undefined, protocol
        );
        return { connectKey: raw.connect_key, edgeUrl: raw.edge_url, roomId: raw.room_id, protocol: raw.protocol };
    }

    public async joinRoom(roomId: string, protocol?: string): Promise<MMOJoinRoomResponse> {
        if (!this.client) throw new NotInitializedError();
        const raw = await this.client.mmoRequest<{ connect_key: string; edge_url: string; room_id: string; protocol: string; assigned_uid?: string }>(
            '/api/mmo/room/join', {}, this.accessToken, this.tokenType, roomId, protocol
        );
        return { connectKey: raw.connect_key, edgeUrl: raw.edge_url, roomId: raw.room_id, protocol: raw.protocol, assignedUid: raw.assigned_uid };
    }

    public async setRoomConfig(roomId: string, allowMultiLogin: boolean): Promise<void> {
        if (!this.client) throw new NotInitializedError();
        await this.client.mmoRequest('/api/mmo/room/config', { allow_multi_login: allowMultiLogin }, this.accessToken, this.tokenType, roomId);
    }

    public async setRoomData(roomId: string, key: string, value: unknown, dataType?: string): Promise<void> {
        if (!this.client) throw new NotInitializedError();
        const body: Record<string, unknown> = { key, value };
        if (dataType) body['type'] = dataType;
        await this.client.mmoRequest('/api/mmo/room/data/set', body, this.accessToken, this.tokenType, roomId);
    }

    public async getRoomData(roomId: string): Promise<Record<string, unknown>> {
        if (!this.client) throw new NotInitializedError();
        const raw = await this.client.mmoRequest<{ extra_data: Record<string, unknown> }>(
            '/api/mmo/room/data/get', {}, this.accessToken, this.tokenType, roomId
        );
        return raw.extra_data;
    }

    public async deleteRoomData(roomId: string, key: string): Promise<void> {
        if (!this.client) throw new NotInitializedError();
        await this.client.mmoRequest('/api/mmo/room/data/delete', { key }, this.accessToken, this.tokenType, roomId);
    }

    public async kickUser(roomId: string, targetUid: string): Promise<void> {
        if (!this.client) throw new NotInitializedError();
        await this.client.mmoRequest('/api/mmo/room/kick', { target_uid: targetUid }, this.accessToken, this.tokenType, roomId);
    }

    public async getRoomUserCount(roomId: string): Promise<number> {
        if (!this.client) throw new NotInitializedError();
        const raw = await this.client.mmoRequest<{ user_count: number }>(
            '/api/mmo/room/usercount', {}, this.accessToken, this.tokenType, roomId
        );
        return raw.user_count;
    }
}
