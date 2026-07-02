import { SalesRecord } from '../types/sales';

// -------------------------------------------------------------
// ISOLATION FOREST IMPLEMENTATION
// -------------------------------------------------------------

interface ITreeNode {
  splitFeatureIdx: number;
  splitValue: number;
  left: ITreeNode | null;
  right: ITreeNode | null;
  size: number; // Number of samples in the node
  isLeaf: boolean;
}

// Average path length of an unsuccessful search in a Binary Search Tree (BST) of size n
function c(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  const eulerMascheroni = 0.5772156649;
  return 2 * (Math.log(n - 1) + eulerMascheroni) - (2 * (n - 1)) / n;
}

export class IsolationForest {
  trees: ITreeNode[] = [];
  nTrees: number;
  subSampleSize: number;
  maxDepth: number;

  constructor(nTrees = 8, subSampleSize = 256) {
    this.nTrees = nTrees;
    this.subSampleSize = subSampleSize;
    this.maxDepth = Math.ceil(Math.log2(subSampleSize));
  }

  fit(data: number[][]): void {
    this.trees = [];
    const N = data.length;
    if (N === 0) return;

    for (let t = 0; t < this.nTrees; t++) {
      // Sub-sample data
      const sample: number[][] = [];
      const sampleSize = Math.min(this.subSampleSize, N);
      const chosenIndices = new Set<number>();
      
      while (chosenIndices.size < sampleSize) {
        chosenIndices.add(Math.floor(Math.random() * N));
      }

      chosenIndices.forEach(idx => {
        sample.push(data[idx]);
      });

      this.trees.push(this.buildITree(sample, 0));
    }
  }

  private buildITree(sample: number[][], currentDepth: number): ITreeNode {
    const size = sample.length;
    if (currentDepth >= this.maxDepth || size <= 1) {
      return { splitFeatureIdx: -1, splitValue: 0, left: null, right: null, size, isLeaf: true };
    }

    const D = sample[0]?.length || 0;
    // Choose feature index randomly
    const splitFeatureIdx = Math.floor(Math.random() * D);

    // Find min and max of chosen feature
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < size; i++) {
      const val = sample[i][splitFeatureIdx];
      if (val < min) min = val;
      if (val > max) max = val;
    }

    if (min === max) {
      // Feature values are uniform; recurse or return leaf
      return { splitFeatureIdx: -1, splitValue: 0, left: null, right: null, size, isLeaf: true };
    }

    // Select random split value between min and max
    const splitValue = min + Math.random() * (max - min);

    // Partition
    const leftSample: number[][] = [];
    const rightSample: number[][] = [];
    for (let i = 0; i < size; i++) {
      if (sample[i][splitFeatureIdx] < splitValue) {
        leftSample.push(sample[i]);
      } else {
        rightSample.push(sample[i]);
      }
    }

    return {
      splitFeatureIdx,
      splitValue,
      left: this.buildITree(leftSample, currentDepth + 1),
      right: this.buildITree(rightSample, currentDepth + 1),
      size,
      isLeaf: false
    };
  }

  // Path length prediction for a single instance
  private pathLength(x: number[], node: ITreeNode | null, currentDepth: number): number {
    if (!node) return 0;
    if (node.isLeaf) {
      return currentDepth + c(node.size);
    }

    if (x[node.splitFeatureIdx] < node.splitValue) {
      return this.pathLength(x, node.left, currentDepth + 1);
    } else {
      return this.pathLength(x, node.right, currentDepth + 1);
    }
  }

  // Anomaly score calculation: ranges from 0 to 1. Scores > 0.6 indicate strong anomalies.
  score(x: number[]): number {
    if (this.trees.length === 0) return 0.5;

    let totalPathLength = 0;
    for (let t = 0; t < this.trees.length; t++) {
      totalPathLength += this.pathLength(x, this.trees[t], 0);
    }

    const meanPathLength = totalPathLength / this.trees.length;
    const normFactor = c(this.subSampleSize);

    if (normFactor === 0) return 0.5;
    return Math.pow(2, -meanPathLength / normFactor);
  }
}

// -------------------------------------------------------------
// PIPELINE ENGINE
// -------------------------------------------------------------

export interface AnomalyRecord {
  record: SalesRecord;
  anomalyScore: number;
  reason: string;
}

export function detectAnomalies(data: SalesRecord[]): AnomalyRecord[] {
  if (data.length === 0) return [];

  // Features: Sales, Profit, Discount (relative percentage)
  const features = data.map(r => [
    r.sales,
    r.profit,
    r.discount * 100
  ]);

  const forest = new IsolationForest(10, 256);
  forest.fit(features);

  return data.map((r, idx) => {
    const score = forest.score(features[idx]);
    let reason = 'Normal Transaction';

    if (score > 0.6) {
      // Rule-based reason extraction for high anomaly scores
      if (r.discount >= 0.32 && r.profit < -200) {
        reason = 'Extreme Discounting with High Loss';
      } else if (r.sales > 2000 && r.profit < -300) {
        reason = 'High Sales Volume with Significant Deficit';
      } else if (r.profit > 600) {
        reason = 'Unusually High Profit Margin';
      } else if (r.sales > 2400) {
        reason = 'Extreme Transaction Value';
      } else {
        reason = 'Atypical Sales-to-Profit Ratio';
      }
    }

    return {
      record: r,
      anomalyScore: parseFloat(score.toFixed(3)),
      reason
    };
  }).sort((a, b) => b.anomalyScore - a.anomalyScore);
}
