import { SalesRecord } from '../types/sales';

// -------------------------------------------------------------
// RFM CUSTOMER PROFILE GENERATOR
// -------------------------------------------------------------

export interface CustomerRFM {
  customer: string;
  recency: number;   // Days since last purchase relative to dataset end (2018-12-31)
  frequency: number; // Total order count
  monetary: number;  // Total spent
  avgDiscount: number;
}

export function computeRFM(data: SalesRecord[]): CustomerRFM[] {
  if (data.length === 0) return [];

  const maxDate = new Date('2018-12-31').getTime();
  const customerMap = new Map<string, { lastDate: number; count: number; totalSales: number; discountSum: number }>();

  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    const itemDate = new Date(r.date).getTime();
    const stats = customerMap.get(r.customer) || { lastDate: 0, count: 0, totalSales: 0, discountSum: 0 };
    
    stats.lastDate = Math.max(stats.lastDate, itemDate);
    stats.count += 1;
    stats.totalSales += r.sales;
    stats.discountSum += r.discount;

    customerMap.set(r.customer, stats);
  }

  const result: CustomerRFM[] = [];
  customerMap.forEach((stats, customer) => {
    const recencyDays = Math.max(0, Math.floor((maxDate - stats.lastDate) / (1000 * 60 * 60 * 24)));
    result.push({
      customer,
      recency: recencyDays,
      frequency: stats.count,
      monetary: stats.totalSales,
      avgDiscount: stats.discountSum / stats.count
    });
  });

  return result;
}

// -------------------------------------------------------------
// STANDARDIZATION
// -------------------------------------------------------------

function scaleRFM(rfm: CustomerRFM[]): { scaled: number[][]; means: number[]; stds: number[] } {
  const N = rfm.length;
  if (N === 0) return { scaled: [], means: [], stds: [] };

  const means = [0, 0, 0];
  const stds = [0, 0, 0];

  rfm.forEach(r => {
    means[0] += r.recency;
    means[1] += r.frequency;
    means[2] += r.monetary;
  });

  means[0] /= N;
  means[1] /= N;
  means[2] /= N;

  rfm.forEach(r => {
    stds[0] += Math.pow(r.recency - means[0], 2);
    stds[1] += Math.pow(r.frequency - means[1], 2);
    stds[2] += Math.pow(r.monetary - means[2], 2);
  });

  stds[0] = Math.sqrt(stds[0] / N) || 1;
  stds[1] = Math.sqrt(stds[1] / N) || 1;
  stds[2] = Math.sqrt(stds[2] / N) || 1;

  const scaled = rfm.map(r => [
    (r.recency - means[0]) / stds[0],
    (r.frequency - means[1]) / stds[1],
    (r.monetary - means[2]) / stds[2]
  ]);

  return { scaled, means, stds };
}

// -------------------------------------------------------------
// K-MEANS++ AND CLUSTERING
// -------------------------------------------------------------

function getEuclideanDistance(p1: number[], p2: number[]): number {
  return Math.sqrt(
    Math.pow(p1[0] - p2[0], 2) +
    Math.pow(p1[1] - p2[1], 2) +
    Math.pow(p1[2] - p2[2], 2)
  );
}

export interface KMeansResult {
  clusterLabels: number[];
  centroids: number[][]; // Scaled centroids
  personas: string[];
}

export function performKMeans(scaledData: number[][], k = 5): KMeansResult {
  const N = scaledData.length;
  if (N === 0) return { clusterLabels: [], centroids: [], personas: [] };

  // K-Means++ initialization
  const centroids: number[][] = [];
  centroids.push([...scaledData[Math.floor(Math.random() * N)]]);

  while (centroids.length < k) {
    const distances = scaledData.map(point => {
      let minDist = Infinity;
      centroids.forEach(c => {
        const d = getEuclideanDistance(point, c);
        if (d < minDist) minDist = d;
      });
      return minDist * minDist;
    });

    const sumDist = distances.reduce((a, b) => a + b, 0);
    let rand = Math.random() * sumDist;
    let selectedIdx = 0;

    for (let i = 0; i < N; i++) {
      rand -= distances[i];
      if (rand <= 0) {
        selectedIdx = i;
        break;
      }
    }
    centroids.push([...scaledData[selectedIdx]]);
  }

  let clusterLabels = Array(N).fill(-1);
  let changed = true;
  let iter = 0;
  const maxIter = 30;

  while (changed && iter < maxIter) {
    changed = false;
    iter++;

    // 1. Assign points to nearest centroid
    const newLabels = scaledData.map(point => {
      let minIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < k; i++) {
        const d = getEuclideanDistance(point, centroids[i]);
        if (d < minDist) {
          minDist = d;
          minIdx = i;
        }
      }
      return minIdx;
    });

    for (let i = 0; i < N; i++) {
      if (newLabels[i] !== clusterLabels[i]) {
        clusterLabels = newLabels;
        changed = true;
        break;
      }
    }

    if (!changed) break;

    // 2. Re-compute centroids
    const counts = Array(k).fill(0);
    const sums = Array.from({ length: k }, () => [0, 0, 0]);

    for (let i = 0; i < N; i++) {
      const c = clusterLabels[i];
      counts[c]++;
      sums[c][0] += scaledData[i][0];
      sums[c][1] += scaledData[i][1];
      sums[c][2] += scaledData[i][2];
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        centroids[c] = [
          sums[c][0] / counts[c],
          sums[c][1] / counts[c],
          sums[c][2] / counts[c]
        ];
      }
    }
  }

  // 3. Name the clusters based on centroids profiles
  // We want to sort centroids by Monetary (Index 2) and Recency (Index 0, lower is better)
  const sortedCentroidsIndices = Array.from({ length: k }, (_, i) => i)
    .sort((a, b) => {
      // Sort by Monetary spend desc, then Recency asc
      const scoreA = centroids[a][2] * 2 - centroids[a][0];
      const scoreB = centroids[b][2] * 2 - centroids[b][0];
      return scoreB - scoreA;
    });

  // Map centroids to target personas:
  // 0: High Value, 1: Loyal, 2: Frequent, 3: Occasional, 4: At Risk
  const personas = ['High Value', 'Loyal', 'Frequent', 'Occasional', 'At Risk'];
  const mapping = Array(k).fill('');
  
  sortedCentroidsIndices.forEach((idx, orderIndex) => {
    mapping[idx] = personas[orderIndex] || 'Occasional';
  });

  return {
    clusterLabels,
    centroids,
    personas: mapping
  };
}

