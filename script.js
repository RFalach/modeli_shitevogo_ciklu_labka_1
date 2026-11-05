const pointsInput = document.getElementById('pointsInput');
const applyBtn = document.getElementById('applyBtn');
const clearBtn = document.getElementById('clearBtn');

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

applyBtn.addEventListener('click', applyPoints);

clearBtn.addEventListener('click', () => {
    pointsInput.value = '';
    points = [];
});
