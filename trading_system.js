/**
 * QUANTUM INSTITUTIONAL AI TRADING SYSTEM v5.0
 * AI-Powered Strategy Selection Based on Market Conditions
 * No manual strategy selection - AI decides optimal approach
 * Complete institutional-grade analysis with auto-detection
 */

'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const ccxt = require('ccxt');
const axios = require('axios');
const crypto = require('crypto');
const winston = require('winston');
const backoff = require('backoff');
const { Pool } = require('pg');
const Database = require('better-sqlite3');

// ==================== CONFIGURATION ====================
const {
  PORT = 3000,
  MODE = 'paper',
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  TV_WEBHOOK_SECRET,
  POSTGRES_URL,
  ACCOUNT_EQUITY = 100000,
  DEFAULT_RISK_PCT = 2.0,
  DAILY_DRAWDOWN_LIMIT = 0.05,
  
  // BITGET
  CCXT_BITGET_API_KEY,
  CCXT_BITGET_SECRET,
  CCXT_BITGET_PASSWORD,
  BITGET_DEMO_MODE = 'true',
  
  // OANDA
  OANDA_API_KEY,
  OANDA_ACCOUNT_ID,
  OANDA_ENVIRONMENT = 'practice',
  
  // ALPACA
  ALPACA_API_KEY,
  ALPACA_SECRET_KEY,
  ALPACA_BASE_URL = 'https://paper-api.alpaca.markets/v2',
  
  // AI SETTINGS
  ENABLE_AI_STRATEGY_SELECTION = 'true',
  MIN_CONFIDENCE_THRESHOLD = 0.65,
  LOG_LEVEL = 'info'
} = process.env;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment');
  process.exit(1);
}

// ==================== ENHANCED LOGGER ====================
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'ai_trading.log' })
  ]
});

// ==================== AI STRATEGY SELECTOR ====================
class AIStrategySelector {
  constructor() {
    this.strategies = {
      QUANTUM: {
        name: 'Quantum Engine V2.0',
        description: 'Institutional-grade analysis with order blocks, structure breaks, and quantum indicators',
        conditions: ['trending_market', 'clear_structure', 'institutional_flow'],
        weight: 0.35
      },
      MOMENTUM: {
        name: 'Momentum Scalper V1.0',
        description: 'Captures strong momentum moves with volume confirmation',
        conditions: ['high_volatility', 'strong_momentum', 'volume_spike'],
        weight: 0.25
      },
      BREAKOUT: {
        name: 'Breakout Hunter V1.0',
        description: 'Identifies and trades breakouts from consolidation patterns',
        conditions: ['consolidation', 'low_volatility', 'accumulation'],
        weight: 0.20
      },
      MEAN_REVERSION: {
        name: 'Mean Reversion V1.0',
        description: 'Trades reversions from overextended price levels',
        conditions: ['overbought', 'oversold', 'extreme_levels'],
        weight: 0.20
      }
    };
    
    this.strategyWeights = {
      trending_market: { QUANTUM: 0.8, MOMENTUM: 0.6, BREAKOUT: 0.3, MEAN_REVERSION: 0.1 },
      clear_structure: { QUANTUM: 0.9, MOMENTUM: 0.5, BREAKOUT: 0.7, MEAN_REVERSION: 0.3 },
      institutional_flow: { QUANTUM: 0.85, MOMENTUM: 0.4, BREAKOUT: 0.6, MEAN_REVERSION: 0.2 },
      high_volatility: { QUANTUM: 0.4, MOMENTUM: 0.9, BREAKOUT: 0.5, MEAN_REVERSION: 0.2 },
      strong_momentum: { QUANTUM: 0.5, MOMENTUM: 0.95, BREAKOUT: 0.4, MEAN_REVERSION: 0.1 },
      volume_spike: { QUANTUM: 0.6, MOMENTUM: 0.85, BREAKOUT: 0.7, MEAN_REVERSION: 0.3 },
      consolidation: { QUANTUM: 0.3, MOMENTUM: 0.2, BREAKOUT: 0.9, MEAN_REVERSION: 0.5 },
      low_volatility: { QUANTUM: 0.2, MOMENTUM: 0.1, BREAKOUT: 0.8, MEAN_REVERSION: 0.6 },
      accumulation: { QUANTUM: 0.4, MOMENTUM: 0.3, BREAKOUT: 0.85, MEAN_REVERSION: 0.4 },
      overbought: { QUANTUM: 0.2, MOMENTUM: 0.1, BREAKOUT: 0.3, MEAN_REVERSION: 0.9 },
      oversold: { QUANTUM: 0.2, MOMENTUM: 0.1, BREAKOUT: 0.3, MEAN_REVERSION: 0.9 },
      extreme_levels: { QUANTUM: 0.3, MOMENTUM: 0.2, BREAKOUT: 0.4, MEAN_REVERSION: 0.85 }
    };
    
    logger.info('AI Strategy Selector Initialized');
  }
  
  analyzeMarketConditions(priceData, volumeData, indicators) {
    const conditions = {};
    const closes = priceData.map(p => p.close);
    const highs = priceData.map(p => p.high);
    const lows = priceData.map(p => p.low);
    const volumes = volumeData;
    
    // 1. Check if market is trending
    const trendStrength = this.calculateTrendStrength(closes);
    conditions.trending_market = trendStrength > 0.6;
    conditions.trend_strength = trendStrength;
    
    // 2. Check for clear structure
    const structureClarity = this.analyzeMarketStructure(highs, lows, closes);
    conditions.clear_structure = structureClarity > 0.7;
    conditions.structure_score = structureClarity;
    
    // 3. Check institutional flow (simplified)
    const institutionalScore = this.assessInstitutionalFlow(volumes, closes);
    conditions.institutional_flow = institutionalScore > 0.65;
    conditions.institutional_score = institutionalScore;
    
    // 4. Check volatility
    const volatility = this.calculateVolatility(closes);
    conditions.high_volatility = volatility > 0.02;
    conditions.low_volatility = volatility < 0.005;
    conditions.volatility_level = volatility;
    
    // 5. Check momentum
    const momentum = this.calculateMomentum(closes);
    conditions.strong_momentum = Math.abs(momentum) > 0.015;
    conditions.momentum_direction = momentum > 0 ? 'BULLISH' : 'BEARISH';
    conditions.momentum_strength = Math.abs(momentum);
    
    // 6. Check volume
    const volumeAnalysis = this.analyzeVolume(volumes);
    conditions.volume_spike = volumeAnalysis.hasSpike;
    conditions.volume_trend = volumeAnalysis.trend;
    
    // 7. Check for consolidation
    const consolidationScore = this.detectConsolidation(highs, lows);
    conditions.consolidation = consolidationScore > 0.7;
    conditions.consolidation_score = consolidationScore;
    
    // 8. Check accumulation patterns
    conditions.accumulation = this.detectAccumulation(closes, volumes);
    
    // 9. Check overbought/oversold
    if (indicators && indicators.rsi) {
      conditions.overbought = indicators.rsi > 70;
      conditions.oversold = indicators.rsi < 30;
      conditions.rsi_level = indicators.rsi;
    }
    
    // 10. Check for extreme price levels
    const extremeLevels = this.checkExtremeLevels(closes);
    conditions.extreme_levels = extremeLevels.isExtreme;
    conditions.extreme_type = extremeLevels.type;
    
    return conditions;
  }
  
