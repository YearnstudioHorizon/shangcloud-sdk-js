# ShangCloud SDK for Node.js

Node.js SDK，封装了授权登录与基础用户信息接口。

- Package: `shangcloud-sdk`
- Node.js 版本: 14+
- 无外部依赖（纯内置模块）
- License: [MIT](../shangcloud-sdk-go/LICENSE)

## 安装

```bash
npm install shangcloud-sdk
```

## 快速开始

以下是一个基于 Express 的完整 OAuth 授权码模式 (Authorization Code) 流程示例。

```javascript
const express = require('express');
const { Client } = require('shangcloud-sdk');

const app = express();

const client = Client.initClient(
  'your-client-id',
  'your-client-secret',
  'https://your-app.example.com/oauth/callback',
);

// 生成授权跳转 URL，将用户引导到授权页
app.get('/login', (req, res) => {
  res.redirect(client.generateOAuthUrl());
});

// 处理授权回调，使用 code 换取 User 实例
app.get('/oauth/callback', async (req, res) => {
  const { code, state } = req.query;

  try {
    const user = await client.generateUserInstance(code, state);

    // 拉取用户基本信息
    const info = await user.getBasicInfo();
    res.send(`Hello, ${info.nickname} (uid=${info.userId})`);
  } catch (err) {
    res.status(401).send(err.message);
  }
});

app.listen(8080);
```

## 核心 API

### `Client.initClient(clientId, clientSecret, redirectUri)`

创建 SDK 客户端。默认 `scope` 为 `user:basic`，`baseUrl` 为 `https://api.yearnstudio.cn`，并使用内置的内存 KV 作为 state 存储。如需自定义，可在返回的实例上直接赋值。如果需要调用 MMO 联机等功能，需要使用 `setScope` 方法来设置正确的 `scope` (例如包含 `mmo`)。

```javascript
const client = Client.initClient('client-id', 'client-secret', 'https://example.com/callback');
// 或直接构造
const client = new Client('client-id', 'client-secret', 'https://example.com/callback');

// 覆盖默认值
client.setScope('user:basic mmo');
client.baseUrl = 'https://api.yearnstudio.cn';
```

### `client.setScope(scope)`

自定义 OAuth 请求的 `scope`，例如需要 MMO 权限时可设置为 `user:basic mmo`。

```javascript
client.setScope('user:basic mmo');
```

### `client.appendScope(scope)`

向当前 OAuth 请求的 `scope` 中追加权限，例如需要添加 MMO 权限时，可直接追加 `mmo`。如果该权限已经存在，则不会重复添加。

```javascript
client.appendScope('mmo');
```

### `client.generateOAuthUrl() -> string`

生成授权跳转 URL，内部随机生成 state 并写入 `kvStorage`，用于后续回调校验。

### `await client.generateUserInstance(code, state) -> UserInstance`

校验 state，向 `/oauth/token` 换取 access token / refresh token，返回 `UserInstance`。

state 不存在或服务端授权失败时抛出 `Error`。

### `client.setClientSecret(clientSecret)`

更换 Client Secret。

```javascript
client.setClientSecret('new-secret');
```

### `await user.getBasicInfo() -> UserBasicInfo`

拉取当前用户的基本信息，请求 `/api/user/info`。

```javascript
// UserBasicInfo 结构
{
  userId:   number,   // uid
  nickname: string,
  mail:     string,
  avatar:   string,
}
```

### `await user.getVariable(key) -> string`、`await user.setVariable(key, value)`、`await user.deleteVariable(key)`

通过 `/api/varibles` 操作当前用户的变量存储，需要授权时携带 `var:io` scope。

```javascript
await user.setVariable('theme', 'dark');
const value = await user.getVariable('theme');
await user.deleteVariable('theme');
```

### `user.isExpired() -> boolean`

检查 token 是否即将过期（提前 60 秒返回 `true`）。

```javascript
if (user.isExpired()) {
  // 重新发起授权流程
}
```

### `user.save()`

默认实现为空操作（内存存储无需持久化）。子类可覆写此方法将 token 写入数据库或 session。

## 自定义扩展

### 自定义 state 存储

继承 `TempVarStorage`，替换为 Redis 等共享存储，适用于多实例 / 集群部署：

```javascript
const { TempVarStorage, Client } = require('shangcloud-sdk');
const Redis = require('ioredis');

class RedisKv extends TempVarStorage {
  constructor() {
    super();
    this._r = new Redis();
  }

  setTempVariable(key, value) {
    this._r.setex(key, 300, value); // 5 分钟过期
  }

  async getTempVariable(key) {
    const v = await this._r.get(key);
    if (!v) throw new Error(`Key '${key}' not found`);
    return v;
  }

  deleteTempVariable(key) {
    this._r.del(key);
  }
}

const client = Client.initClient('id', 'secret', 'https://example.com/callback');
client.kvStorage = new RedisKv();
```

### 自定义 User 持久化

继承 `UserInstance`，覆写 `initUser` / `save` 加入数据库或 session 持久化逻辑：

```javascript
const { UserInstance } = require('shangcloud-sdk');

class SessionUser extends UserInstance {
  constructor(session) {
    super();
    this._session = session;
  }

  initUser(accessToken, refreshToken, tokenType, expiresIn, client) {
    super.initUser(accessToken, refreshToken, tokenType, expiresIn, client);
    this._session.tokenType  = tokenType;
    this._session.expiryTime = this.expiryTime.toISOString();
    this.save();
  }

  save() {
    // session 自动持久化，无需额外操作
  }
}
```

## 注意事项

- **内存 KV 仅适用于单进程**。在多进程 / 多服务器部署（如 PM2 cluster 模式、Kubernetes 多副本）时，请替换 `kvStorage` 为 Redis 等共享存储，否则跨进程的 state 校验会失败。
- `_clientSecret` 及 token 字段以下划线前缀约定为私有，不应直接访问或打印到日志中。
- `generateUserInstance` 和 `getBasicInfo` 均为异步方法，务必使用 `await` 或处理返回的 `Promise`，否则错误将变为未处理的 rejection。
- `isExpired()` 提前 60 秒返回 `true`，确保 token 在请求过程中不会中途失效。
- SDK 未实现 token 刷新；`refresh_token` 存储于 `UserInstance` 但不主动使用，需要刷新时请自行调用平台 refresh 端点后重建 `UserInstance`。

## License

[MIT](../shangcloud-sdk-go/LICENSE)
