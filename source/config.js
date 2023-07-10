const VALID_MODES = new Set(["development", "production"]);

export function makeConfig(env) {
	const config = {
		clientId: env.UWUBOT_CLIENT_ID,
		oauthRedirectUri: `${env.UWUBOT_OAUTH_REDIRECT_ORIGIN}/login`,
	};

	const discordOAuthUri = new URL("https://discord.com/api/oauth2/authorize");
	discordOAuthUri.searchParams.set("client_id", config.clientId);
	discordOAuthUri.searchParams.set("response_type", "code");
	discordOAuthUri.searchParams.set("scope", "identify");
	discordOAuthUri.searchParams.set("redirect_uri", config.oauthRedirectUri);

	return {
		...config,
		token: env.UWUBOT_TOKEN,
		cookieSecret: env.UWUBOT_COOKIE_SECRET,
		port: Number(env.UWUBOT_PORT),
		clientSecret: env.UWUBOT_CLIENT_SECRET,
		guildId: env.UWUBOT_GUILD_ID,
		spacesAccessKeyId: env.UWUBOT_SPACES_ACCESS_KEY_ID,
		spacesSecretAccessKey: env.UWUBOT_SPACES_SECRET_ACCESS_KEY,
		spacesBucket: env.UWUBOT_SPACES_BUCKET,
		permissionRoleId: env.UWUBOT_PERMISSION_ROLE_ID,
		discordOAuthUri: discordOAuthUri.toString(),
		commitHash: env.UWUBOT_COMMIT_HASH,
		mode: VALID_MODES.has(env.UWUBOT_MODE) ? env.UWUBOT_MODE : "development",
	};
}
