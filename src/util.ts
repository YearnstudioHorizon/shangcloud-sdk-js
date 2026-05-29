import crypto from 'crypto';
import https from 'https';
import http from 'http';

export function generateRandomString(length: number) {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
}
export function httpRequest<T>({ url, method, headers, body }: { url: string, method: "GET" | "POST", headers: http.OutgoingHttpHeaders, body: string }) {
    return new Promise<T>((resolve, reject) => {
        const urlObj = new URL(url);
        const lib = urlObj.protocol === 'https:' ? https : http;
        const bodyBuffer = Buffer.from(body);

        const req = lib.request(
            {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method,
                headers: { ...headers, 'Content-Length': bodyBuffer.length },
                timeout: 10000,
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode === undefined) return;
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        reject(new Error(`Server returned error status: ${res.statusCode}, body: ${data}`));
                        return;
                    }
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            }
        );

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });

        req.write(bodyBuffer);
        req.end();
    });
}