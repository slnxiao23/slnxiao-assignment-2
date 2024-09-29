// app.js

let dataPoints = [];
let clusterCenters = [];
let groupings = [];
let numClusters = 6;
let initMethod = 'random';
let hasConverged = false;
let selectCentroidsManually = false;
let maxClusterDistance = [];

// Generate `k` distinct colors in HSL
function generateClusterColors(k) {
    const colors = [];
    for (let i = 0; i < numClusters; i++) {
        const hue = (i * 360 / numClusters) % 360;  
        const saturation = 100;
        const lightness = 50;
        colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
    return colors;
}

// Generate random dataset
function generateDataset(numPoints = 300) {
    dataPoints = [];
    for (let i = 0; i < numPoints; i++) {
        dataPoints.push({
            x: Math.random() * 20 - 10,
            y: Math.random() * 20 - 10
        });
    }
    maxClusterDistance = [];
    groupings = [];
}

// Calculate max distances for each cluster
function calculateMaxDistances() {
    groupings.forEach((group, i) => {
        maxClusterDistance[i] = 0;
        group.forEach(point => {
            let dist = distance(point, clusterCenters[i]);
            if (dist > maxClusterDistance[i]) {
                maxClusterDistance[i] = dist;
            }
        });
    });
}

// Plot dataset, centroids, and clusters
function plotData() {
    let traces = [];
    const clusterColors = generateClusterColors(numClusters);

    // Plot data points in gray if no clusters exist
    if (groupings.length === 0) {
        traces.push({
            x: dataPoints.map(p => p.x),
            y: dataPoints.map(p => p.y),
            mode: 'markers',
            type: 'scatter',
            marker: { color: 'gray', size: 8 },
            name: 'Dataset Points'
        });
    } else {
        // Calculate max distance per cluster
        if (clusterCenters.length > 0 && maxClusterDistance.length === 0) {
            calculateMaxDistances();
        }

        // Plot clusters with color scaling
        groupings.forEach((group, clusterIdx) => {
            group.forEach(point => {
                let nearestCentroidDist = distance(point, clusterCenters[clusterIdx]);
                let intensity = Math.floor((nearestCentroidDist / maxClusterDistance[clusterIdx]) * 255);
                let color = `rgba(${clusterColors[clusterIdx]}, ${(255 - intensity) / 255})`;

                traces.push({
                    x: [point.x],
                    y: [point.y],
                    mode: 'markers',
                    type: 'scatter',
                    marker: { color: color, size: 8 },
                    name: `Cluster ${clusterIdx + 1}`
                });
            });
        });
    }

    // Add centroid points (red 'X')
    if (clusterCenters.length > 0) {
        traces.push({
            x: clusterCenters.map(c => c.x),
            y: clusterCenters.map(c => c.y),
            mode: 'markers',
            type: 'scatter',
            marker: { color: 'red', size: 12, symbol: 'x' },
            name: 'Centroids'
        });
    }

    let layout = {
        title: hasConverged ? 'KMeans has converged' : 'KMeans Clustering Animation',
        xaxis: { range: [-10, 10] },
        yaxis: { range: [-10, 10] },
        showlegend: false
    };

    Plotly.newPlot('plot', traces, layout);

    // Handle manual centroid selection
    if (selectCentroidsManually) {
        document.getElementById('plot').on('plotly_click', function(data) {
            if (clusterCenters.length < numClusters) {
                clusterCenters.push({ x: data.points[0].x, y: data.points[0].y });
                plotData();
            }
            if (clusterCenters.length === numClusters) {
                selectCentroidsManually = false;
                document.getElementById('plot').on('plotly_click', null);
            }
        });
    }
}

// Initialize centroids based on method
function initializeCentroids() {
    clusterCenters = [];
    groupings = [];
    maxClusterDistance = [];
    hasConverged = false;

    if (initMethod === 'random') {
        let selected = new Set();
        while (clusterCenters.length < numClusters) {
            let index = Math.floor(Math.random() * dataPoints.length);
            if (!selected.has(index)) {
                clusterCenters.push(dataPoints[index]);
                selected.add(index);
            }
        }
    } else if (initMethod === 'farthest_first') {
        clusterCenters.push(dataPoints[Math.floor(Math.random() * dataPoints.length)]);
        while (clusterCenters.length < numClusters) {
            let farthestPoint = dataPoints.reduce((farthest, point) => {
                let distToNearest = Math.min(...clusterCenters.map(c => distance(c, point)));
                if (!farthest || distToNearest > farthest.dist) {
                    return { point, dist: distToNearest };
                }
                return farthest;
            }, null).point;
            clusterCenters.push(farthestPoint);
        }
    } else if (initMethod === 'kmeans++') {
        clusterCenters.push(dataPoints[Math.floor(Math.random() * dataPoints.length)]);
        while (clusterCenters.length < numClusters) {
            let distSq = dataPoints.map(p => Math.min(...clusterCenters.map(c => distanceSquared(p, c))));
            let cumulativeDistSq = distSq.reduce((acc, d, i) => [...acc, d + (acc[i-1] || 0)], []);
            let r = Math.random() * cumulativeDistSq[cumulativeDistSq.length - 1];
            let nextCentroid = dataPoints[cumulativeDistSq.findIndex(d => d >= r)];
            clusterCenters.push(nextCentroid);
        }
    } else if (initMethod === 'manual') {
        selectCentroidsManually = true;
        alert('Click on the plot to select centroids manually');
    }

    plotData();
}

// Step through KMeans process
function stepKMeans() {
    if (hasConverged || clusterCenters.length !== numClusters) return;
    groupings = Array(numClusters).fill().map(() => []);

    dataPoints.forEach(point => {
        let closest = 0;
        let minDist = distance(point, clusterCenters[0]);
        for (let i = 1; i < clusterCenters.length; i++) {
            let dist = distance(point, clusterCenters[i]);
            if (dist < minDist) {
                minDist = dist;
                closest = i;
            }
        }
        groupings[closest].push(point);
    });

    let newClusterCenters = clusterCenters.map((centroid, i) => {
        if (groupings[i].length > 0) {
            return {
                x: avg(groupings[i].map(p => p.x)),
                y: avg(groupings[i].map(p => p.y))
            };
        }
        return centroid;
    });

    hasConverged = clusterCenters.every((centroid, i) => distance(centroid, newClusterCenters[i]) < 0.01);

    clusterCenters = newClusterCenters;
    plotData();
}

// Utility functions
function distance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function distanceSquared(p1, p2) {
    return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
}

function avg(arr) {
    return arr.reduce((a, b) => a + b) / arr.length;
}

// Event listeners for buttons
document.getElementById('stepBtn').addEventListener('click', stepKMeans);
document.getElementById('convergeBtn').addEventListener('click', function () {
    if (hasConverged) {
        alert("KMeans has already converged");
    } else {
        for (let i = 0; i < 100; i++) {
            stepKMeans();
            if (hasConverged) break;
        }
    }
});
document.getElementById('generateBtn').addEventListener('click', function () {
    generateDataset();
    initializeCentroids();
});
document.getElementById('resetBtn').addEventListener('click', function () {
    hasConverged = false;
    initializeCentroids();
    plotData();
});

// Input listeners
document.getElementById('clusterCount').addEventListener('input', function (e) {
    numClusters = parseInt(e.target.value);
});
document.getElementById('initializationMethod').addEventListener('change', function (e) {
    initMethod = e.target.value;
    if (initMethod === 'manual') {
        clusterCenters = [];
        plotData();
    }
});

// Initialize dataset and plot
generateDataset();
initializeCentroids();
plotData();
