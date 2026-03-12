// lib/research.ts
// Core research engine for dumpster rental SEO analysis

export interface GmbData {
  businessName: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  website: string;
  rating: number;
  reviewCount: number;
  categories: string[];
  placeId?: string;
  googleMapsUrl?: string;
  businessStatus?: string;
}

export interface RankingData {
  keyword: string;
  gmbRank: number | null;
  mapPackRank: number | null;
  organicRank: number | null;
  localPackPresent: boolean;
}

export interface PopulationArea {
  name: string;
  type: 'city' | 'county';
  population: number;
  state: string;
  distanceFromCenter?: number;
}

export interface SearchVolumeData {
  keyword: string;
  nationalMonthlyVolume: number;
  searchesPer1000: number;
  localEstimate: number;
}

export interface ResearchResult {
  company: GmbData;
  rankings: RankingData[];
  primaryCity: PopulationArea;
  nearbyCities: PopulationArea[];
  primaryCounty: PopulationArea;
  nearbyCounties: PopulationArea[];
  searchVolume: SearchVolumeData[];
  perspective: 'city' | 'county' | 'both';
  cityPerspectiveScore: number;
  countyPerspectiveScore: number;
  perspectiveRationale: string;
  totalServiceAreaPop: number;
  searchRatePer1000: number;
  researchedAt: string;
}

// CTR lookup tables from research report
export const GMB_CTR: Record<number, number> = {
  1: 0.176,
  2: 0.154,
  3: 0.151,
};

export const ORGANIC_CTR: Record<number, number> = {
  1: 0.398,
  2: 0.187,
  3: 0.102,
  4: 0.072,
  5: 0.051,
  6: 0.040,
  7: 0.030,
  8: 0.020,
  9: 0.015,
  10: 0.010,
};

export const LOCAL_PACK_SHARE = 0.44;
export const ORGANIC_SHARE = 0.29;
export const NATIONAL_MONTHLY_SEARCHES_DUMPSTER = 550000; // "dumpster rental" national volume

export function getGmbCtr(rank: number | null): number {
  if (!rank || rank > 3) return 0;
  return GMB_CTR[rank] || 0;
}

export function getOrganicCtr(rank: number | null): number {
  if (!rank || rank > 10) return 0;
  return ORGANIC_CTR[rank] || 0;
}

export function calculateSearchesPer1000(
  nationalVolume: number,
  usPopulation: number = 335000000
): number {
  return (nationalVolume / usPopulation) * 1000;
}

export function estimateLocalSearches(
  population: number,
  searchesPer1000: number
): number {
  return Math.round((population / 1000) * searchesPer1000);
}

export function calculateRevenue(
  clicks: number,
  conversionRate: number,
  closeRate: number,
  avgOrderValue: number
): number {
  return clicks * conversionRate * closeRate * avgOrderValue;
}

export function analyzePerspective(
  cityData: { name: string; totalPop: number; cities: PopulationArea[] },
  countyData: { name: string; totalPop: number; counties: PopulationArea[] },
  businessType: string = 'dumpster rental'
): { recommendation: 'city' | 'county'; cityScore: number; countyScore: number; rationale: string } {
  // Scoring factors:
  // 1. Population density (cities = more dense targeting)
  // 2. Geographic spread (counties = broader coverage)
  // 3. Competition level proxy (larger population = more competition)
  
  const cityAvgPop = cityData.totalPop / cityData.cities.length;
  const countyAvgPop = countyData.totalPop / countyData.counties.length;
  
  let cityScore = 50;
  let countyScore = 50;
  
  // City perspective benefits: more precise targeting, lower competition per keyword
  if (cityAvgPop < 100000) cityScore += 15; // smaller cities = less competitive
  if (cityData.cities.length >= 8) cityScore += 10; // many cities = good coverage
  if (cityData.totalPop > 500000) cityScore += 5;
  
  // County perspective benefits: broader coverage, simpler strategy
  if (countyAvgPop > 200000) countyScore += 15; // larger counties = more search volume
  if (countyData.counties.length <= 6) countyScore += 10; // fewer counties = manageable
  if (countyData.totalPop > 1000000) countyScore += 5;
  
  // Dumpster rental specifics: people search by city ("dumpster rental Austin")
  // so city-level targeting is typically more effective
  cityScore += 10;
  
  const recommendation = cityScore >= countyScore ? 'city' : 'county';
  
  const rationale = recommendation === 'city'
    ? `City-level targeting recommended: Customers typically search "${businessType} [city name]", making city-specific keywords more valuable. With ${cityData.cities.length} cities averaging ${Math.round(cityAvgPop).toLocaleString()} residents each, city targeting provides precise coverage with manageable competition.`
    : `County-level targeting recommended: Larger county populations (avg ${Math.round(countyAvgPop).toLocaleString()}) provide higher search volume per keyword. Fewer counties to manage (${countyData.counties.length}) allows deeper optimization per area.`;
  
  return { recommendation, cityScore, countyScore, rationale };
}