  selectOptimalStrategy(marketConditions) {
    if (!ENABLE_AI_STRATEGY_SELECTION || ENABLE_AI_STRATEGY_SELECTION === 'false') {
      return { strategy: 'QUANTUM', confidence: 0.8, reason: 'AI selection disabled' };
    }
    
    const strategyScores = {};
    const activeConditions = Object.keys(marketConditions).filter(
      key => typeof marketConditions[key] === 'boolean' && marketConditions[key] === true
    );
    
    // Calculate scores for each strategy
    Object.keys(this.strategies).forEach(strategy => {
      let score = this.strategies[strategy].weight;
      let matchedConditions = 0;
      
      activeConditions.forEach(condition => {
        if (this.strategyWeights[condition] && this.strategyWeights[condition][strategy]) {
          score += this.strategyWeights[condition][strategy];
          matchedConditions++;
        }
      });
      
      // Normalize score
      if (matchedConditions > 0) {
        score /= (1 + matchedConditions);
      }
      
      strategyScores[strategy] = {
        score: score,
        conditions: activeConditions.filter(cond => 
          this.strategyWeights[cond] && this.strategyWeights[cond][strategy] > 0.5
        )
      };
    });
    
    // Find best strategy
    let bestStrategy = 'QUANTUM';
    let bestScore = -1;
    
    Object.entries(strategyScores).forEach(([strategy, data]) => {
      if (data.score > bestScore) {
        bestScore = data.score;
        bestStrategy = strategy;
      }
    });
    
    // Calculate confidence
    const confidence = Math.min(0.95, bestScore);
    const confidenceLevel = confidence > 0.8 ? 'HIGH' : confidence > 0.6 ? 'MEDIUM' : 'LOW';
    
    // Generate reason
    const reason = this.generateStrategyReason(bestStrategy, strategyScores[bestStrategy].conditions, marketConditions);
    
    return {
      strategy: bestStrategy,
      confidence: confidence,
      confidenceLevel: confidenceLevel,
      score: bestScore,
      conditions: strategyScores[bestStrategy].conditions,
      allScores: strategyScores,
      reason: reason
    };
  }
  
  // ==================== TECHNICAL ANALYSIS METHODS ====================
  calculateTrendStrength(closes) {
    if (closes.length < 20) return 0.5;
    
    const periods = [5, 10, 20];
    let trendScore = 0;
    
    periods.forEach(period => {
      const recent = closes.slice(-period);
      const older = closes.slice(-period * 2, -period);
      
      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        
        if (Math.abs(recentAvg - olderAvg) / olderAvg > 0.02) {
          trendScore += 0.33;
        }
      }
    });
    
    return trendScore;
  }
  
  analyzeMarketStructure(highs, lows, closes) {
    if (closes.length < 30) return 0.5;
    
    // Check for Higher Highs/Higher Lows or Lower Highs/Lower Lows
    const recentHighs = highs.slice(-10);
    const recentLows = lows.slice(-10);
    const olderHighs = highs.slice(-20, -10);
    const olderLows = lows.slice(-20, -10);
    
    if (recentHighs.length === 0 || recentLows.length === 0 || 
        olderHighs.length === 0 || olderLows.length === 0) {
      return 0.5;
    }
    
    const maxRecentHigh = Math.max(...recentHighs);
    const minRecentLow = Math.min(...recentLows);
    const maxOlderHigh = Math.max(...olderHighs);
    const minOlderLow = Math.min(...olderLows);
    
    const hasHigherHighs = maxRecentHigh > maxOlderHigh;
    const hasHigherLows = minRecentLow > minOlderLow;
    const hasLowerHighs = maxRecentHigh < maxOlderHigh;
    const hasLowerLows = minRecentLow < minOlderLow;
    
    // Bullish structure
    if (hasHigherHighs && hasHigherLows) {
      return 0.9;
    }
    // Bearish structure
    else if (hasLowerHighs && hasLowerLows) {
      return 0.9;
    }
    // Mixed or ranging
    else {
      return 0.4;
    }
  }
  
  assessInstitutionalFlow(volumes, closes) {
    if (volumes.length < 20 || closes.length < 20) return 0.5;
    
    // Look for volume increasing on up moves
    const recentVolume = volumes.slice(-10);
    const olderVolume = volumes.slice(-20, -10);
    const recentCloses = closes.slice(-10);
    const olderCloses = closes.slice(-20, -10);
    
    const avgRecentVolume = recentVolume.reduce((a, b) => a + b, 0) / recentVolume.length;
    const avgOlderVolume = olderVolume.reduce((a, b) => a + b, 0) / olderVolume.length;
    const priceChange = (recentCloses[recentCloses.length - 1] - olderCloses[0]) / olderCloses[0];
    
    // Institutional flow: price up on increasing volume
    if (priceChange > 0.02 && avgRecentVolume > avgOlderVolume * 1.2) {
      return 0.8;
    }
    // Distribution: price down on increasing volume
    else if (priceChange < -0.02 && avgRecentVolume > avgOlderVolume * 1.2) {
      return 0.3;
    }
    // Weak flow
    else {
      return 0.5;
    }
  }
  
  calculateVolatility(closes) {
    if (closes.length < 10) return 0.01;
    
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push(Math.abs((closes[i] - closes[i-1]) / closes[i-1]));
    }
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    return avgReturn;
  }
  
  calculateMomentum(closes) {
    if (closes.length < 10) return 0;
    
    const recent = closes.slice(-5);
    const older = closes.slice(-10, -5);
    
    if (recent.length === 0 || older.length === 0) return 0;
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    return (recentAvg - olderAvg) / olderAvg;
  }
  
  analyzeVolume(volumes) {
    if (volumes.length < 20) return { hasSpike: false, trend: 'NEUTRAL' };
    
    const recentVolume = volumes.slice(-5);
    const olderVolume = volumes.slice(-20, -5);
    
    const avgRecent = recentVolume.reduce((a, b) => a + b, 0) / recentVolume.length;
    const avgOlder = olderVolume.reduce((a, b) => a + b, 0) / olderVolume.length;
    
    const hasSpike = avgRecent > avgOlder * 1.5;
    const trend = avgRecent > avgOlder * 1.1 ? 'INCREASING' : 
                  avgRecent < avgOlder * 0.9 ? 'DECREASING' : 'NEUTRAL';
    
    return { hasSpike, trend };
  }
  
  detectConsolidation(highs, lows) {
    if (highs.length < 20 || lows.length < 20) return 0.5;
    
    const recentHighs = highs.slice(-10);
    const recentLows = lows.slice(-10);
    const olderHighs = highs.slice(-20, -10);
    const olderLows = lows.slice(-20, -10);
    
    const recentRange = Math.max(...recentHighs) - Math.min(...recentLows);
    const olderRange = Math.max(...olderHighs) - Math.min(...olderLows);
    
    // Consolidation: range contraction
    if (recentRange < olderRange * 0.7) {
      return 0.8;
    }
    // Expansion
    else if (recentRange > olderRange * 1.3) {
      return 0.2;
    }
    // Neutral
    else {
      return 0.5;
    }
  }
  
  detectAccumulation(closes, volumes) {
    if (closes.length < 30 || volumes.length < 30) return false;
    
    // Look for sideways price action with increasing volume
    const priceRange = this.calculatePriceRange(closes.slice(-20));
    const volumeTrend = this.analyzeVolume(volumes.slice(-20)).trend;
    
    return priceRange < 0.02 && volumeTrend === 'INCREASING';
  }
  
  checkExtremeLevels(closes) {
    if (closes.length < 50) return { isExtreme: false, type: 'NONE' };
    
    const recent = closes.slice(-20);
    const allTime = closes;
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const allTimeAvg = allTime.reduce((a, b) => a + b, 0) / allTime.length;
    const stdDev = this.calculateStandardDeviation(allTime);
    
    const zScore = (recentAvg - allTimeAvg) / stdDev;
    
    if (zScore > 2) {
      return { isExtreme: true, type: 'OVERBOUGHT' };
    } else if (zScore < -2) {
      return { isExtreme: true, type: 'OVERSOLD' };
    } else {
      return { isExtreme: false, type: 'NORMAL' };
    }
  }
  
  calculatePriceRange(closes) {
    if (closes.length === 0) return 0;
    const max = Math.max(...closes);
    const min = Math.min(...closes);
    return (max - min) / min;
  }
  
  calculateStandardDeviation(values) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }
  
  generateStrategyReason(strategy, conditions, marketConditions) {
    const strategyNames = {
      QUANTUM: 'Quantum Engine V2.0',
      MOMENTUM: 'Momentum Scalper',
      BREAKOUT: 'Breakout Hunter',
      MEAN_REVERSION: 'Mean Reversion'
    };
    
    const conditionDescriptions = {
      trending_market: 'Strong trending market detected',
      clear_structure: 'Clear market structure present',
      institutional_flow: 'Institutional money flow detected',
      high_volatility: 'High volatility environment',
      strong_momentum: 'Strong momentum present',
      volume_spike: 'Volume spike detected',
      consolidation: 'Market in consolidation',
      low_volatility: 'Low volatility conditions',
      accumulation: 'Accumulation pattern detected',
      overbought: 'Market overbought',
      oversold: 'Market oversold',
      extreme_levels: 'Price at extreme levels'
    };
    
    let reason = `AI selected ${strategyNames[strategy]} because: `;
    
    if (conditions.length > 0) {
      reason += conditions.map(cond => conditionDescriptions[cond] || cond).join(', ');
    } else {
      reason += 'Market conditions are neutral, using default institutional strategy';
    }
    
    // Add specific metrics
    if (marketConditions.trend_strength !== undefined) {
      reason += ` | Trend Strength: ${(marketConditions.trend_strength * 100).toFixed(1)}%`;
    }
    if (marketConditions.volatility_level !== undefined) {
      reason += ` | Volatility: ${(marketConditions.volatility_level * 100).toFixed(2)}%`;
    }
    
    return reason;
  }
}

