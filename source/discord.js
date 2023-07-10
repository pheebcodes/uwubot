import Got from "got";

const DISCORD_API_URL = "https://discord.com/api/v9";

export class Discord {
	constructor({ config }) {
		this._got = Got.extend({
			headers: {
				"user-agent":
					"DiscordBot (https://github.com/pheebcodes/uwubot, v0)",
			},
			hooks: {
				beforeRequest: [
					(options) => {
						if ("authorization" in options.headers === false) {
							options.headers.authorization = `Bot ${config.token}`;
						}
					},
				],
				afterResponse: [
					(response, _retry) => {
						if (
							Reflect.has(response.headers, "x-ratelimit-remaining") &&
							Reflect.has(response.headers, "x-ratelimit-limit")
						) {
							const path = response.url.slice(DISCORD_API_URL.length);
							const remaining = Number(
								response.headers["x-ratelimit-remaining"],
							);
							const limit = Number(response.headers["x-ratelimit-limit"]);

							if (remaining / limit <= 0.25) {
								console.warn(
									"[discord]: close to rate limit for (%s): %s / %s",
									path,
									remaining,
									limit,
								);
							}
						}
						return response;
					},
				],
			},
			prefixUrl: DISCORD_API_URL,
		});

		this._guildId = config.guildId;
		this._oauthRedirectUri = config.oauthRedirectUri;
		this._clientId = config.clientId;
		this._clientSecret = config.clientSecret;
	}

	async getGateway() {
		return await this._got.get("gateway").json();
	}

	async getChannels() {
		return await this._got.get(`guilds/${this._guildId}/channels`).json();
	}

	async modifyChannelPermissionOverwrite(channelId, overwriteId, params) {
		return await this._got
			.put(`channels/${channelId}/permissions/${overwriteId}`, { json: params })
			.json();
	}

	async createMessage(channelId, params) {
		return await this._got
			.post(`channels/${channelId}/messages`, { json: params })
			.json();
	}

	async getMember(userId) {
		return await this._got
			.get(`guilds/${this._guildId}/members/${userId}`)
			.json();
	}

	async addMemberToRole(userId, roleId) {
		return await this._got
			.put(`guilds/${this._guildId}/members/${userId}/roles/${roleId}`)
			.json();
	}

	async createRole(params) {
		return await this._got
			.post(`guilds/${this._guildId}/roles`, { json: params })
			.json();
	}

	async getRoles() {
		return await this._got.get(`guilds/${this._guildId}/roles`).json();
	}

	async modifyRole(roleId, params) {
		return await this._got
			.patch(`guilds/${this._guildId}/roles/${roleId}`, {
				json: params,
			})
			.json();
	}

	async oauthToken(code) {
		return await this._got
			.post("oauth2/token", {
				form: {
					client_id: this._clientId,
					client_secret: this._clientSecret,
					code,
					grant_type: "authorization_code",
					redirect_uri: this._oauthRedirectUri,
				},
			})
			.json();
	}

	async getUser(accessToken) {
		return await this._got
			.get("users/@me", {
				headers: {
					authorization: `Bearer ${accessToken}`,
				},
			})
			.json();
	}
}

export class Permissions {
	static States = {
		ALLOW: "allow",
		UNSET: "unset",
		DENY: "deny",
	};

	static Flags = {
		VIEW_CHANNEL: 2 ** 10,
	};

	constructor({ allow, deny } = { allow: 0, deny: 0 }) {
		this._allow = Number(allow);
		this._deny = Number(deny);
	}

	allow(n) {
		this._allow = this._addBitwise(this._allow, n);
		this._deny = this._removeBitwise(this._deny, n);
	}

	deny(n) {
		this._allow = this._removeBitwise(this._allow, n);
		this._deny = this._addBitwise(this._deny, n);
	}

	unset(n) {
		this._allow = this._removeBitwise(this._allow, n);
		this._deny = this._removeBitwise(this._deny, n);
	}

	get(n) {
		if (this._allow & n) {
			return Permissions.States.ALLOW;
		}
		if (this._deny & n) {
			return Permissions.States.DENY;
		}
		return Permissions.States.UNSET;
	}

	toObject() {
		return {
			allow: this._allow.toString(),
			deny: this._deny.toString(),
		};
	}

	_addBitwise(n, b) {
		return n | b;
	}

	_removeBitwise(n, b) {
		return n ^ b;
	}
}
