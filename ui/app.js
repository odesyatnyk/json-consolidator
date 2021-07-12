(function () {

	const getCssVar = name => {
		return getComputedStyle(document.documentElement).getPropertyValue(name);
	};

	const getTheme = () => {
		return {
			secondary: getCssVar('--vscode-editor-background'),
			accent: getCssVar('--vscode-sideBar-background'),
			error: getCssVar('--vscode-editorError-foreground'),
			info: getCssVar('--vscode-editorInfo-foreground'),
			success: getCssVar('--vscode-editorInfo-foreground'),
			warning: getCssVar('--vscode-editorWarning-foreground'),
		};
	};

	const isDark = () => {
		const themeKind = document.querySelector('body').getAttribute('data-vscode-theme-kind');
		return ['vscode-dark', 'vscode-high-contrast'].includes(themeKind);
	};

	const theme = getTheme();

	const vuetifyOptions = {
		icons: {
			iconfont: "fa",
		},
		theme: {
			dark: isDark(),
			themes: {
				light: theme,
				dark: theme,
			}
		}
	};

	Vue.use(Vuetify);

	new Vue({
		el: "#app",
		vuetify: new Vuetify(vuetifyOptions),
		data() {
			return {
				sortBy: ['key'],
				search: "",
				loading: false,
				searchIncludeNew: false,
				errorsOnly: false,
				files: [],
				items: [],
				vscode: acquireVsCodeApi(),
			};
		},
		created() {
			window.addEventListener("message", (event) => {
				this.handleMessage(event.data);
			});

			this.watchThemeChanges();
			this.refresh();
		},
		methods: {
			handleMessage(message) {
				switch (message.command) {
					case "populateData":
						this.populateData(message.data);
						break;
					case "showErrors":
						this.showErrors(message.data);
						break;
					default:
						break;
				}
			},
			populateData(data) {
				this.files = data.files;
				this.items = data.items;
			},
			showErrors(data) {
				data.errors.forEach((error) => {
					const row = this.items.find((x) => x.id === error.id);
					row.errors = error.errors;
				});
			},
			deleteItem(item) {
				this.items = this.items.filter((x) => x.id !== item.id);
			},
			addRow() {
				this.items.push({
					id: this.nextId,
					originalKey: "",
					key: "",
					errors: [],
				});
			},
			saveAll() {
				this.clearErrors();
				this.vscode.postMessage({
					command: "saveAll",
					data: this.items,
				});
			},
			clearErrors() {
				this.items.forEach((i) => {
					i.errors = [];
				});
			},
			refresh() {
				this.vscode.postMessage({
					command: "refresh",
				});
			},
			onErrorsOnlyToggle(val) {
				if (val) {
					this.searchIncludeNew = false;
				}
			},
			customFilter(value, search, item) {
				const term = search || "";
				const val = value || "";

				if (this.errorsOnly) {
					return (
						item.errors.length > 0 &&
						val.toLowerCase().includes(term.toLowerCase())
					);
				}

				if (this.searchIncludeNew) {
					return item.id < 0 || val.toLowerCase().includes(term.toLowerCase());
				}

				return val.toLowerCase().includes(search.toLowerCase());
			},
			customSort(items, sortBy, sortDesc) {
				return items.sort(comparer);

				function comparer(a, b) {
					let by = sortBy[0];
					const desc = sortDesc[0];

					if (by === "key") {
						by = "originalKey";
					}

					const valA = (a[by] || "").toLowerCase();
					const valB = (b[by] || "").toLowerCase();

					if (valA < valB) {
						return desc ? 1 : -1;
					}

					if (valA > valB) {
						return desc ? -1 : 1;
					}

					return 0;
				}
			},
			watchThemeChanges() {
				const observer = new MutationObserver(mutations => {
					mutations.forEach(m => {
						console.log(m);
						if (m.type !== "attributes" && m.attributeName !== "class") {
							return;
						}
						this.reloadVuetifyTheme();
					});
				});

				document.querySelectorAll("body").forEach(el => observer.observe(el, {attributes: true}));
			},
			reloadVuetifyTheme() {
				const theme = getTheme();

				this.$vuetify.theme.themes.dark = theme;
				this.$vuetify.theme.themes.light = theme;

				this.$vuetify.theme.dark = isDark();
			}
		},
		computed: {
			headers() {
				return [
					{
						sortable: false,
						value: "errors",
						align: " d-none",
						filter: (errors) => {
							if (this.errorsOnly) {
								return errors.length > 0;
							}

							return true;
						},
					},
					{
						text: "Key",
						value: "key",
						cellClass: "pt-2 pb-0",
					},
					...this.files.map((x) => {
						return {
							text: x,
							value: x,
							cellClass: "pt-2 pb-0",
						};
					}),
					{
						sortable: false,
						text: "",
						value: "actions",
						align: "end",
						width: 45,
					},
				];
			},
			nextId() {
				if (!this.items || this.items.length === 0) {
					return -1;
				}

				const min = this.items.reduce((prev, curr) =>
					prev.Cost < curr.Cost ? prev : curr
				);
				return min && min.id < 0 ? min.id - 1 : -1;
			},
			showSettingsBadge() {
				return this.searchIncludeNew || this.errorsOnly;
			},
			styleBackground() {
				return {
					'background-color': this.$vuetify.theme.themes.light.secondary
				};
			},
			styleBackgroundDarken() {
				return {
					'background-color': this.$vuetify.theme.themes.light.accent
				};
			}
		},
	});
})();