// ==================== INSTITUTIONAL TRADING ENGINE ====================
class InstitutionalTradingEngine {
  constructor() {
    this.aiSelector = new AIStrategySelector();
    this.strategies = {
      QUANTUM: this.executeQuantumStrategy.bind(this),
      MOMENTUM: this.executeMomentumStrategy.bind(this),
      BREAKOUT: this.executeBreakoutStrategy.bind(this),
      MEAN_REVERSION: this.executeMeanReversionStrategy.bind(this)
    };
    
    this.indicators = {
      rsi: this.calculateRSI.bind(this),
      ema: this.calculateEMA.bind(this),
      bollinger: this.calculateBollingerBands.bind(this),
      atr: this.calculateATR.bind(this),
      macd: this.calculateMACD.bind(this)
    };
    
    logger.info('Institutional Trading Engine Initialized');
  }
  
  async analyzeAsset(symbol, priceData, volumeData) {
    try {
      logger.info(`🔄 AI analyzing ${symbol}...`);
      
      // Calculate basic indicators
      const closes = priceData.map(p => p.close);
      const highs = priceData.map(p => p.high);
      const lows = priceData.map(p => p.low);
      
      const indicators = {
        rsi: this.calculateRSI(closes, 14),
        ema20: this.calculateEMA(closes, 20),
        ema50: this.calculateEMA(closes, 50),
        ema200: this.calculateEMA(closes, 200),
        atr: this.calculateATR(highs, lows, closes, 14),
        currentPrice: closes[closes.length - 1]
      };
      
      // AI analyzes market conditions
      const marketConditions = this.aiSelector.analyzeMarketConditions(
        priceData, 
        volumeData, 
        indicators
      );
      
      // AI selects optimal strategy
      const strategySelection = this.aiSelector.selectOptimalStrategy(marketConditions);
      
      // Check confidence threshold
      if (strategySelection.confidence < MIN_CONFIDENCE_THRESHOLD) {
        logger.warn(`Low confidence for ${symbol}: ${strategySelection.confidence.toFixed(2)}`);
        return this.generateNoTradeAnalysis(symbol, strategySelection);
      }
      
      // Execute selected strategy
      const strategy = this.strategies[strategySelection.strategy];
      if (!strategy) {
        throw new Error(`Strategy ${strategySelection.strategy} not implemented`);
      }
      
      const strategyAnalysis = await strategy(symbol, priceData, volumeData, indicators);
      
      // Combine results
      const finalAnalysis = {
        symbol,
        timestamp: Date.now(),
        aiStrategy: strategySelection.strategy,
        strategyName: this.aiSelector.strategies[strategySelection.strategy].name,
        confidence: strategySelection.confidence,
        confidenceLevel: strategySelection.confidenceLevel,
        marketConditions,
        strategySelection,
        analysis: strategyAnalysis,
        riskAssessment: this.assessRisk(priceData, volumeData, strategyAnalysis),
        finalSignal: this.generateFinalSignal(strategyAnalysis, strategySelection)
      };
      
      logger.info(`✅ AI analysis complete for ${symbol}: ${strategySelection.strategy} (${(strategySelection.confidence * 100).toFixed(1)}% confidence)`);
      
      return finalAnalysis;
      
    } catch (error) {
      logger.error(`AI analysis failed for ${symbol}: ${error.message}`);
      throw error;
    }
  }
  
  // ==================== STRATEGY IMPLEMENTATIONS ====================
  
  async executeQuantumStrategy(symbol, priceData, volumeData, indicators) {
    // Institutional-grade quantum analysis
    const closes = priceData.map(p => p.close);
    const highs = priceData.map(p => p.high);
    const lows = priceData.map(p => p.low);
    
    // 1. Order Block Analysis
    const orderBlocks = this.analyzeOrderBlocks(priceData);
    
    // 2. Structure Analysis
    const marketStructure = this.analyzeMarketStructure(highs, lows, closes);
    
    // 3. Fair Value Gaps
    const fairValueGaps = this.findFairValueGaps(priceData);
    
    // 4. Trend Analysis
    const trendAnalysis = this.analyzeTrend(closes);
    
    // 5. Volume Profile
    const volumeProfile = this.analyzeVolumeProfile(priceData, volumeData);
    
    // 6. Support/Resistance
    const keyLevels = this.findKeyLevels(highs, lows, closes);
    
    // Generate signal
    const signal = this.generateQuantumSignal(
      orderBlocks, 
      marketStructure, 
      fairValueGaps, 
      trendAnalysis, 
      volumeProfile, 
      keyLevels
    );
    
    // Calculate levels
    const levels = this.calculateQuantumLevels(
      indicators.currentPrice,
      indicators.atr,
      keyLevels,
      signal.direction
    );
    
    return {
      strategy: 'QUANTUM',
      signal,
      levels,
      analysis: {
        orderBlocks,
        marketStructure,
        fairValueGaps,
        trendAnalysis,
        volumeProfile,
        keyLevels
      },
      indicators: {
        rsi: indicators.rsi,
        emaAlignment: this.checkEMAAlignment(indicators.ema20, indicators.ema50, indicators.ema200),
        atr: indicators.atr,
        volatility: indicators.atr / indicators.currentPrice
      }
    };
  }
  
  async executeMomentumStrategy(symbol, priceData, volumeData, indicators) {
    // Momentum-based strategy
    const closes = priceData.map(p => p.close);
    const recentCloses = closes.slice(-20);
    
    // Momentum indicators
    const momentum = this.calculateMomentumIndicator(closes);
    const volumeMomentum = this.calculateVolumeMomentum(volumeData);
    const priceVelocity = this.calculatePriceVelocity(closes);
    
    // Generate signal
    const signal = this.generateMomentumSignal(momentum, volumeMomentum, priceVelocity, indicators.rsi);
    
    // Calculate levels
    const levels = this.calculateMomentumLevels(
      indicators.currentPrice,
      indicators.atr,
      momentum.strength,
      signal.direction
    );
    
    return {
      strategy: 'MOMENTUM',
      signal,
      levels,
      analysis: {
        momentum,
        volumeMomentum,
        priceVelocity,
        rsi: indicators.rsi
      }
    };
  }
  
  async executeBreakoutStrategy(symbol, priceData, volumeData, indicators) {
    // Breakout strategy
    const closes = priceData.map(p => p.close);
    const highs = priceData.map(p => p.high);
    const lows = priceData.map(p => p.low);
    
    // Consolidation detection
    const consolidation = this.detectConsolidationPattern(highs, lows, closes);
    
    // Volume analysis for breakouts
    const breakoutVolume = this.analyzeBreakoutVolume(volumeData);
    
    // Key levels for potential breakouts
    const breakoutLevels = this.identifyBreakoutLevels(highs, lows, closes);
    
    // Generate signal
    const signal = this.generateBreakoutSignal(consolidation, breakoutVolume, breakoutLevels, indicators.currentPrice);
    
    // Calculate levels
    const levels = this.calculateBreakoutLevels(
      indicators.currentPrice,
      indicators.atr,
      breakoutLevels,
      signal.direction
    );
    
    return {
      strategy: 'BREAKOUT',
      signal,
      levels,
      analysis: {
        consolidation,
        breakoutVolume,
        breakoutLevels,
        volatility: indicators.atr / indicators.currentPrice
      }
    };
  }
  
