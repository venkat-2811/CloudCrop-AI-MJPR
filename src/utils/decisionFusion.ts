/**
 * Decision Fusion Module — Algorithm 2 from the CloudCrop AI research paper
 * 
 * Multi-Task Decision Fusion: Integrates heterogeneous prediction outputs
 * (price forecast, suitability classification, yield estimation) into
 * unified recommendation levels.
 */

export type SuitabilityClass = 'High' | 'Medium' | 'Low';
export type RecommendationLevel = 'Strong' | 'Moderate' | 'Weak' | 'Avoid';

export interface PriceForecast {
  predicted: number;
  historical_mean: number;
  historical_std: number;
}

export interface YieldEstimate {
  predicted: number;
  historical_mean: number;
  historical_std: number;
}

export interface FusionResult {
  recommendation: RecommendationLevel;
  confidence: number;
  reasoning: string[];
  scores: {
    price_normalized: number;
    yield_normalized: number;
    suitability: SuitabilityClass;
  };
}

// Threshold parameters from the paper: θ_p = 0.5σ_p, θ_y = 0.3σ_y
const THETA_P_FACTOR = 0.5;
const THETA_Y_FACTOR = 0.3;

/**
 * Normalizes a prediction using z-score: (x - mean) / std
 */
function normalize(value: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (value - mean) / std;
}

/**
 * Computes confidence score based on prediction spread
 */
function computeConfidence(
  priceNorm: number,
  suitability: SuitabilityClass,
  yieldNorm: number
): number {
  let score = 0.5; // base confidence

  // Suitability contribution (40% weight)
  if (suitability === 'High') score += 0.2;
  else if (suitability === 'Medium') score += 0.1;
  else score -= 0.1;

  // Price contribution (30% weight)
  score += Math.min(0.15, Math.max(-0.15, priceNorm * 0.1));

  // Yield contribution (30% weight)
  score += Math.min(0.15, Math.max(-0.15, yieldNorm * 0.1));

  return Math.min(1, Math.max(0, score));
}

/**
 * Multi-Task Decision Fusion (Algorithm 2 from the paper)
 * 
 * Combines price forecast, suitability classification, and yield estimation
 * into a unified recommendation.
 */
export function decisionFusion(
  priceForecast: PriceForecast,
  suitability: SuitabilityClass,
  yieldEstimate: YieldEstimate
): FusionResult {
  const reasoning: string[] = [];

  // Normalize predictions
  const pNorm = normalize(
    priceForecast.predicted,
    priceForecast.historical_mean,
    priceForecast.historical_std
  );
  const yNorm = normalize(
    yieldEstimate.predicted,
    yieldEstimate.historical_mean,
    yieldEstimate.historical_std
  );

  // Thresholds
  const thetaP = THETA_P_FACTOR; // Already normalized (0.5σ / σ = 0.5)
  const thetaY = THETA_Y_FACTOR;

  let recommendation: RecommendationLevel;

  // Decision rules from Algorithm 2
  if (suitability === 'Low') {
    recommendation = 'Avoid';
    reasoning.push('Soil and climate conditions indicate low suitability for this crop.');
  } else if (suitability === 'High' && pNorm > thetaP && yNorm > thetaY) {
    recommendation = 'Strong';
    reasoning.push('High suitability with above-average price forecast and yield potential.');
  } else if (suitability === 'High' || (suitability === 'Medium' && pNorm > thetaP)) {
    recommendation = 'Moderate';
    if (suitability === 'High') {
      reasoning.push('Good suitability, though price or yield indicators are moderate.');
    } else {
      reasoning.push('Medium suitability but favorable market price forecast.');
    }
  } else {
    recommendation = 'Weak';
    reasoning.push('Moderate conditions with no strong positive indicators.');
  }

  // Add specific insights
  if (pNorm > 0) {
    reasoning.push(`Price forecast is ${(pNorm * 100).toFixed(0)}% above historical average.`);
  } else {
    reasoning.push(`Price forecast is ${Math.abs(pNorm * 100).toFixed(0)}% below historical average.`);
  }

  if (yNorm > 0) {
    reasoning.push(`Expected yield is ${(yNorm * 100).toFixed(0)}% above average.`);
  } else {
    reasoning.push(`Expected yield is ${Math.abs(yNorm * 100).toFixed(0)}% below average.`);
  }

  const confidence = computeConfidence(pNorm, suitability, yNorm);

  return {
    recommendation,
    confidence,
    reasoning,
    scores: {
      price_normalized: pNorm,
      yield_normalized: yNorm,
      suitability,
    },
  };
}

/**
 * Returns the color class for a recommendation level
 */
export function getRecommendationColor(level: RecommendationLevel): string {
  switch (level) {
    case 'Strong': return 'bg-green-100 text-green-800 border-green-300';
    case 'Moderate': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Weak': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Avoid': return 'bg-red-100 text-red-800 border-red-300';
  }
}

/**
 * Returns an emoji for a recommendation level
 */
export function getRecommendationEmoji(level: RecommendationLevel): string {
  switch (level) {
    case 'Strong': return '🟢';
    case 'Moderate': return '🔵';
    case 'Weak': return '🟡';
    case 'Avoid': return '🔴';
  }
}