export function buildProjectionData(
  result: ResearchResult,
  conversionRate: number = 0.08,
  gmbConversionRate: number = 0.20,
  closeRate: number = 0.60,
  avgOrderValue: number = 450
) {
  const useArea = result.perspective === 'county' 
    ? result.primaryCounty 
    : result.primaryCity;
  
  const totalPop = result.totalServiceAreaPop;
  const searchesPer1000 = result.searchRatePer1000;
  const monthlySearches = estimateLocalSearches(totalPop, searchesPer1000);
  
  const gmb = result.rankings.find(r => r.gmbRank !== null);
  const organic = result.rankings.find(r => r.organicRank !== null);
  
  const currentGmbRank = gmb?.gmbRank || 3;
  const currentOrgRank = organic?.organicRank || 7;
  const targetGmbRank = 1;
  const targetOrgRank = 1;
  
  const gmbClickPool = monthlySearches * LOCAL_PACK_SHARE;
  const orgClickPool = monthlySearches * ORGANIC_SHARE;
  
  const currentGmbClicks = gmbClickPool * getGmbCtr(currentGmbRank);
  const currentOrgClicks = orgClickPool * getOrganicCtr(currentOrgRank);
  const targetGmbClicks = gmbClickPool * getGmbCtr(targetGmbRank);
  const targetOrgClicks = orgClickPool * getOrganicCtr(targetOrgRank);
  
  const currentGmbRevenue = calculateRevenue(currentGmbClicks, gmbConversionRate, closeRate, avgOrderValue);
  const currentOrgRevenue = calculateRevenue(currentOrgClicks, conversionRate, closeRate, avgOrderValue);
  const targetGmbRevenue = calculateRevenue(targetGmbClicks, gmbConversionRate, closeRate, avgOrderValue);
  const targetOrgRevenue = calculateRevenue(targetOrgClicks, conversionRate, closeRate, avgOrderValue);
  
  return {
    population: totalPop,
    searchesPer1000,
    monthlySearches,
    currentGmbRank,
    currentOrgRank,
    targetGmbRank,
    targetOrgRank,
    currentGmbClicks: Math.round(currentGmbClicks),
    currentOrgClicks: Math.round(currentOrgClicks),
    targetGmbClicks: Math.round(targetGmbClicks),
    targetOrgClicks: Math.round(targetOrgClicks),
    currentMonthlyRevenue: Math.round(currentGmbRevenue + currentOrgRevenue),
    targetMonthlyRevenue: Math.round(targetGmbRevenue + targetOrgRevenue),
    currentAnnualRevenue: Math.round((currentGmbRevenue + currentOrgRevenue) * 12),
    targetAnnualRevenue: Math.round((targetGmbRevenue + targetOrgRevenue) * 12),
    annualIncrease: Math.round((targetGmbRevenue + targetOrgRevenue - currentGmbRevenue - currentOrgRevenue) * 12),
    conversionRate,
    gmbConversionRate,
    closeRate,
    avgOrderValue,
  };
}

// Phased revenue projections
export function buildPhasedProjections(targetMonthlyRevenue: number, currentMonthlyRevenue: number) {
  const incremental = targetMonthlyRevenue - currentMonthlyRevenue;
  const ramps = [0.05, 0.10, 0.375, 0.50, 0.875, 1.0];
  const labels = ['Month 1\nEarly Signs\n(5%)', 'Month 2\nEarly Signs\n(10%)', 'Month 3\nNoticeable\n(37.5%)', 'Month 4\nNoticeable\n(50%)', 'Month 5\nMeaningful\n(87.5%)', 'Month 6\nFull Target\n(100%)'];
  
  let cumulative = 0;
  return ramps.map((ramp, i) => {
    const monthly = Math.round(currentMonthlyRevenue + incremental * ramp);
    cumulative += monthly;
    return { label: labels[i], ramp, monthly, cumulative };
  });
}