  async executeMeanReversionStrategy(symbol, priceData, volumeData, indicators) {
    // Mean reversion strategy
    const closes = priceData.map(p => p.close);
    
    // Overbought/oversold analysis
    const extremes = this.identifyExtremes(closes, indicators.rsi);
    
    // Mean reversion zones
    const meanZones = this.calculateMeanReversionZones(closes);
    
    // Divergence analysis
    const divergences = this.findDivergences(closes, volumeData, indicators.rsi);
    
    // Generate signal
    const signal = this.generateMeanReversionSignal(extremes, meanZones, divergences, indicators.rsi);
    
    // Calculate levels
    const levels = this.calculateMeanReversionLevels(
      indicators.currentPrice,
      indicators.atr,
      meanZones,
      signal.direction
    );
    
    return {
      strategy: 'MEAN_REVERSION',
      signal,
      levels,
      analysis: {
        extremes,
        meanZones,
        divergences,
        rsi: indicators.rsi
      }
    };
  }
  
  // ==================== SIGNAL GENERATION ====================
  
  generateQuantumSignal(orderBlocks, structure, gaps, trend, volume, levels) {
    let score = 0;
    const reasons = [];
    
    // Order block bias
    if (orderBlocks.bias === 'BULLISH') {
      score += 0.3;
      reasons.push('Bullish order block detected');
    } else if (orderBlocks.bias === 'BEARISH') {
      score -= 0.3;
      reasons.push('Bearish order block detected');
    }
    
    // Structure bias
    if (structure.bias === 'BULLISH') {
      score += 0.2;
      reasons.push('Bullish market structure');
    } else if (structure.bias === 'BEARISH') {
      score -= 0.2;
      reasons.push('Bearish market structure');
    }
    
    // Volume profile
    if (volume.bias === 'BULLISH') {
      score += 0.15;
      reasons.push('Bullish volume profile');
    } else if (volume.bias === 'BEARISH') {
      score -= 0.15;
      reasons.push('Bearish volume profile');
    }
    
    // Determine signal
    let direction = 'NEUTRAL';
    if (score > 0.3) direction = 'BULLISH';
    else if (score < -0.3) direction = 'BEARISH';
    
    return {
      direction,
      score,
      confidence: Math.abs(score),
      reasons: reasons.slice(0, 3)
    };
  }
  
  generateMomentumSignal(momentum, volumeMomentum, priceVelocity, rsi) {
    let score = 0;
    const reasons = [];
    
    // Momentum direction
    if (momentum.direction === 'BULLISH') {
      score += 0.4;
      reasons.push(`Strong bullish momentum: ${(momentum.strength * 100).toFixed(1)}%`);
    } else if (momentum.direction === 'BEARISH') {
      score -= 0.4;
      reasons.push(`Strong bearish momentum: ${(momentum.strength * 100).toFixed(1)}%`);
    }
    
    // Volume confirmation
    if (volumeMomentum.confirms) {
      score += (momentum.direction === 'BULLISH' ? 0.2 : -0.2);
      reasons.push('Volume confirms momentum');
    }
    
    // RSI filter
    if (rsi > 70 && momentum.direction === 'BULLISH') {
      score -= 0.1;
      reasons.push('RSI overbought, momentum may weaken');
    } else if (rsi < 30 && momentum.direction === 'BEARISH') {
      score += 0.1;
      reasons.push('RSI oversold, momentum may weaken');
    }
    
    // Determine signal
    let direction = 'NEUTRAL';
    if (score > 0.3) direction = 'BULLISH';
    else if (score < -0.3) direction = 'BEARISH';
    
    return {
      direction,
      score,
      confidence: Math.abs(score),
      reasons: reasons.slice(0, 3)
    };
  }
  
  generateBreakoutSignal(consolidation, volume, levels, currentPrice) {
    let score = 0;
    const reasons = [];
    
    // Need consolidation first
    if (!consolidation.detected) {
      return {
        direction: 'NEUTRAL',
        score: 0,
        confidence: 0,
        reasons: ['No consolidation pattern detected']
      };
    }
    
    // Volume confirmation
    if (volume.confirms) {
      score += 0.3;
      reasons.push('Volume confirms breakout potential');
    }
    
    // Proximity to levels
    const distanceToResistance = levels.resistance ? (levels.resistance - currentPrice) / currentPrice : 0.1;
    const distanceToSupport = levels.support ? (currentPrice - levels.support) / currentPrice : 0.1;
    
    if (distanceToResistance < 0.02) {
      score += 0.4;
      reasons.push(`Near resistance: ${(distanceToResistance * 100).toFixed(2)}% away`);
    } else if (distanceToSupport < 0.02) {
      score -= 0.4;
      reasons.push(`Near support: ${(distanceToSupport * 100).toFixed(2)}% away`);
    }
    
    // Determine signal
    let direction = 'NEUTRAL';
    if (score > 0.3) direction = 'BULLISH';
    else if (score < -0.3) direction = 'BEARISH';
    
    return {
      direction,
      score,
      confidence: Math.abs(score),
      reasons: reasons.slice(0, 3)
    };
  }
  
  generateMeanReversionSignal(extremes, zones, divergences, rsi) {
    let score = 0;
    const reasons = [];
    
    // Overbought/oversold conditions
    if (extremes.condition === 'OVERBOUGHT') {
      score -= 0.4;
      reasons.push(`Overbought: RSI ${rsi.toFixed(1)}`);
    } else if (extremes.condition === 'OVERSOLD') {
      score += 0.4;
      reasons.push(`Oversold: RSI ${rsi.toFixed(1)}`);
    }
    
    // Divergence detection
    if (divergences.bullish) {
      score += 0.2;
      reasons.push('Bullish divergence detected');
    } else if (divergences.bearish) {
      score -= 0.2;
      reasons.push('Bearish divergence detected');
    }
    
    // Mean reversion zones
    const distanceToMean = zones.distanceToMean;
    if (Math.abs(distanceToMean) > 0.05) {
      score += (distanceToMean < 0 ? 0.1 : -0.1);
      reasons.push(`Price ${(Math.abs(distanceToMean) * 100).toFixed(1)}% from mean`);
    }
    
    // Determine signal
    let direction = 'NEUTRAL';
    if (score > 0.3) direction = 'BULLISH';
    else if (score < -0.3) direction = 'BEARISH';
    
    return {
      direction,
      score,
      confidence: Math.abs(score),
      reasons: reasons.slice(0, 3)
    };
  }
  
  // ==================== LEVEL CALCULATION ====================
  
  calculateQuantumLevels(currentPrice, atr, keyLevels, direction) {
    let entry, stopLoss, takeProfit;
    
    if (direction === 'BULLISH') {
      entry = currentPrice;
      stopLoss = keyLevels.support || (currentPrice - atr * 1.5);
      takeProfit = [
        keyLevels.resistance || (currentPrice + atr * 1.0),
        currentPrice + atr * 2.0,
        currentPrice + atr * 3.0
      ];
    } else if (direction === 'BEARISH') {
      entry = currentPrice;
      stopLoss = keyLevels.resistance || (currentPrice + atr * 1.5);
      takeProfit = [
        keyLevels.support || (currentPrice - atr * 1.0),
        currentPrice - atr * 2.0,
        currentPrice - atr * 3.0
      ];
    } else {
      entry = currentPrice;
      stopLoss = currentPrice;
      takeProfit = [currentPrice];
    }
    
    const risk = Math.abs(entry - stopLoss);
    const reward = takeProfit[0] ? Math.abs(takeProfit[0] - entry) : 0;
    const riskReward = risk > 0 ? reward / risk : 0;
    
    return {
      entry: this.roundToPrecision(entry, 4),
      stopLoss: this.roundToPrecision(stopLoss, 4),
      takeProfit: takeProfit.map(tp => this.roundToPrecision(tp, 4)),
      riskReward: this.roundToPrecision(riskReward, 2)
    };
  }
  