// -------------------------------------------------------------
// PCA (PRINCIPAL COMPONENT ANALYSIS)
// -------------------------------------------------------------

export interface PCAResult {
  coordinates: number[][]; // Projected coordinates [pc1, pc2]
  varianceExplained: number[];
}

export function performPCA(scaledData: number[][]): PCAResult {
  const N = scaledData.length;
  if (N === 0) return { coordinates: [], varianceExplained: [0, 0] };

  // 1. Compute 3x3 Covariance Matrix
  const cov = Array.from({ length: 3 }, () => Array(3).fill(0));
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let n = 0; n < N; n++) {
        sum += scaledData[n][i] * scaledData[n][j];
      }
      cov[i][j] = sum / (N - 1);
    }
  }

  // 2. Power Iteration to extract eigenvectors
  const powerIteration = (matrix: number[][], numSim = 100): number[] => {
    let vec = [Math.random(), Math.random(), Math.random()];
    // Normalize
    let norm = Math.sqrt(vec.reduce((sum, v) => sum + v*v, 0));
    vec = vec.map(v => v / norm);

    for (let sim = 0; sim < numSim; sim++) {
      const nextVec = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          nextVec[i] += matrix[i][j] * vec[j];
        }
      }
      const nextNorm = Math.sqrt(nextVec.reduce((sum, v) => sum + v*v, 0));
      vec = nextVec.map(v => v / (nextNorm || 1));
    }
    return vec;
  };

  // Extract first PC (eigenvector 1)
  const pc1 = powerIteration(cov);

  // Deflate covariance matrix to extract second PC
  // Cov_deflated = Cov - lambda1 * pc1 * pc1^T
  // lambda1 = pc1^T * Cov * pc1
  let lambda1 = 0;
  const temp = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      temp[i] += cov[i][j] * pc1[j];
    }
  }
  lambda1 = temp.reduce((sum, v, idx) => sum + v * pc1[idx], 0);

  const covDeflated = cov.map((row, i) => 
    row.map((val, j) => val - lambda1 * pc1[i] * pc1[j])
  );

  // Extract second PC
  const pc2 = powerIteration(covDeflated);

  // Project data onto PCs
  const coordinates = scaledData.map(point => [
    point[0] * pc1[0] + point[1] * pc1[1] + point[2] * pc1[2],
    point[0] * pc2[0] + point[1] * pc2[1] + point[2] * pc2[2]
  ]);

  // Approximate variance explained (based on trace)
  const trace = cov[0][0] + cov[1][1] + cov[2][2] || 1;
  
  let lambda2 = 0;
  const temp2 = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      temp2[i] += covDeflated[i][j] * pc2[j];
    }
  }
  lambda2 = temp2.reduce((sum, v, idx) => sum + v * pc2[idx], 0);

  const var1 = Math.max(0, Math.min(1, lambda1 / trace));
  const var2 = Math.max(0, Math.min(1 - var1, lambda2 / trace));

  return {
    coordinates,
    varianceExplained: [var1, var2]
  };
}

// -------------------------------------------------------------
// COMPLETE PIPELINE INTERFACE
// -------------------------------------------------------------

export interface SegmentedCustomer {
  customer: string;
  recency: number;
  frequency: number;
  monetary: number;
  avgDiscount: number;
  persona: string;
  pc1: number;
  pc2: number;
}

export function segmentCustomers(data: SalesRecord[]): SegmentedCustomer[] {
  const rfm = computeRFM(data);
  if (rfm.length === 0) return [];

  const { scaled } = scaleRFM(rfm);
  const kmeans = performKMeans(scaled, 5);
  const pca = performPCA(scaled);

  return rfm.map((r, idx) => {
    const cluster = kmeans.clusterLabels[idx];
    const persona = kmeans.personas[cluster];
    return {
      customer: r.customer,
      recency: r.recency,
      frequency: r.frequency,
      monetary: r.monetary,
      avgDiscount: r.avgDiscount,
      persona: persona,
      pc1: pca.coordinates[idx]?.[0] || 0,
      pc2: pca.coordinates[idx]?.[1] || 0
    };
  });
}
