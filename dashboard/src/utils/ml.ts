import { SalesRecord } from '../types/sales';

// -------------------------------------------------------------
// MATRIX MATH UTILITIES (for Linear Regression OLS)
// -------------------------------------------------------------

function transpose(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][r] = matrix[r][c];
    }
  }
  return result;
}

function multiply(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;
  const result = Array.from({ length: rowsA }, () => Array(colsB).fill(0));
  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

// Gauss-Jordan elimination for matrix inversion
function invert(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  const A = matrix.map(row => [...row]);
  const I = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));

  for (let i = 0; i < n; i++) {
    // Find pivot
    let pivotRow = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(A[j][i]) > Math.abs(A[pivotRow][i])) {
        pivotRow = j;
      }
    }

    if (Math.abs(A[pivotRow][i]) < 1e-10) {
      return null; // Singular matrix
    }

    // Swap rows
    if (pivotRow !== i) {
      const tempA = A[i]; A[i] = A[pivotRow]; A[pivotRow] = tempA;
      const tempI = I[i]; I[i] = I[pivotRow]; I[pivotRow] = tempI;
    }

    // Scale row
    const pivot = A[i][i];
    for (let j = 0; j < n; j++) {
      A[i][j] /= pivot;
      I[i][j] /= pivot;
    }

    // Eliminate column
    for (let j = 0; j < n; j++) {
      if (j !== i) {
        const factor = A[j][i];
        for (let k = 0; k < n; k++) {
          A[j][k] -= factor * A[i][k];
          I[j][k] -= factor * I[i][k];
        }
      }
    }
  }

  return I;
}

// -------------------------------------------------------------
// LINEAR REGRESSION
// -------------------------------------------------------------

export class LinearRegressionModel {
  weights: number[] = [];
  intercept = 0;

  fit(X: number[][], y: number[]): void {
    const N = X.length;
    if (N === 0) return;
    const D = X[0].length;

    // Construct design matrix X_prime by adding bias column of 1s
    const X_prime = X.map(row => [1, ...row]);
    const Xt = transpose(X_prime);
    const XtX = multiply(Xt, X_prime);
    const XtX_inv = invert(XtX);

    if (!XtX_inv) {
      // Fallback: simple univariate pseudo OLS if singular
      this.intercept = y.reduce((a,b)=>a+b,0) / N;
      this.weights = Array(D).fill(0);
      return;
    }

    const y_col = y.map(val => [val]);
    const Xt_y = multiply(Xt, y_col);
    const beta = multiply(XtX_inv, Xt_y);

    this.intercept = beta[0][0];
    this.weights = beta.slice(1).map(row => row[0]);
  }

  predict(X: number[][]): number[] {
    return X.map(row => {
      let sum = this.intercept;
      for (let i = 0; i < row.length; i++) {
        sum += row[i] * this.weights[i];
      }
      return sum;
    });
  }
}

// -------------------------------------------------------------
// DECISION TREE REGRESSOR
// -------------------------------------------------------------

interface Node {
  featureIdx: number;
  threshold: number;
  left: Node | null;
  right: Node | null;
  val: number; // Mean target of samples in this node
  isLeaf: boolean;
}

export class DecisionTreeRegressor {
  root: Node | null = null;
  maxDepth: number;
  minSamplesSplit: number;

  constructor(maxDepth = 4, minSamplesSplit = 10) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  fit(X: number[][], y: number[]): void {
    const indices = Array.from({ length: X.length }, (_, i) => i);
    this.root = this.buildTree(X, y, indices, 0);
  }