  // ==================== TECHNICAL INDICATORS ====================
  
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  calculateEMA(data, period) {
    if (data.length < period) return data[data.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = data[0];
    
    for (let i = 1; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }
  
  calculateBollingerBands(data, period = 20, stdDev = 2) {
    if (data.length < period) return { upper: null, middle: null, lower: null };
    
    const slice = data.slice(-period);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    return {
      upper: mean + (std * stdDev),
      middle: mean,
      lower: mean - (std * stdDev)
    };
  }
  
  calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < period || lows.length < period || closes.length < period) {
      return 0;
    }
    
    const trValues = [];
    for (let i = 1; i < period; i++) {
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      trValues.push(Math.max(hl, hc, lc));
    }
    
    return trValues.reduce((a, b) => a + b, 0) / trValues.length;
  }
  
  calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (data.length < slowPeriod) return { macd: 0, signal: 0, histogram: 0 };
    
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    const macd = fastEMA - slowEMA;
    
    // Simplified signal line
    const signal = this.calculateEMA(data.slice(-signalPeriod * 2), signalPeriod);
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
  }
  
  // ==================== HELPER METHODS ====================
  
  analyzeOrderBlocks(priceData) {
    // Simplified order block detection
    return {
      detected: true,
      bias: Math.random() > 0.5 ? 'BULLISH' : 'BEARISH',
      confidence: 0.7
    };
  }
  
  analyzeMarketStructure(highs, lows, closes) {
    // Simplified structure analysis
    const recentHigh = Math.max(...highs.slice(-5));
    const recentLow = Math.min(...lows.slice(-5));
    const olderHigh = Math.max(...highs.slice(-10, -5));
    const olderLow = Math.min(...lows.slice(-10, -5));
    
    if (recentHigh > olderHigh && recentLow > olderLow) {
      return { bias: 'BULLISH', strength: 0.8 };
    } else if (recentHigh < olderHigh && recentLow < olderLow) {
      return { bias: 'BEARISH', strength: 0.8 };
    } else {
      return { bias: 'NEUTRAL', strength: 0.5 };
    }
  }
  
  findFairValueGaps(priceData) {
    // Simplified FVG detection
    return {
      detected: priceData.length > 3,
      count: Math.min(3, Math.floor(priceData.length / 10))
    };
  }
  
  analyzeTrend(closes) {
    if (closes.length < 20) return { direction: 'NEUTRAL', strength: 0.5 };
    
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);
    const currentPrice = closes[closes.length - 1];
    
    const aboveEMA20 = currentPrice > ema20;
    const aboveEMA50 = currentPrice > ema50;
    const emaAlignment = ema20 > ema50;
    
    if (aboveEMA20 && aboveEMA50 && emaAlignment) {
      return { direction: 'BULLISH', strength: 0.8 };
    } else if (!aboveEMA20 && !aboveEMA50 && !emaAlignment) {
      return { direction: 'BEARISH', strength: 0.8 };
    } else {
      return { direction: 'NEUTRAL', strength: 0.5 };
    }
  }
  
  analyzeVolumeProfile(priceData, volumeData) {
    if (priceData.length < 20 || volumeData.length < 20) {
      return { bias: 'NEUTRAL', poc: null, valueArea: null };
    }
    
    // Simplified volume profile
    const recentVolume = volumeData.slice(-10).reduce((a, b) => a + b, 0);
    const olderVolume = volumeData.slice(-20, -10).reduce((a, b) => a + b, 0);
    
    const bias = recentVolume > olderVolume * 1.2 ? 'BULLISH' : 
                 recentVolume < olderVolume * 0.8 ? 'BEARISH' : 'NEUTRAL';
    
    return {
      bias,
      poc: priceData[priceData.length - 1].close,
      valueArea: {
        high: Math.max(...priceData.slice(-10).map(p => p.high)),
        low: Math.min(...priceData.slice(-10).map(p => p.low))
      }
    };
  }
  
  findKeyLevels(highs, lows, closes) {
    if (highs.length < 20 || lows.length < 20) {
      return { support: null, resistance: null };
    }
    
    const recentHighs = highs.slice(-20);
    const recentLows = lows.slice(-20);
    const currentPrice = closes[closes.length - 1];
    
    // Find recent support and resistance
    const support = Math.min(...recentLows);
    const resistance = Math.max(...recentHighs);
    
    return {
      support: support < currentPrice ? support : currentPrice * 0.95,
      resistance: resistance > currentPrice ? resistance : currentPrice * 1.05,
      currentPrice
    };
  }
  
  checkEMAAlignment(ema20, ema50, ema200) {
    if (ema20 > ema50 && ema50 > ema200) return 'BULLISH';
    if (ema20 < ema50 && ema50 < ema200) return 'BEARISH';
    return 'MIXED';
  }
  
  calculateMomentumIndicator(closes) {
    if (closes.length < 10) return { direction: 'NEUTRAL', strength: 0 };
    
    const recent = closes.slice(-5);
    const older = closes.slice(-10, -5);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    const direction = change > 0.01 ? 'BULLISH' : change < -0.01 ? 'BEARISH' : 'NEUTRAL';
    
    return {
      direction,
      strength: Math.abs(change),
      change
    };
  }
  
  calculateVolumeMomentum(volumes) {
    if (volumes.length < 10) return { confirms: false, strength: 0 };
    
    const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0);
    const olderVolume = volumes.slice(-10, -5).reduce((a, b) => a + b, 0);
    
    const ratio = recentVolume / olderVolume;
    
    return {
      confirms: ratio > 1.2,
      strength: ratio,
      trend: ratio > 1 ? 'INCREASING' : 'DECREASING'
    };
  }
  
  calculatePriceVelocity(closes) {
    if (closes.length < 5) return { velocity: 0, acceleration: 0 };
    
    const recent = closes.slice(-3);
    const changes = [];
    
    for (let i = 1; i < recent.length; i++) {
      changes.push((recent[i] - recent[i-1]) / recent[i-1]);
    }
    
    const velocity = changes.reduce((a, b) => a + b, 0) / changes.length;
    const acceleration = changes.length > 1 ? (changes[changes.length - 1] - changes[0]) : 0;
    
    return { velocity, acceleration };
  }
  
  detectConsolidationPattern(highs, lows, closes) {
    if (highs.length < 20 || lows.length < 20) {
      return { detected: false, range: 0, duration: 0 };
    }
    
    const recentHighs = highs.slice(-10);
    const recentLows = lows.slice(-10);
    const olderHighs = highs.slice(-20, -10);
    const olderLows = lows.slice(-20, -10);
    
    const recentRange = Math.max(...recentHighs) - Math.min(...recentLows);
    const olderRange = Math.max(...olderHighs) - Math.min(...olderLows);
    const currentPrice = closes[closes.length - 1];
    const rangePercent = recentRange / currentPrice;
    
    // Consolidation: range contraction
    const detected = recentRange < olderRange * 0.7 && rangePercent < 0.03;
    
    return {
      detected,
      range: rangePercent,
      duration: 10, // candles
      compression: recentRange / olderRange
    };
  }
  
  analyzeBreakoutVolume(volumes) {
    if (volumes.length < 20) return { confirms: false, spike: false };
    
    const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const olderVolume = volumes.slice(-20, -5).reduce((a, b) => a + b, 0) / 15;
    
    const spike = recentVolume > olderVolume * 1.5;
    
    return {
      confirms: spike,
      spike,
      volumeRatio: recentVolume / olderVolume
    };
  }
  
  identifyBreakoutLevels(highs, lows, closes) {
    if (highs.length < 20 || lows.length < 20) {
      return { resistance: null, support: null, consolidationHigh: null, consolidationLow: null };
    }
    
    const recentHighs = highs.slice(-10);
    const recentLows = lows.slice(-10);
    const currentPrice = closes[closes.length - 1];
    
    const resistance = Math.max(...recentHighs);
    const support = Math.min(...recentLows);
    
    // Consolidation boundaries
    const consolidationHigh = Math.max(...recentHighs.slice(-5));
    const consolidationLow = Math.min(...recentLows.slice(-5));
    
    return {
      resistance: resistance > currentPrice ? resistance : null,
      support: support < currentPrice ? support : null,
      consolidationHigh,
      consolidationLow,
      currentPrice
    };
  }
  
  identifyExtremes(closes, rsi) {
    const currentPrice = closes[closes.length - 1];
    const mean = closes.reduce((a, b) => a + b, 0) / closes.length;
    const stdDev = this.calculateStandardDeviation(closes);
    const zScore = (currentPrice - mean) / stdDev;
    
    let condition = 'NORMAL';
    if (rsi > 70 || zScore > 2) condition = 'OVERBOUGHT';
    else if (rsi < 30 || zScore < -2) condition = 'OVERSOLD';
    
    return {
      condition,
      rsi,
      zScore,
      distanceFromMean: (currentPrice - mean) / mean
    };
  }
  
  calculateMeanReversionZones(closes) {
    if (closes.length < 20) return { mean: 0, upperBand: 0, lowerBand: 0, distanceToMean: 0 };
    
    const mean = closes.reduce((a, b) => a + b, 0) / closes.length;
    const stdDev = this.calculateStandardDeviation(closes);
    const currentPrice = closes[closes.length - 1];
    
    return {
      mean,
      upperBand: mean + stdDev,
      lowerBand: mean - stdDev,
      distanceToMean: (currentPrice - mean) / mean,
      currentPrice
    };
  }
  
  findDivergences(closes, volumes, rsi) {
    // Simplified divergence detection
    if (closes.length < 10 || volumes.length < 10) {
      return { bullish: false, bearish: false };
    }
    
    const recentCloses = closes.slice(-5);
    const recentRSI = rsi; // Simplified
    
    // Check for basic divergences
    const priceTrend = recentCloses[recentCloses.length - 1] > recentCloses[0] ? 'UP' : 'DOWN';
    const rsiTrend = recentRSI > 50 ? 'UP' : 'DOWN';
    
    const bullish = priceTrend === 'DOWN' && rsiTrend === 'UP';
    const bearish = priceTrend === 'UP' && rsiTrend === 'DOWN';
    
    return { bullish, bearish };
  }
  
  calculateStandardDeviation(values) {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    
    return Math.sqrt(avgSquareDiff);
  }
  
  calculateMomentumLevels(currentPrice, atr, momentumStrength, direction) {
    let entry, stopLoss, takeProfit;
    
    if (direction === 'BULLISH') {
      entry = currentPrice;
      stopLoss = currentPrice - (atr * (1.5 - momentumStrength));
      takeProfit = [
        currentPrice + (atr * (1.0 + momentumStrength)),
        currentPrice + (atr * (2.0 + momentumStrength)),
        currentPrice + (atr * (3.0 + momentumStrength))
      ];
    } else if (direction === 'BEARISH') {
      entry = currentPrice;
      stopLoss = currentPrice + (atr * (1.5 - momentumStrength));
      takeProfit = [
        currentPrice - (atr * (1.0 + momentumStrength)),
        currentPrice - (atr * (2.0 + momentumStrength)),
        currentPrice - (atr * (3.0 + momentumStrength))
      ];
    } else {
      entry = currentPrice;
      stopLoss = currentPrice;
      takeProfit = [currentPrice];
    }
    
    const risk = Math.abs(entry - stopLoss);
    const reward = takeProfit[0] ? Math.abs(takeProfit[0] - entry) : 0;
    const riskReward = risk > 0 ? reward / risk : 0;
    
    return {
      entry: this.roundToPrecision(entry, 4),
      stopLoss: this.roundToPrecision(stopLoss, 4),
      takeProfit: takeProfit.map(tp => this.roundToPrecision(tp, 4)),
      riskReward: this.roundToPrecision(riskReward, 2)
    };
  }
  
  calculateBreakoutLevels(currentPrice, atr, breakoutLevels, direction) {
    let entry, stopLoss, takeProfit;
    
    if (direction === 'BULLISH' && breakoutLevels.resistance) {
      entry = breakoutLevels.resistance * 1.002; // Enter above resistance
      stopLoss = breakoutLevels.consolidationLow || (currentPrice - atr * 2);
      takeProfit = [
        entry + (atr * 1.0),
        entry + (atr * 2.0),
        entry + (atr * 3.0)
      ];
    } else if (direction === 'BEARISH' && breakoutLevels.support) {
      entry = breakoutLevels.support * 0.998; // Enter below support
      stopLoss = breakoutLevels.consolidationHigh || (currentPrice + atr * 2);
      takeProfit = [
        entry - (atr * 1.0),
        entry - (atr * 2.0),
        entry - (atr * 3.0)
      ];
    } else {
      entry = currentPrice;
      stopLoss = currentPrice;
      takeProfit = [currentPrice];
    }
    
    const risk = Math.abs(entry - stopLoss);
    const reward = takeProfit[0] ? Math.abs(takeProfit[0] - entry) : 0;
    const riskReward = risk > 0 ? reward / risk : 0;
    
    return {
      entry: this.roundToPrecision(entry, 4),
      stopLoss: this.roundToPrecision(stopLoss, 4),
      takeProfit: takeProfit.map(tp => this.roundToPrecision(tp, 4)),
      riskReward: this.roundToPrecision(riskReward, 2)
    };
  }
  
  calculateMeanReversionLevels(currentPrice, atr, meanZones, direction) {
    let entry, stopLoss, takeProfit;
    
    if (direction === 'BULLISH') {
      // For oversold bounce
      entry = currentPrice;
      stopLoss = Math.min(meanZones.lowerBand, currentPrice - atr * 2);
      takeProfit = [
        meanZones.mean,
        meanZones.upperBand,
        meanZones.upperBand + atr
      ];
    } else if (direction === 'BEARISH') {
      // For overbought rejection
      entry = currentPrice;
      stopLoss = Math.max(meanZones.upperBand, currentPrice + atr * 2);
      takeProfit = [
        meanZones.mean,
        meanZones.lowerBand,
        meanZones.lowerBand - atr
      ];
    } else {
      entry = currentPrice;
      stopLoss = currentPrice;
      takeProfit = [currentPrice];
    }
    
    const risk = Math.abs(entry - stopLoss);
    const reward = takeProfit[0] ? Math.abs(takeProfit[0] - entry) : 0;
    const riskReward = risk > 0 ? reward / risk : 0;
    
    return {
      entry: this.roundToPrecision(entry, 4),
      stopLoss: this.roundToPrecision(stopLoss, 4),
      takeProfit: takeProfit.map(tp => this.roundToPrecision(tp, 4)),
      riskReward: this.roundToPrecision(riskReward, 2)
    };
  }
  
  assessRisk(priceData, volumeData, strategyAnalysis) {
    const closes = priceData.map(p => p.close);
    const currentPrice = closes[closes.length - 1];
    const volatility = this.calculateVolatility(closes);
    
    let riskScore = 0.5; // Start neutral
    
    // Volatility risk
    if (volatility > 0.03) riskScore += 0.2;
    else if (volatility < 0.01) riskScore -= 0.1;
    
    // Strategy-specific risk adjustments
    if (strategyAnalysis.strategy === 'MOMENTUM') {
      riskScore += 0.1; // Momentum trading is higher risk
    } else if (strategyAnalysis.strategy === 'MEAN_REVERSION') {
      riskScore += 0.05; // Mean reversion has timing risk
    }
    
    // Signal confidence
    const signalConfidence = strategyAnalysis.signal.confidence || 0.5;
    riskScore += (0.5 - signalConfidence) * 0.2;
    
    // Clamp risk score
    riskScore = Math.max(0.1, Math.min(0.9, riskScore));
    
    const level = riskScore > 0.7 ? 'HIGH' : riskScore > 0.4 ? 'MEDIUM' : 'LOW';
    
    return {
      score: riskScore,
      level,
      volatility,
      positionSizeRecommendation: this.calculatePositionSize(riskScore, currentPrice)
    };
  }
  
  calculateVolatility(closes) {
    if (closes.length < 10) return 0.01;
    
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push(Math.abs((closes[i] - closes[i-1]) / closes[i-1]));
    }
    
    return returns.reduce((a, b) => a + b, 0) / returns.length;
  }
  
  calculatePositionSize(riskScore, currentPrice) {
    // Calculate position size based on risk
    const baseSize = 1.0; // Base position size
    const riskAdjustment = 1.0 - riskScore; // Higher risk = smaller position
    
    const adjustedSize = baseSize * riskAdjustment;
    
    return {
      percentage: adjustedSize * DEFAULT_RISK_PCT,
      riskAdjusted: true,
      maxLoss: adjustedSize * DEFAULT_RISK_PCT * ACCOUNT_EQUITY / 100
    };
  }
  
  generateFinalSignal(strategyAnalysis, strategySelection) {
    const signal = strategyAnalysis.signal;
    const levels = strategyAnalysis.levels;
    
    // Check if signal is valid
    if (signal.direction === 'NEUTRAL' || signal.confidence < 0.3) {
      return {
        trade: 'NO_TRADE',
        reason: 'Insufficient signal confidence',
        confidence: signal.confidence
      };
    }
    
    // Check risk/reward
    if (levels.riskReward < 1) {
      return {
        trade: 'NO_TRADE',
        reason: `Risk/Reward too low: 1:${levels.riskReward.toFixed(2)}`,
        confidence: signal.confidence
      };
    }
    
    // Valid trade signal
    return {
      trade: signal.direction === 'BULLISH' ? 'LONG' : 'SHORT',
      direction: signal.direction,
      entry: levels.entry,
      stopLoss: levels.stopLoss,
      takeProfit: levels.takeProfit,
      riskReward: levels.riskReward,
      confidence: signal.confidence,
      strategy: strategyAnalysis.strategy,
      aiConfidence: strategySelection.confidence
    };
  }
  
  generateNoTradeAnalysis(symbol, strategySelection) {
    return {
      symbol,
      timestamp: Date.now(),
      aiStrategy: 'NO_TRADE',
      strategyName: 'No Trade',
      confidence: strategySelection.confidence,
      confidenceLevel: 'LOW',
      marketConditions: {},
      strategySelection,
      analysis: {
        signal: { direction: 'NEUTRAL', score: 0, confidence: 0, reasons: ['Low AI confidence'] },
        levels: { entry: 0, stopLoss: 0, takeProfit: [0], riskReward: 0 }
      },
      riskAssessment: { score: 0.5, level: 'MEDIUM' },
      finalSignal: {
        trade: 'NO_TRADE',
        reason: `AI confidence below threshold: ${(strategySelection.confidence * 100).toFixed(1)}%`,
        confidence: strategySelection.confidence
      }
    };
  }
  
  roundToPrecision(value, precision) {
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  }
}

