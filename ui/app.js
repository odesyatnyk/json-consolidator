(function () {
	new Vue({
		el: "#app",
		vuetify: new Vuetify({
			icons: {
				iconfont: "fa",
			},
			theme: { dark: true }
		}),
		data() {
			return {
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
		},
		computed: {
			headers() {
				return [
					{
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
		},
	});
})();