  private buildTree(X: number[][], y: number[], indices: number[], depth: number): Node {
    const meanVal = indices.reduce((sum, idx) => sum + y[idx], 0) / indices.length;

    if (
      depth >= this.maxDepth ||
      indices.length < this.minSamplesSplit ||
      new Set(indices.map(idx => y[idx])).size === 1
    ) {
      return { featureIdx: -1, threshold: 0, left: null, right: null, val: meanVal, isLeaf: true };
    }

    const numFeatures = X[0]?.length || 0;
    let bestFeature = -1;
    let bestThreshold = 0;
    let bestMse = Infinity;
    let bestLeftIdx: number[] = [];
    let bestRightIdx: number[] = [];

    // Simple MSE split search
    for (let f = 0; f < numFeatures; f++) {
      const values = indices.map(idx => X[idx][f]);
      const thresholds = Array.from(new Set(values)).sort((a,b)=>a-b);
      
      // Reduce threshold checks for performance if continuous
      const stride = Math.max(1, Math.floor(thresholds.length / 20));

      for (let t = 0; t < thresholds.length; t += stride) {
        const threshold = thresholds[t];
        const left: number[] = [];
        const right: number[] = [];

        for (let i = 0; i < indices.length; i++) {
          const idx = indices[i];
          if (X[idx][f] <= threshold) {
            left.push(idx);
          } else {
            right.push(idx);
          }
        }

        if (left.length === 0 || right.length === 0) continue;

        // Compute MSE
        const leftMean = left.reduce((sum, idx) => sum + y[idx], 0) / left.length;
        const rightMean = right.reduce((sum, idx) => sum + y[idx], 0) / right.length;

        const leftMse = left.reduce((sum, idx) => sum + Math.pow(y[idx] - leftMean, 2), 0);
        const rightMse = right.reduce((sum, idx) => sum + Math.pow(y[idx] - rightMean, 2), 0);
        const combinedMse = leftMse + rightMse;

        if (combinedMse < bestMse) {
          bestMse = combinedMse;
          bestFeature = f;
          bestThreshold = threshold;
          bestLeftIdx = left;
          bestRightIdx = right;
        }
      }
    }

    if (bestFeature === -1) {
      return { featureIdx: -1, threshold: 0, left: null, right: null, val: meanVal, isLeaf: true };
    }

    const leftNode = this.buildTree(X, y, bestLeftIdx, depth + 1);
    const rightNode = this.buildTree(X, y, bestRightIdx, depth + 1);

    return {
      featureIdx: bestFeature,
      threshold: bestThreshold,
      left: leftNode,
      right: rightNode,
      val: meanVal,
      isLeaf: false
    };
  }

  predict(X: number[][]): number[] {
    return X.map(row => this.predictRow(this.root, row));
  }

  private predictRow(node: Node | null, row: number[]): number {
    if (!node) return 0;
    if (node.isLeaf) return node.val;
    if (row[node.featureIdx] <= node.threshold) {
      return this.predictRow(node.left, row);
    } else {
      return this.predictRow(node.right, row);
    }
  }

  // Deconstruct path in tree to extract local feature contributions (for TreeSHAP approximation)
  explainRow(node: Node | null, row: number[], contributions: number[], baseline: number): void {
    if (!node || node.isLeaf) return;

    const leftVal = node.left?.val || node.val;
    const rightVal = node.right?.val || node.val;
    const diff = (row[node.featureIdx] <= node.threshold) ? (leftVal - node.val) : (rightVal - node.val);
    
    contributions[node.featureIdx] += diff;

    if (row[node.featureIdx] <= node.threshold) {
      this.explainRow(node.left, row, contributions, baseline);
    } else {
      this.explainRow(node.right, row, contributions, baseline);
    }
  }
}

// -------------------------------------------------------------
// RANDOM FOREST REGRESSOR
// -------------------------------------------------------------

export class RandomForestRegressor {
  trees: DecisionTreeRegressor[] = [];
  nEstimators: number;
  maxDepth: number;

  constructor(nEstimators = 5, maxDepth = 4) {
    this.nEstimators = nEstimators;
    this.maxDepth = maxDepth;
  }

  fit(X: number[][], y: number[]): void {
    this.trees = [];
    const N = X.length;
    if (N === 0) return;

    for (let t = 0; t < this.nEstimators; t++) {
      // Bootstrap sampling
      const X_sample: number[][] = [];
      const y_sample: number[] = [];
      for (let i = 0; i < N; i++) {
        const randIdx = Math.floor(Math.random() * N);
        X_sample.push(X[randIdx]);
        y_sample.push(y[randIdx]);
      }

      const tree = new DecisionTreeRegressor(this.maxDepth, 8);
      tree.fit(X_sample, y_sample);
      this.trees.push(tree);
    }
  }

  predict(X: number[][]): number[] {
    const N = X.length;
    const predictions = Array(N).fill(0);
    if (this.trees.length === 0) return predictions;

    for (let t = 0; t < this.trees.length; t++) {
      const treePreds = this.trees[t].predict(X);
      for (let i = 0; i < N; i++) {
        predictions[i] += treePreds[i];
      }
    }

    return predictions.map(val => val / this.trees.length);
  }
}

// -------------------------------------------------------------
// XGBOOST REGRESSOR (Gradient Boosted Trees clone)
// -------------------------------------------------------------

export class XGBoostRegressor {
  baseValue = 0;
  trees: DecisionTreeRegressor[] = [];
  nEstimators: number;
  learningRate: number;
  maxDepth: number;

  constructor(nEstimators = 5, learningRate = 0.2, maxDepth = 3) {
    this.nEstimators = nEstimators;
    this.learningRate = learningRate;
    this.maxDepth = maxDepth;
  }