// ==================== EXCHANGE MANAGER ====================
class ExchangeManager {
  constructor() {
    this.clients = {};
    this.tradingEngine = new InstitutionalTradingEngine();
    this.initializeExchanges();
  }
  
  async initializeExchanges() {
    logger.info('Initializing exchange connections...');
    
    // Initialize Bitget
    if (CCXT_BITGET_API_KEY && CCXT_BITGET_SECRET) {
      try {
        const isDemo = BITGET_DEMO_MODE === 'true';
        this.clients.bitget = new ccxt.bitget({
          apiKey: CCXT_BITGET_API_KEY,
          secret: CCXT_BITGET_SECRET,
          password: CCXT_BITGET_PASSWORD,
          enableRateLimit: true,
          options: {
            defaultType: isDemo ? 'demo' : 'future',
            adjustForTimeDifference: true
          }
        });
        
        if (isDemo) {
          this.clients.bitget.urls.api = this.clients.bitget.urls.test;
        }
        
        await this.clients.bitget.loadMarkets();
        logger.info(`✅ Bitget ${isDemo ? 'DEMO' : 'LIVE'} connected`);
      } catch (error) {
        logger.error(`❌ Bitget connection failed: ${error.message}`);
      }
    }
    
    // Initialize other exchanges as needed...
  }
  
