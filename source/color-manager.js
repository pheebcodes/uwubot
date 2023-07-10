import assert from "assert";
import { customAlphabet } from "nanoid";
import { hex2contrast } from "@csstools/convert-colors";

export const REQUIRED_CONTRAST_RATIO = 2.5;
export const BG_COLOR = "#37393E";

const nanoid = customAlphabet("0123456789abcdef", 10);

export class ColorManager {
	constructor({ database, discord }) {
		this._database = database;
		this._discord = discord;
	}

	async getColor(member) {
		const role = await this._findOrCreateByName(member);
		const hexRight = role.color.toString(16);
		const hex = hexRight.padStart(6, "0").padStart(7, "#");
		return hex;
	}

	async setColor(member, color) {
		assert.ok(
			hex2contrast(color, BG_COLOR) >= REQUIRED_CONTRAST_RATIO,
			new NotEnoughContrastError(color, BG_COLOR),
		);
		if (color.startsWith("#")) {
			color = color.slice(1);
		}
		const role = await this._findOrCreateByName(member);
		await this._discord.modifyRole(role.id, { color: parseInt(color, 16) });
	}

	async _findOrCreateByName(member) {
		const roleId = await this._database.tryGet(`user-role/${member.user.id}`);
		let role = await this._tryGetRole(roleId);
		if (role === null) {
			role = await this._discord.createRole({
				name: nanoid(),
				permissions: "0",
				hoist: false,
				mentionable: false,
			});
			await this._discord.addMemberToRole(member.user.id, role.id);
			await this._database.set(`user-role/${member.user.id}`, role.id);
		}
		return role;
	}

	async _tryGetRole(roleId) {
		if (roleId === null) {
			return null;
		}
		const roles = await this._discord.getRoles();
		const role = roles.find((role) => role.id === roleId) || null;
		return role;
	}
}

export class NotEnoughContrastError extends Error {
	constructor(c1, c2) {
		super(`Not enough contrast: ${c1} ${c2}`);
	}
}