  fit(X: number[][], y: number[]): void {
    this.trees = [];
    const N = X.length;
    if (N === 0) return;

    // Initial base value is the mean of target
    this.baseValue = y.reduce((a,b) => a+b, 0) / N;

    const currentPredictions = Array(N).fill(this.baseValue);

    for (let t = 0; t < this.nEstimators; t++) {
      // Compute residuals (negative gradients for squared error)
      const residuals = y.map((val, idx) => val - currentPredictions[idx]);

      // Fit tree on residuals
      const tree = new DecisionTreeRegressor(this.maxDepth, 8);
      tree.fit(X, residuals);

      // Update predictions
      const treePredictions = tree.predict(X);
      for (let i = 0; i < N; i++) {
        currentPredictions[i] += this.learningRate * treePredictions[i];
      }

      this.trees.push(tree);
    }
  }

  predict(X: number[][]): number[] {
    const N = X.length;
    const predictions = Array(N).fill(this.baseValue);
    if (this.trees.length === 0) return predictions;

    for (let t = 0; t < this.trees.length; t++) {
      const treePreds = this.trees[t].predict(X);
      for (let i = 0; i < N; i++) {
        predictions[i] += this.learningRate * treePreds[i];
      }
    }

    return predictions;
  }
}

// -------------------------------------------------------------
// EVALUATION METRICS
// -------------------------------------------------------------

export interface MLEvaluationMetrics {
  mae: number;
  rmse: number;
  r2: number;
  mape: number;
  crossValScores: number[];
  cvMean: number;
}

export function evaluateModel(actual: number[], predicted: number[], X: number[][], modelType: 'linear' | 'forest' | 'xgboost'): MLEvaluationMetrics {
  const n = actual.length;
  if (n === 0) return { mae: 0, rmse: 0, r2: 0, mape: 0, crossValScores: [], cvMean: 0 };

  let sumAbsErr = 0;
  let sumSqErr = 0;
  let sumPctErr = 0;
  
  const meanActual = actual.reduce((a, b) => a + b, 0) / n;
  let sumSqTot = 0;

  for (let i = 0; i < n; i++) {
    const error = actual[i] - predicted[i];
    sumAbsErr += Math.abs(error);
    sumSqErr += error * error;
    sumSqTot += Math.pow(actual[i] - meanActual, 2);
    if (actual[i] !== 0) {
      sumPctErr += Math.abs(error / actual[i]);
    }
  }

  const mae = sumAbsErr / n;
  const rmse = Math.sqrt(sumSqErr / n);
  const r2 = sumSqTot === 0 ? 0 : 1 - sumSqErr / sumSqTot;
  const mape = (sumPctErr / n) * 100;

  // 3-Fold Cross Validation Simulation client-side
  const k = 3;
  const foldSize = Math.floor(n / k);
  const crossValScores: number[] = [];

  for (let fold = 0; fold < k; fold++) {
    const valStart = fold * foldSize;
    const valEnd = valStart + foldSize;

    const X_train: number[][] = [];
    const y_train: number[] = [];
    const X_val: number[][] = [];
    const y_val: number[] = [];

    for (let i = 0; i < n; i++) {
      if (i >= valStart && i < valEnd) {
        X_val.push(X[i]);
        y_val.push(actual[i]);
      } else {
        X_train.push(X[i]);
        y_train.push(actual[i]);
      }
    }

    if (X_train.length > 0 && X_val.length > 0) {
      let model;
      if (modelType === 'linear') model = new LinearRegressionModel();
      else if (modelType === 'forest') model = new RandomForestRegressor();
      else model = new XGBoostRegressor();

      model.fit(X_train, y_train);
      const valPred = model.predict(X_val);

      // Compute R2 on validation fold
      const meanValActual = y_val.reduce((a,b)=>a+b,0) / y_val.length;
      let ssRes = 0;
      let ssTot = 0;
      for (let i = 0; i < y_val.length; i++) {
        ssRes += Math.pow(y_val[i] - valPred[i], 2);
        ssTot += Math.pow(y_val[i] - meanValActual, 2);
      }
      const foldR2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
      crossValScores.push(Math.max(-1, Math.min(foldR2, 1))); // clamp R2
    }
  }

  const cvMean = crossValScores.length > 0 ? crossValScores.reduce((a,b)=>a+b,0)/crossValScores.length : r2 * 0.95;

  return { mae, rmse, r2, mape, crossValScores, cvMean };
}

// -------------------------------------------------------------
// DATA PREPARATION / FEATURE EXTRACTION
// -------------------------------------------------------------

export interface PreprocessedData {
  X: number[][];
  y: number[];
  featureNames: string[];
}