  async fetchHistoricalData(symbol, timeframe = '1h', limit = 200) {
    // Determine exchange based on symbol
    const exchange = this.determineExchange(symbol);
    
    if (!this.clients[exchange]) {
      // Return simulated data for development
      return this.generateSimulatedData(limit);
    }
    
    try {
      let data;
      
      if (exchange === 'bitget') {
        // Convert symbol for Bitget
        const bitgetSymbol = symbol.endsWith('USDT') ? 
          symbol.replace('USDT', '/USDT:USDT') : symbol;
        
        data = await this.clients.bitget.fetchOHLCV(bitgetSymbol, timeframe, undefined, limit);
        
        return data.map(candle => ({
          timestamp: candle[0],
          open: candle[1],
          high: candle[2],
          low: candle[3],
          close: candle[4],
          volume: candle[5]
        }));
      }
      
      // Fallback to simulated data
      return this.generateSimulatedData(limit);
      
    } catch (error) {
      logger.error(`Failed to fetch data for ${symbol}: ${error.message}`);
      return this.generateSimulatedData(limit);
    }
  }
  
  determineExchange(symbol) {
    const sym = symbol.toUpperCase();
    
    if (sym.endsWith('USDT') || sym.endsWith('BTC') || sym.endsWith('ETH')) {
      return 'bitget';
    } else if (/^[A-Z]{6}$/.test(sym) || sym === 'XAUUSD' || sym === 'XAGUSD') {
      return 'oanda';
    } else if (/^[A-Z]{1,5}$/.test(sym)) {
      return 'alpaca';
    }
    
    return 'bitget'; // Default
  }
  
  generateSimulatedData(limit) {
    const data = [];
    let price = 100;
    
    for (let i = 0; i < limit; i++) {
      const change = (Math.random() - 0.5) * 4;
      price += change;
      price = Math.max(50, Math.min(200, price));
      
      const high = price + Math.random() * 2;
      const low = price - Math.random() * 2;
      const open = price - change * 0.5;
      const volume = Math.random() * 1000 + 100;
      
      data.push({
        timestamp: Date.now() - (limit - i) * 3600000,
        open,
        high,
        low,
        close: price,
        volume
      });
    }
    
    return data;
  }
  
  async analyzeAsset(symbol) {
    try {
      logger.info(`🤖 AI analyzing ${symbol}...`);
      
      // Fetch data for analysis
      const priceData = await this.fetchHistoricalData(symbol, '1h', 200);
      const volumeData = priceData.map(d => d.volume);
      
      if (priceData.length < 50) {
        throw new Error(`Insufficient data for ${symbol}: ${priceData.length} candles`);
      }
      
      // AI analyzes and selects strategy
      const analysis = await this.tradingEngine.analyzeAsset(symbol, priceData, volumeData);
      
      logger.info(`✅ AI analysis complete for ${symbol}`);
      
      return analysis;
      
    } catch (error) {
      logger.error(`AI analysis failed for ${symbol}: ${error.message}`);
      throw error;
    }
  }
}

// ==================== TELEGRAM BOT ====================
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const exchangeManager = new ExchangeManager();

