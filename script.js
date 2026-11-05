const pointsInput = document.getElementById('pointsInput');
const clearBtn = document.getElementById('clearBtn');

const degreeSelect = document.getElementById('degreeSelect');
const calcBtn = document.getElementById('calcBtn');

const chart = document.getElementById('chart');
const ctx = chart.getContext('2d');

let points = [];

let coefsLSM = null;
let view = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };

let mode = 'all';

function parsePoints(text) {
    const lines = text.split('\n');
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
	const line = lines[i].trim();
	if (line === '') continue;

	const parts = line.split(/[,\s]+/).filter(s => s !== '');
	if (parts.length < 2) {
	    console.log("need 2 numbers");
	    return null;
	}

	const x = parseFloat(parts[0]);
	const y = parseFloat(parts[1]);

	if (isNaN(x) || isNaN(y)) {
	    console.log("not valid numbers");
	    return null;
	}

	result.push({ x, y });
    }

    return result;
}

function applyPoints() {
    points = parsePoints(pointsInput.value);

    if (points == null) {
	console.log("error");
	return;
    }

    if (points.length < 2) {
	console.log("need at least 2 points");
	return;
    }

    const seen = new Set();
    for (const p of points) {
	if (seen.has(p.x)) {
	    console.log("x repeats");
	    return;
	}
	seen.add(p.x);
    }

    points.sort((a, b) => a.x - b.x);

    console.log('points:', points);
}

clearBtn.addEventListener('click', () => {
    pointsInput.value = '';
    points = [];
});

function lagrangeEval(pts, x) {
    let sum = 0;

    for (let i = 0; i < pts.length; i++) {
	let term = pts[i].y;

	for (let j = 0; j < pts.length; j++) {
	    if (i === j) continue;
	    term *= (x - pts[j].x) / (pts[i].x - pts[j].x);
	}

	sum += term;
    }

    return sum;
}

function solveLSM(pts, degree) {
    const m = degree + 1;
    const n = pts.length;

    const A = [];
    for (let i = 0; i < n; i++) {
	const row = [];
	for (let j = 0; j < m; j++) row.push(Math.pow(pts[i].x, j));
	A.push(row);
    }

    const b = pts.map(p => p.y);

    const scale = [];
    for (let j = 0; j < m; j++) {
	let s = 0;
	for (let i = 0; i < n; i++) s += Math.abs(A[i][j]);
	scale.push(s > 0 ? s : 1);
    }

    const As = [];
    for (let i = 0; i < n; i++) {
	const row = [];
	for (let j = 0; j < m; j++) row.push(A[i][j] / scale[j]);
	As.push(row);
    }

    const Q = [];
    for (let i = 0; i < n; i++) Q.push(new Array(m).fill(0));
    const R = [];
    for (let i = 0; i < m; i++) R.push(new Array(m).fill(0));

    for (let j = 0; j < m; j++) {
	const v = [];
	for (let i = 0; i < n; i++) v.push(As[i][j]);

	for (let k = 0; k < j; k++) {
	    let dot = 0;
	    for (let i = 0; i < n; i++) dot += Q[i][k] * As[i][j];
	    R[k][j] = dot;
	    for (let i = 0; i < n; i++) v[i] -= dot * Q[i][k];
	}

	let norm = 0;
	for (let i = 0; i < n; i++) norm += v[i] * v[i];
	norm = Math.sqrt(norm);
	R[j][j] = norm;

	if (norm < 1e-14) {
	    for (let i = 0; i < n; i++) Q[i][j] = 0;
	} else {
	    for (let i = 0; i < n; i++) Q[i][j] = v[i] / norm;
	}
    }

    const Qb = new Array(m).fill(0);
    for (let k = 0; k < m; k++) {
	let s = 0;
	for (let i = 0; i < n; i++) s += Q[i][k] * b[i];
	Qb[k] = s;
    }

    const z = new Array(m).fill(0);
    for (let i = m - 1; i >= 0; i--) {
	let s = Qb[i];
	for (let j = i + 1; j < m; j++) s -= R[i][j] * z[j];
	z[i] = R[i][i] !== 0 ? s / R[i][i] : 0;
    }

    const coefs = [];
    for (let j = 0; j < m; j++) coefs.push(z[j] / scale[j]);

    return coefs;
}

function polyEval(coefs, x) {
    let s = 0;
    let xp = 1;

    for (let i = 0; i < coefs.length; i++) {
	s += coefs[i] * xp;
	xp *= x;
    }

    return s;
}

function calculate() {
    applyPoints();
    
    if (points.length < 2) {
	console.log("need at least 2 points");
	return;
    }

    const degree = parseInt(degreeSelect.value);
    const maxDegree = Math.min(degree, points.length - 1);

    console.log("=== Лагранж ===");
    for (const p of points) {
	const yHat = lagrangeEval(points, p.x);
	console.log("x=" + p.x, "y=" + p.y, "y_=" + yHat.toFixed(6), "r=" + (p.y - yHat).toFixed(6));
    }

    coefsLSM = solveLSM(points, maxDegree);

    console.log("=== МНК ===");
    console.log("коефіцієнти:", coefsLSM);
    for (const p of points) {
	const yHat = polyEval(coefsLSM, p.x);
	console.log("x=" + p.x, "y=" + p.y, "y_=" + yHat.toFixed(6), "r=" + (p.y - yHat).toFixed(6));
    }

    let lsmSSE = 0;
    for (const p of points) {
	const e = p.y - polyEval(coefsLSM, p.x);
	lsmSSE += e * e;
    }
    console.log("МНК: сума квадратів залишків =", lsmSSE);

    drawChart();
}

