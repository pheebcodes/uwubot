export class Auth {
	constructor({ config, discord }) {
		this._discord = discord;

		this._permissionRoleId = config.permissionRoleId;
	}

	async redeemCode(code) {
		const response = this._discord.oauthToken(code);
		return response;
	}

	async validate({ access_token: accessToken }) {
		try {
			const user = await this._discord.getUser(accessToken);
			const member = await this._discord.getMember(user.id);
			const memberRoles = new Set(member.roles);
			if (memberRoles.has(this._permissionRoleId) === false) {
				throw new UserWithoutPermission(
					"User does not have permission to use uwubot.",
				);
			}
			return member;
		} catch (e) {
			console.error(e);
			throw new UserNotInGuildError("User is not in guild.");
		}
	}
}

export class UserNotInGuildError extends Error {}
export class UserWithoutPermission extends Error {}