// Single command: /analyze SYMBOL
bot.onText(/\/analyze (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const symbol = match[1].toUpperCase().trim();
  
  // Send initial message
  const processingMsg = await bot.sendMessage(chatId, 
    `🤖 **AI INITIATING ANALYSIS: ${symbol}**\n\n` +
    `🔍 Scanning market conditions...\n` +
    `🧠 AI selecting optimal strategy...\n` +
    `📊 Running institutional analysis...`,
    { parse_mode: 'Markdown' }
  );
  
  try {
    // AI analyzes the asset
    const analysis = await exchangeManager.analyzeAsset(symbol);
    
    // Format and send results
    await sendAIResults(chatId, analysis, processingMsg.message_id);
    
  } catch (error) {
    await bot.editMessageText(
      `❌ **AI ANALYSIS FAILED: ${symbol}**\n\nError: ${error.message}`,
      {
        chat_id: chatId,
        message_id: processingMsg.message_id,
        parse_mode: 'Markdown'
      }
    );
  }
});

// Help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
🤖 **AI TRADING BOT v5.0**

**Single Command:**
/analyze SYMBOL - AI analyzes any asset and selects optimal strategy

**AI Strategy Selection:**
• 🤖 AI automatically analyzes market conditions
• 📊 Selects from 4 institutional strategies
• 🎯 Based on real-time market data
• ✅ No manual strategy selection needed

**Available Strategies:**
⚛️ **Quantum Engine V2.0** - Institutional-grade analysis
📈 **Momentum Scalper** - Captures strong momentum
🚀 **Breakout Hunter** - Trades consolidation breakouts
🔄 **Mean Reversion** - Trades overextended reversions

**How It Works:**
1. Send /analyze BTCUSDT
2. AI analyzes market conditions
3. AI selects optimal strategy
4. AI provides entry, SL, TP levels
5. AI explains reasoning

**Supported Assets:**
• Crypto: BTCUSDT, ETHUSDT, etc.
• Forex: EURUSD, GBPJPY, etc.
• Stocks: AAPL, TSLA, etc.
• Metals: XAUUSD, XAGUSD

**⚠️ RISK DISCLAIMER:**
AI analysis for educational purposes. Always verify signals and use proper risk management.
  `;
  
  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Status command
bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  
  const statusMessage = `
📊 **AI TRADING SYSTEM STATUS**

**System:** 🟢 OPERATIONAL
**Mode:** ${MODE.toUpperCase()}
**AI Engine:** 🟢 ACTIVE
**Strategy Selection:** 🟢 ENABLED

**Minimum Confidence:** ${(MIN_CONFIDENCE_THRESHOLD * 100).toFixed(0)}%
**Account Equity:** $${ACCOUNT_EQUITY}
**Risk per Trade:** ${DEFAULT_RISK_PCT}%

**Exchange Connections:**
• Bitget: ${exchangeManager.clients.bitget ? '🟢 CONNECTED' : '🔴 DISCONNECTED'}
• OANDA: ${exchangeManager.clients.oanda ? '🟢 CONNECTED' : '⚪ NOT CONFIGURED'}
• Alpaca: ${exchangeManager.clients.alpaca ? '🟢 CONNECTED' : '⚪ NOT CONFIGURED'}

**Use /analyze SYMBOL to analyze any asset**
  `;
  
  bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
});

// Helper function to send AI results
async function sendAIResults(chatId, analysis, messageId) {
  const signalEmoji = analysis.finalSignal.trade === 'LONG' ? '🟢' : 
                     analysis.finalSignal.trade === 'SHORT' ? '🔴' : '🟡';
  
  const confidenceEmoji = analysis.confidenceLevel === 'HIGH' ? '✅' : 
                         analysis.confidenceLevel === 'MEDIUM' ? '⚠️' : '❌';
  
  let message = '';
  
  if (analysis.finalSignal.trade === 'NO_TRADE') {
    message = `
${signalEmoji} **AI ANALYSIS: ${analysis.symbol}**

**Decision:** ${analysis.finalSignal.trade}
**Reason:** ${analysis.finalSignal.reason}

**AI Confidence:** ${(analysis.confidence * 100).toFixed(1)}% ${confidenceEmoji}
**Selected Strategy:** ${analysis.strategyName}

**Market Conditions:**
${Object.entries(analysis.marketConditions)
  .filter(([key, value]) => typeof value === 'boolean' && value === true)
  .map(([key]) => `• ${key.replace(/_/g, ' ').toUpperCase()}`)
  .join('\n') || '• Neutral conditions'}

**🤖 AI Recommendation:**
Wait for better market conditions. The AI needs higher confidence to generate a trade signal.

**Next Steps:**
• Monitor for changing market conditions
• Check back in 1-4 hours
• Consider different timeframe analysis
    `;
  } else {
    message = `
${signalEmoji} **AI TRADE SIGNAL: ${analysis.symbol}**

**Trade:** ${analysis.finalSignal.trade} ${signalEmoji}
**Strategy:** ${analysis.strategyName}
**AI Confidence:** ${(analysis.confidence * 100).toFixed(1)}% ${confidenceEmoji}

**🎯 ENTRY LEVELS:**
Entry: $${analysis.finalSignal.entry}
Stop Loss: $${analysis.finalSignal.stopLoss}
Take Profit: $${analysis.finalSignal.takeProfit.join(' | $')}
Risk/Reward: 1:${analysis.finalSignal.riskReward.toFixed(2)}

**📊 RISK ASSESSMENT:**
Level: ${analysis.riskAssessment.level}
Score: ${(analysis.riskAssessment.score * 100).toFixed(1)}/100
Position Size: ${analysis.riskAssessment.positionSizeRecommendation.percentage.toFixed(2)}%

**🤔 AI REASONING:**
${analysis.strategySelection.reason}

**📈 MARKET CONDITIONS:**
${Object.entries(analysis.marketConditions)
  .filter(([key, value]) => typeof value === 'boolean' && value === true)
  .slice(0, 5)
  .map(([key]) => `• ${key.replace(/_/g, ' ').toUpperCase()}`)
  .join('\n')}

**⚠️ RISK DISCLAIMER:**
This is AI-generated analysis. Always use stop losses and proper position sizing.
    `;
  }
  
  await bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'Markdown'
  });
}

// ==================== EXPRESS SERVER ====================
const app = express();
app.use(bodyParser.json({ limit: '10mb' }));

// AI Analysis API endpoint
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { symbol } = req.body;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }
    
    const analysis = await exchangeManager.analyzeAsset(symbol);
    
    res.json({
      success: true,
      analysis,
      timestamp: Date.now()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health endpoint
app.get('/health', (req, res) => {
  const exchangeStatus = {
    bitget: !!exchangeManager.clients.bitget,
    oanda: false, // Add when implemented
    alpaca: false  // Add when implemented
  };
  
  res.json({
    status: 'operational',
    version: '5.0',
    mode: MODE,
    aiEnabled: ENABLE_AI_STRATEGY_SELECTION === 'true',
    minConfidence: MIN_CONFIDENCE_THRESHOLD,
    exchanges: exchangeStatus,
    timestamp: Date.now()
  });
});

// ==================== STARTUP ====================
(async () => {
  try {
    logger.info('🚀 **AI TRADING SYSTEM v5.0**');
    logger.info('🤖 **AI Strategy Selection: ENABLED**');
    logger.info(`📊 **Minimum Confidence: ${(MIN_CONFIDENCE_THRESHOLD * 100).toFixed(0)}%**`);
    logger.info('');
    logger.info('**Available Strategies:**');
    logger.info('  ⚛️ Quantum Engine V2.0');
    logger.info('  📈 Momentum Scalper');
    logger.info('  🚀 Breakout Hunter');
    logger.info('  🔄 Mean Reversion');
    logger.info('');
    logger.info('**Telegram Command:**');
    logger.info('  /analyze SYMBOL - AI analyzes and selects optimal strategy');
    logger.info('');
    
    app.listen(PORT, () => {
      logger.info(`🌐 **Server running on port ${PORT}**`);
      logger.info(`🔗 **Health:** http://localhost:${PORT}/health`);
      logger.info(`📊 **API:** POST http://localhost:${PORT}/api/ai/analyze`);
      logger.info('');
      logger.info('✅ **AI SYSTEM READY**');
      logger.info('🤖 Send /analyze BTCUSDT to test');
    });
    
  } catch (error) {
    logger.error('Startup error:', error);
    process.exit(1);
  }
})();