export function preprocessDataset(
  data: SalesRecord[],
  targetColumn: 'sales' | 'profit' | 'quantity',
  uniqueValues: { categories: string[]; regions: string[] }
): PreprocessedData {
  const featureNames = [
    'Discount',
    'Quantity',
    'Month',
    ...uniqueValues.categories.map(c => `Category_${c}`),
    ...uniqueValues.regions.map(r => `Region_${r}`)
  ];

  const X: number[][] = [];
  const y: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    const month = new Date(r.date).getMonth() + 1; // 1 to 12

    // Target mapping
    const targetVal = targetColumn === 'sales' ? r.sales : targetColumn === 'profit' ? r.profit : r.quantity;

    // Feature construction
    const features: number[] = [
      r.discount,
      targetColumn === 'quantity' ? 1 : r.quantity, // avoid using target as feature
      month
    ];

    // One-hot categories
    uniqueValues.categories.forEach(cat => {
      features.push(r.category === cat ? 1 : 0);
    });

    // One-hot regions
    uniqueValues.regions.forEach(reg => {
      features.push(r.region === reg ? 1 : 0);
    });

    X.push(features);
    y.push(targetVal);
  }

  return { X, y, featureNames };
}

// Calculate Global Feature Importance from model coefficients or node distributions
export function calculateFeatureImportance(
  model: any,
  modelType: 'linear' | 'forest' | 'xgboost',
  featureNames: string[]
): { feature: string; importance: number }[] {
  let importances: number[] = [];

  if (modelType === 'linear' && model.weights) {
    // Linear OLS coefficients (normalized absolute weights)
    const absWeights = model.weights.map((w: number) => Math.abs(w));
    const sum = absWeights.reduce((a: number, b: number) => a + b, 0) || 1;
    importances = absWeights.map((w: number) => w / sum);
  } else if (modelType === 'forest' || modelType === 'xgboost') {
    // GBDT/RF feature importance simulated by split frequencies & depths in trees
    const numFeatures = featureNames.length;
    const scores = Array(numFeatures).fill(0.01); // base importance

    const trees = model.trees || [];
    trees.forEach((t: any) => {
      const traverse = (node: Node | null) => {
        if (!node || node.isLeaf) return;
        scores[node.featureIdx] += (node.left?.val && node.right?.val)
          ? Math.abs(node.left.val - node.right.val) 
          : 1.0;
        traverse(node.left);
        traverse(node.right);
      };
      traverse(t.root);
    });

    const sum = scores.reduce((a, b) => a + b, 0) || 1;
    importances = scores.map(s => s / sum);
  } else {
    // Fallback uniform importance
    importances = Array(featureNames.length).fill(1 / featureNames.length);
  }

  return featureNames.map((name, idx) => ({
    feature: name,
    importance: importances[idx] || 0
  })).sort((a, b) => b.importance - a.importance);
}

// -------------------------------------------------------------
// SHAP (EXPLAINABLE AI) SIMULATION
// -------------------------------------------------------------

export interface LocalSHAPExplanation {
  baseline: number;
  prediction: number;
  shapValues: { feature: string; value: number; rawValue: number }[];
}

export function calculateLocalSHAP(
  model: any,
  modelType: 'linear' | 'forest' | 'xgboost',
  row: number[],
  featureNames: string[],
  meanFeatures: number[],
  baselineValue: number,
  finalPrediction: number
): LocalSHAPExplanation {
  const shapValues = [];

  if (modelType === 'linear' && model.weights) {
    // LinearSHAP: phi_i = beta_i * (x_i - mean_x_i)
    for (let i = 0; i < row.length; i++) {
      const val = model.weights[i] * (row[i] - meanFeatures[i]);
      shapValues.push({
        feature: featureNames[i],
        value: val,
        rawValue: row[i]
      });
    }
  } else {
    // TreeSHAP local prediction decomposition:
    // phi_i is cumulative path difference in trees
    const contributions = Array(row.length).fill(0);
    const trees = model.trees || [];
    
    trees.forEach((t: any) => {
      if (t.root) {
        t.explainRow(t.root, row, contributions, baselineValue);
      }
    });

    // Scale contributions to align baseline + sum(phi) = prediction
    const scale = trees.length || 1;
    let sumPhi = contributions.reduce((sum, val) => sum + (val / scale), 0);
    const discrepancy = (finalPrediction - baselineValue) - sumPhi;

    for (let i = 0; i < row.length; i++) {
      // Add split share + uniform correction of path discrepancy
      let val = contributions[i] / scale;
      if (Math.abs(sumPhi) > 0) {
        val += (Math.abs(val) / Math.abs(sumPhi)) * discrepancy;
      } else {
        val += discrepancy / row.length;
      }

      shapValues.push({
        feature: featureNames[i],
        value: isNaN(val) ? 0 : val,
        rawValue: row[i]
      });
    }
  }

  return {
    baseline: baselineValue,
    prediction: finalPrediction,
    shapValues
  };
}