calcBtn.addEventListener("click", calculate);

function resizeChart() {
    const rect = chart.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    chart.width = Math.round(rect.width * dpr);
    chart.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: rect.width, h: rect.height };
}

function computeView() {
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;

    for (const p of points) {
	if (p.x < xMin) xMin = p.x;
	if (p.x > xMax) xMax = p.x;
	if (p.y < yMin) yMin = p.y;
	if (p.y > yMax) yMax = p.y;
    }

    const dx = (xMax - xMin) || 1;
    const dy = (yMax - yMin) || 1;

    view.xMin = xMin - dx * 0.1;
    view.xMax = xMax + dx * 0.1;
    view.yMin = yMin - dy * 0.2;
    view.yMax = yMax + dy * 0.2;
}

function toScreen(x, y, w, h, pad) {
    const sx = pad + (x - view.xMin) / (view.xMax - view.xMin) * (w - 2 * pad);
    const sy = h - pad - (y - view.yMin) / (view.yMax - view.yMin) * (h - 2 * pad);
    return { sx, sy };
}

function drawGrid(w, h, pad) {
    const xRange = view.xMax - view.xMin;
    const yRange = view.yMax - view.yMin;
    const xStep = niceStep(xRange / 8);
    const yStep = niceStep(yRange / 6);

    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#888';

    const xStart = Math.ceil(view.xMin / xStep) * xStep;
    for (let x = xStart; x <= view.xMax + 1e-9; x += xStep) {
	const pos = toScreen(x, view.yMin, w, h, pad);
	ctx.beginPath();
	ctx.moveTo(pos.sx, pad);
	ctx.lineTo(pos.sx, h - pad);
	ctx.stroke();
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';
	ctx.fillText(formatNum(x), pos.sx, h - pad + 6);
    }

    const yStart = Math.ceil(view.yMin / yStep) * yStep;
    for (let y = yStart; y <= view.yMax + 1e-9; y += yStep) {
	const pos = toScreen(view.xMin, y, w, h, pad);
	ctx.beginPath();
	ctx.moveTo(pad, pos.sy);
	ctx.lineTo(w - pad, pos.sy);
	ctx.stroke();
	ctx.textAlign = 'right';
	ctx.textBaseline = 'middle';
	ctx.fillText(formatNum(y), pad - 8, pos.sy);
    }

    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad, h - pad);
    ctx.lineTo(w - pad, h - pad);
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, h - pad);
    ctx.stroke();
}

function drawCurve(w, h, pad, fn, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const steps = 300;
    let started = false;

    for (let i = 0; i <= steps; i++) {
	const x = view.xMin + (view.xMax - view.xMin) * i / steps;
	const y = fn(x);
	if (!isFinite(y)) { started = false; continue; }

	const pos = toScreen(x, y, w, h, pad);
	if (!started) { ctx.moveTo(pos.sx, pos.sy); started = true; }
	else ctx.lineTo(pos.sx, pos.sy);
    }

    ctx.stroke();
}

function drawPoints(w, h, pad) {
    for (const p of points) {
	const pos = toScreen(p.x, p.y, w, h, pad);
	ctx.beginPath();
	ctx.arc(pos.sx, pos.sy, 5, 0, Math.PI * 2);
	ctx.fillStyle = '#e74c3c';
	ctx.fill();
	ctx.strokeStyle = '#fff';
	ctx.lineWidth = 2;
	ctx.stroke();
    }
}

function drawChart() {
    const size = resizeChart();
    const w = size.w;
    const h = size.h;
    const pad = 50;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);

    if (points.length < 2) return;

    computeView();
    drawGrid(w, h, pad);

    if (mode === 'all' || mode === 'interp') {
	drawCurve(w, h, pad, x => lagrangeEval(points, x), '#3498db');
    }

    if ((mode === 'all' || mode === 'lsm') && coefsLSM) {
	drawCurve(w, h, pad, x => polyEval(coefsLSM, x), '#2ecc71');
    }

    drawPoints(w, h, pad);
}

window.addEventListener('resize', drawChart);

function niceStep(raw) {
    if (raw <= 0 || !isFinite(raw)) return 1;
    const exp = Math.floor(Math.log10(raw));
    const f = raw / Math.pow(10, exp);
    let nf;
    if (f < 1.5) nf = 1;
    else if (f < 3) nf = 2;
    else if (f < 7) nf = 5;
    else nf = 10;
    return nf * Math.pow(10, exp);
}

function formatNum(v) {
    if (Math.abs(v) < 1e-9) return "0";
    if (Math.abs(v) >= 10000 || (Math.abs(v) < 0.01 && v !== 0)) return v.toExponential(1);
    return (Math.round(v * 100) / 100).toString();
}

document.querySelectorAll('input[name="mode"]').forEach(r => {
    r.addEventListener('change', () => {
	if (!r.checked) return;
	mode = r.value;
	drawChart();
    });
});
