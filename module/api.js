import * as providers from "./LanguageProvider.js";
import { addSetting } from "./settings.js";

export const availableLanguageProviders = {};

export class PolyglotAPI {
	providers = {};
	polyglot = null;

	init() {
		/** Providers whose systems use "-"" in their names */
		const providerKeys = {
			"cyberpunk-red-core": "cyberpunkRed",
			"dark-heresy": "darkHeresy",
			"uesrpg-d100": "uesrpg",
		};
		// Assumes the first class in the file is the actual LanguageProvider class. This is better than adding an if-clause in the loop
		const supportedSystems = Object.keys(providers)
			.filter((provider) => provider !== "LanguageProvider")
			.map((provider) => provider.replace("LanguageProvider", ""))
			.join("|");
		const systemsRegex = new RegExp(supportedSystems);
		if (systemsRegex.test(game.system.id)) var providerString = game.system.id;
		else providerString = providerKeys[game.system.id] || "";

		const languageProviders = [];
		languageProviders.push(eval(`new providers.${providerString}LanguageProvider("native${providerString.length ? "." + providerString : ""}")`));
		for (let languageProvider of languageProviders) this.providers[languageProvider.id] = languageProvider;
		addSetting("languageProvider", {
			//Has no name or hint
			config: false,
			type: String,
			default: this.defaultProvider(),
			onChange: (str) => {
				this.languageProvider = this.providers[str];
			},
		});
	}

	get languageProvider() {
		return this.polyglot.languageProvider;
	}

	set languageProvider(string) {
		this.polyglot.languageProvider = string;
	}

	attach() {
		game.polyglot.api = this;
		this.polyglot = game.polyglot;
		this.polyglot.registerModule = this.registerModule;
		this.polyglot.registerSystem = this.registerSystem;
		this.updateProvider();
	}

	defaultProvider() {
		/** providerIds should always be sorted the same way so this should achieve a stable default. */
		const providerIds = Object.keys(this.providers);
		if (!providerIds.length) return;
		const gameSystem = providerIds.find((key) => key.startsWith("system.") || key.includes(game.system.id));
		if (gameSystem) return gameSystem;
		const module = providerIds.find((key) => key.startsWith("module."));
		if (module) return module;
		return providerIds[0];
	}

	updateProvider() {
		// If the configured provider is registered use that one. If not use the default provider
		const configuredProvider = game.settings.get("polyglot", "languageProvider");
		const fallbackProvider = game.settings.settings.get("polyglot.languageProvider").default;
		this.polyglot.languageProvider = this.providers[configuredProvider] || this.providers[fallbackProvider];
	}

	registerModule(moduleId, languageProvider) {
		const module = game.modules.get(moduleId);
		if (!module) {
			console.warn(
				`Polyglot | A module tried to register with the id "${moduleId}". However no active module with this id was found. This api registration call was ignored. If you are the author of that module please check that the id passed to "registerModule" matches the id in your manifest exactly.`
			);
			return;
		}
		if (moduleId === "polyglot") {
			console.warn(
				`Polyglot | A module tried to register with the id "${moduleId}", which is not allowed. This api registration call was ignored. If you're the author of the module please use the id of your own module as it's specified in your manifest to register to this api.`
			);
			return;
		}

		this.#register(module, languageProvider);
	}

	/**
	 * @param {providers.LanguageProvider} languageProvider
	 */
	registerSystem(languageProvider) {
		this.#register(game.system, languageProvider);
	}

	#register(source, type, languageProvider) {
		const id = `${type}.${source.id}`;
		const providerInstance = new languageProvider(id);
		availableLanguageProviders[languageProvider.id] = providerInstance;
		this.updateProvider();
	}
}
