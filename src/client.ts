import { generateRandomString, httpRequest } from "./util";
import { RamKv, VariableStorage } from './storage';
import { UserInstance } from './user';

export class Client {
    public clientId: string;
    public redirectUri: string;
    public baseUrl: string;

    private clientSecret: string;
    private scope: string;
    private kvStorage: VariableStorage<string>;

    constructor(clientId: string, clientSecret: string, redirectUri: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.scope = 'user:basic';
        this.baseUrl = 'https://api.yearnstudio.cn';
        this.kvStorage = new RamKv();
    }

    static create(clientId: string, clientSecret: string, redirectUri: string) {
        return new Client(clientId, clientSecret, redirectUri);
    }

    setClientSecret(clientSecret: string) {
        this.clientSecret = clientSecret;
    }

    private generateAuthorizeHeader() {
        return Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    }

    generateOAuthUrl() {
        const state = generateRandomString(10);
        this.kvStorage.set(state, '0');
        const params = new URLSearchParams({
            response_type: 'code',
            state,
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            scope: this.scope,
        });
        return `${this.baseUrl}/oauth/authorize?${params.toString()}`;
    }

    async generateUserInstance(code: string, state: string) {
        try {
            this.kvStorage.get(state);
        } catch {
            throw new Error(`State '${state}' not found or expired`);
        }
        this.kvStorage.delete(state);

        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: this.redirectUri,
        }).toString();

        const tResp = await httpRequest<{
            access_token: string;
            refresh_token: string;
            token_type: string;
            expires_in: number;
        }>({
            url: `${this.baseUrl}/oauth/token`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${this.generateAuthorizeHeader()}`,
            },
            body,
        });

        const user = new UserInstance();
        user.initUser(tResp.access_token, tResp.refresh_token, tResp.token_type, tResp.expires_in, this);
        return user;
    }

    async getUserBasicInfo(accessToken: string, tokenType: string) {
        const data = await this.httpRequest('/api/user/info', {}, accessToken, tokenType);
        return data;
    }

    async variableAction(action: string, key: string, value: string, accessToken: string, tokenType: string) {
        const data = await this.httpRequest(
            '/api/varibles',
            { key, action, value },
            accessToken,
            tokenType,
        );
        if (data && data.error) {
            throw new Error(`variable ${action} failed: ${data.error}`);
        }
        return (data && data.value) || '';
    }

    private async httpRequest(path: string, body: unknown, accessToken: string, tokenType: string) {
        return httpRequest<{ error: string, value: unknown }>({
            url: `${this.baseUrl}${path}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `${tokenType} ${accessToken}`,
            },
            body: JSON.stringify(body),
        });
    }
}
