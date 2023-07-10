import Express from "express";
import Consolidate from "consolidate";
import CookieParser from "cookie-parser";
import { UserNotInGuildError, UserWithoutPermission } from "./auth.js";
import {
	BG_COLOR,
	NotEnoughContrastError,
	REQUIRED_CONTRAST_RATIO,
} from "./color-manager.js";

export class HttpServer {
	constructor({ config, auth, channelManager, colorManager, dynamicConfig }) {
		this._auth = auth;
		this._channelManager = channelManager;
		this._colorManager = colorManager;
		this._dynamicConfig = dynamicConfig;

		const apiRouter = Express.Router()
			.use(this.failIfNotAuthed)
			.patch("/color", this.patchColor)
			.post("/channels/:id", this.addToChannel)
			.delete("/channels/:id", this.removeFromChannel);

		const appRouter = Express.Router()
			.get("/login", this.login)
			.use(this.redirectIfNotAuthed)
			.get("/", this.renderTemplate);

		this._discordOAuthUri = config.discordOAuthUri;
		this._port = Number(config.port);
		this._app = Express()
			.engine("hbs", Consolidate.handlebars)
			.set("views", "source/templates")
			.set("view engine", "hbs")
			.set("trust proxy", true)
			.set("env", config.mode)
			.use(CookieParser(config.cookieSecret))
			.use(Express.text())
			.use("/api", apiRouter)
			.use(appRouter)
			.use(this.errorHandler);
	}

	listen(cb) {
		this._app.listen(this._port, cb);
	}

	_wrap(asyncFn) {
		return (req, res, next) => {
			asyncFn(req, res).then(
				(v) => {
					if (v !== false) {
						next();
					}
				},
				(err) => next(err),
			);
		};
	}

	_ensureLogin(failFn) {
		return this._wrap(async (req, res) => {
			const authCookie = await this._dynamicConfig.get("auth-cookie");
			try {
				if (authCookie in req.signedCookies === false) {
					return failFn(req, res);
				}
				const parsedCookie = JSON.parse(req.signedCookies[authCookie]);
				const member = await this._auth.validate(parsedCookie);
				req.member = member;
			} catch (e) {
				if (e instanceof UserNotInGuildError) {
					res.status(401).send("You are not in the guild.");
					return false;
				}
				if (e instanceof UserWithoutPermission) {
					res.status(401).send("You do not have permission to use uwubot.");
					return false;
				}
				throw e;
			}
		});
	}

	failIfNotAuthed = this._ensureLogin(async (_req, res) => {
		res.status(401).send();
		return false;
	});

	patchColor = this._wrap(async (req, res) => {
		try {
			await this._colorManager.setColor(req.member, req.body);
		} catch (e) {
			if (e instanceof NotEnoughContrastError) {
				res.status(400).send("Not enough contrast.");
				return false;
			}
			throw e;
		}
		res.status(204).send();
		return false;
	});

	addToChannel = this._wrap(async (req, res) => {
		await this._channelManager.addMemberToChannel(req.member, req.params.id);
		res.status(204).send();
		return false;
	});

	removeFromChannel = this._wrap(async (req, res) => {
		await this._channelManager.removeMemberFromChannel(
			req.member,
			req.params.id,
		);
		res.status(204).send();
		return false;
	});

	login = this._wrap(async (req, res) => {
		const code = req.query.code;
		const obj = await this._auth.redeemCode(code);
		const cookie = JSON.stringify(obj);
		const authCookie = await this._dynamicConfig.get("auth-cookie");
		res.cookie(authCookie, cookie, {
			httpOnly: true,
			signed: true,
		});
		res.redirect("/");
		return false;
	});

	redirectIfNotAuthed = this._ensureLogin(async (_req, res) => {
		res.redirect(this._discordOAuthUri);
		return false;
	});

	renderTemplate = this._wrap(async (req, res) => {
		const [channels, color] = await Promise.all([
			this._channelManager.getOverwritesForMember(req.member),
			this._colorManager.getColor(req.member),
		]);

		res.render("main", {
			channels,
			color,
			BG_COLOR,
			REQUIRED_CONTRAST_RATIO,
		});
		return false;
	});

	errorHandler = (err, _req, res, _next) => {
		console.log(err);
		res.status(500).send("Unknown error.");
	};
}
