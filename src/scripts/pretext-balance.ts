import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

type BalanceOptions = {
	maxLines?: number;
	minWidthRatio?: number; // relative to container width
	maxWidthRatio?: number; // relative to container width
};

function getPx(value: string | null): number | null {
	if (!value) return null;
	const n = Number.parseFloat(value);
	return Number.isFinite(n) ? n : null;
}

function getFontShorthand(cs: CSSStyleDeclaration): string {
	// Canvas font shorthand: "style variant weight size/line-height family"
	// Using computed `font` is the most accurate for measurement.
	return cs.font || `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
}

function scoreLines(lines: Array<{ width: number }>): number {
	// Lower is better: prefer similar line widths (less ragged right edge).
	if (lines.length <= 1) return 0;
	let min = Infinity;
	let max = -Infinity;
	for (const l of lines) {
		if (l.width < min) min = l.width;
		if (l.width > max) max = l.width;
	}
	return max - min;
}

function balanceElement(el: HTMLElement, opts: BalanceOptions = {}) {
	const text = (el.textContent ?? "").trim();
	if (!text) return;

	const container = el.parentElement as HTMLElement | null;
	if (!container) return;

	const containerWidth = container.getBoundingClientRect().width;
	if (!Number.isFinite(containerWidth) || containerWidth <= 0) return;

	const cs = getComputedStyle(el);
	const font = getFontShorthand(cs);
	const lineHeight =
		getPx(cs.lineHeight) ??
		Math.round((getPx(cs.fontSize) ?? 16) * 1.4);

	const prepared = prepareWithSegments(text, font);

	const maxLines = opts.maxLines ?? 2;
	const minW = Math.max(180, containerWidth * (opts.minWidthRatio ?? 0.65));
	const maxW = Math.max(minW, containerWidth * (opts.maxWidthRatio ?? 1));

	let bestWidth = maxW;
	let bestScore = Infinity;

	// Sample a small set of widths for stability/perf.
	const steps = 10;
	for (let i = 0; i <= steps; i++) {
		const w = minW + ((maxW - minW) * i) / steps;
		const { lines } = layoutWithLines(prepared, w, lineHeight);
		if (lines.length > maxLines) continue;
		const score = scoreLines(lines);
		if (score < bestScore) {
			bestScore = score;
			bestWidth = w;
		}
	}

	el.style.maxWidth = `${Math.round(bestWidth)}px`;
}

function run() {
	const els = Array.from(
		document.querySelectorAll<HTMLElement>(".post-title, .post-card-title")
	);
	for (const el of els) balanceElement(el, { maxLines: 2 });
}

let raf = 0;
function schedule() {
	if (raf) cancelAnimationFrame(raf);
	raf = requestAnimationFrame(() => run());
}

if (typeof window !== "undefined") {
	window.addEventListener("load", schedule, { once: true });
	window.addEventListener("resize", schedule);
}

