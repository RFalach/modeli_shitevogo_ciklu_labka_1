const pointsInput = document.getElementById('pointsInput');
const clearBtn = document.getElementById('clearBtn');

const degreeSelect = document.getElementById('degreeSelect');
const calcBtn = document.getElementById('calcBtn');

let points = [];

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

    const coefs = solveLSM(points, maxDegree);

    console.log("=== МНК ===");
    console.log("коефіцієнти:", coefs);
    for (const p of points) {
	const yHat = polyEval(coefs, p.x);
	console.log("x=" + p.x, "y=" + p.y, "y_=" + yHat.toFixed(6), "r=" + (p.y - yHat).toFixed(6));
    }

    let lsmSSE = 0;
    for (const p of points) {
	const e = p.y - polyEval(coefs, p.x);
	lsmSSE += e * e;
    }
    console.log("МНК: сума квадратів залишків =", lsmSSE);
}

calcBtn.addEventListener("click", calculate);
