window.__ModuleLoader__.load({
	id: "@badai147/dsh-ocgo-usage",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");

		//#region styles — aligned with the shipped sidebar footer action & panel look
		const CSS = [
			".ocgu-cell{flex:none;align-items:center;width:100%;height:42px;margin:8px 0 0;display:flex;position:relative;}",
			".ocgu-btn{align-items:center;width:100%;height:42px;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border:none;border-radius:12px;gap:8px;margin:0 -2px;padding:0 10px 0 8px;font-family:inherit;font-size:14px;display:inline-flex;overflow:hidden;user-select:none;}",
			".ocgu-btn:hover{background:var(--dsw-alias-interactive-bg-hover);}",
			".ocgu-label{text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1;overflow:hidden;text-align:left;}",
			".ocgu-badge{color:var(--dsw-alias-state-success-primary);font-variant-numeric:tabular-nums;flex:none;margin-left:auto;font-size:12px;line-height:16px;}",
			".ocgu-badge.warn{color:var(--dsw-alias-state-warn-primary);}",
			".ocgu-badge.err{color:var(--dsw-alias-state-error-primary);}",
			".ocgu-cell.rail{width:36px;height:36px;margin:0;}",
			".ocgu-cell.rail .ocgu-btn{border-radius:50%;justify-content:center;gap:0;width:36px;height:36px;padding:0;}",
			".ocgu-card{z-index:30;position:fixed;width:320px;max-width:calc(100vw - 24px);max-height:60vh;border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-specific-menu);box-shadow:var(--dsw-shadow-lv3);border-radius:12px;flex-direction:column;display:flex;overflow:hidden;}",
			".ocgu-card-head{box-sizing:border-box;flex:none;justify-content:space-between;align-items:center;min-height:44px;padding:10px 12px;display:flex;}",
			".ocgu-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:20px;}",
			".ocgu-body{flex:1;min-height:0;padding:0 12px 12px;display:flex;flex-direction:column;gap:10px;}",
			".ocgu-msg{color:var(--dsw-alias-label-tertiary);margin:4px 0;font-size:12px;line-height:18px;}",
			".ocgu-msg.err{color:var(--dsw-alias-state-error-primary);}",
			".ocgu-row{flex-direction:column;gap:5px;display:flex;}",
			".ocgu-row-head{justify-content:space-between;align-items:baseline;gap:8px;display:flex;}",
			".ocgu-row-label{color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;}",
			".ocgu-row-meta{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:20px;font-variant-numeric:tabular-nums;}",
			".ocgu-track{height:6px;border-radius:3px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;}",
			".ocgu-fill{height:100%;border-radius:3px;background:var(--dsw-alias-state-business-primary);transition:width .3s ease;}",
			".ocgu-fill.warn{background:var(--dsw-alias-state-warn-primary);}",
			".ocgu-fill.err{background:var(--dsw-alias-state-error-primary);}"
		].join("\n");
		const STYLE_ID = "@badai147/dsh-ocgo-usage/css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=\"" + STYLE_ID + "\"]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@badai147/dsh-ocgo-usage";
			tag.dataset.pluginCss = STYLE_ID;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}
		//#endregion

		const fmtTime = (iso) => {
			if (!iso) return "—";
			const d = new Date(iso);
			if (isNaN(d.getTime())) return "—";
			const p = (n) => String(n).padStart(2, "0");
			return p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
		};
		const ICON = react.createElement("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" },
			react.createElement("path", { d: "M5.5 18a9 9 0 1 1 13 0" }),
			react.createElement("path", { d: "M12 12l3.6-3.6" }),
			react.createElement("circle", { cx: 12, cy: 12, r: 1.4, fill: "currentColor", stroke: "none" })
		);
		const badgeClass = (pct) => {
			if (pct === null || pct === undefined) return "ocgu-badge";
			const remain = 100 - pct;
			if (remain <= 0) return "ocgu-badge err";
			if (remain <= 20) return "ocgu-badge warn";
			return "ocgu-badge";
		};
		const fillClass = (pct) => {
			if (pct >= 100) return "ocgu-fill err";
			if (pct >= 80) return "ocgu-fill warn";
			return "ocgu-fill";
		};
		const ROWS = [
			{ key: "rolling", label: "滚动用量" },
			{ key: "weekly", label: "本周" },
			{ key: "monthly", label: "本月" }
		];

		const inject = ["slots", "timer"];
		function apply(ctx) {
			//#region shared store (per activation, bound to this ctx)
			const listeners = [];
			let state = { open: false, rect: null, data: null, error: null, loading: true };
			let closeDisposer = null;
			const setState = (patch) => {
				state = Object.assign({}, state, patch);
				listeners.forEach((fn) => fn(state));
			};
			const subscribe = (fn) => {
				listeners.push(fn);
				return () => {
					const i = listeners.indexOf(fn);
					if (i >= 0) listeners.splice(i, 1);
				};
			};
			const cancelClose = () => {
				if (closeDisposer) { closeDisposer(); closeDisposer = null; }
			};
			const scheduleClose = () => {
				cancelClose();
				closeDisposer = ctx.timeout(() => setState({ open: false }), 160);
			};
			const openAt = (rect) => {
				cancelClose();
				setState({ open: true, rect });
			};
			const load = async () => {
				try {
					const resp = await fetch(window.location.origin + "/api/ocgo-usage", { cache: "no-store" });
					const r = await resp.json();
					if (r && r.error) setState({ error: String(r.error), data: null, loading: false });
					else setState({ data: r, error: null, loading: false });
				} catch (e) {
					setState({ error: String((e && e.message) || e), data: null, loading: false });
				}
			};
			//#endregion

			/** Bottom-left sidebar footer action: icon + label + live rolling percent badge. */
			function Cell(props) {
				const [s, setS] = react.useState(state);
				react.useEffect(() => subscribe(setS), []);
				react.useEffect(() => {
					load();
					return ctx.interval(load, 60000);
				}, []);
				const onEnter = (e) => {
					const r = e.currentTarget.getBoundingClientRect();
					openAt({ left: r.left, top: r.top, anchorTop: r.top, anchorBottom: r.bottom });
				};
				const pct = s.data && s.data.rolling && typeof s.data.rolling.percent === "number" ? s.data.rolling.percent : null;
				const cellCls = props.wide ? "ocgu-cell" : "ocgu-cell rail";
				return react.createElement("div", { className: cellCls, onMouseEnter: onEnter, onMouseLeave: scheduleClose },
					react.createElement("div", { className: "ocgu-btn" },
						ICON,
						props.wide ? react.createElement("span", { className: "ocgu-label" }, "Go 用量") : null,
						pct !== null ? react.createElement("span", { className: badgeClass(pct) }, String(Math.max(0, 100 - pct)) + "%") : null
					)
				);
			}

			/** Hover detail card: opens above the button, falls back below when there is no room. */
			function Card() {
				const [s, setS] = react.useState(state);
				react.useEffect(() => subscribe(setS), []);
				const cardRef = react.useRef(null);
				// Position the card above the button from the ORIGINAL anchor; never
				// re-derive from the already-adjusted top (that looped and flickered).
				react.useLayoutEffect(() => {
					const el = cardRef.current;
					const r = s.rect;
					if (!el || !r || typeof r.anchorTop !== "number") return;
					const h = el.offsetHeight;
					let top = r.anchorTop - h - 8;
					if (top < 8) top = r.anchorBottom + 8;
					if (top !== r.top) setState({ rect: Object.assign({}, r, { top }) });
				}, [s.rect, s.loading, s.data, s.error]);
				if (!s.open || !s.rect) return null;
				const body = s.loading
					? react.createElement("div", { className: "ocgu-msg" }, "加载中…")
					: s.error
						? react.createElement("div", { className: "ocgu-msg err" }, "获取失败：" + s.error)
						: ROWS.map((row) => {
							const d = s.data && s.data[row.key];
							if (!d || d.percent === null || d.percent === undefined) {
								return react.createElement("div", { key: row.key, className: "ocgu-row" },
									react.createElement("div", { className: "ocgu-row-head" },
										react.createElement("span", { className: "ocgu-row-label" }, row.label),
										react.createElement("span", { className: "ocgu-row-meta" }, "—")
									)
								);
							}
							return react.createElement("div", { key: row.key, className: "ocgu-row" },
								react.createElement("div", { className: "ocgu-row-head" },
									react.createElement("span", { className: "ocgu-row-label" }, row.label),
									react.createElement("span", { className: "ocgu-row-meta" }, String(d.percent) + "% · " + fmtTime(d.resetsAt) + " 重置")
								),
								react.createElement("div", { className: "ocgu-track" },
									react.createElement("div", { className: fillClass(d.percent), style: { width: String(Math.min(100, d.percent)) + "%" } })
								)
							);
						});
				return react.createElement("div", { className: "ocgu-card", ref: cardRef, style: { left: s.rect.left, top: s.rect.top }, onMouseEnter: cancelClose, onMouseLeave: scheduleClose },
					react.createElement("div", { className: "ocgu-card-head" },
						react.createElement("div", { className: "ocgu-title" }, "Opencode Go 使用统计")
					),
					react.createElement("div", { className: "ocgu-body" }, body)
				);
			}

			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "ocgo-usage",
				order: 1
			}, Cell));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "ocgo-usage-card"
			}, Card));
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});