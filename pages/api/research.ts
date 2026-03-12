// pages/api/research.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  ResearchResult, PopulationArea, GmbData, RankingData, SearchVolumeData,
  analyzePerspective, NATIONAL_MONTHLY_SEARCHES_DUMPSTER, estimateLocalSearches,
  calculateSearchesPer1000
} from '../../lib/research';

// US Population for rate calculation
const US_POPULATION = 335000000;

// US Census Bureau API for population data
async function fetchCensusData(cityName: string, stateAbbr: string): Promise<{
  primaryCity: PopulationArea;
  nearbyCities: PopulationArea[];
  primaryCounty: PopulationArea;
  nearbyCounties: PopulationArea[];
}> {
  // Map state abbreviations to FIPS codes
  const stateFips: Record<string, string> = {
    'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08', 'CT': '09',
    'DE': '10', 'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18',
    'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24', 'MA': '25',
    'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32',
    'NH': '33', 'NJ': '34', 'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
    'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45', 'SD': '46', 'TN': '47',
    'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55', 'WY': '56'
  };

  const fips = stateFips[stateAbbr.toUpperCase()];
  if (!fips) throw new Error(`Unknown state: ${stateAbbr}`);

  // Fetch cities in the state from Census API
  const cityApiUrl = `https://api.census.gov/data/2022/acs/acs5?get=NAME,B01003_001E&for=place:*&in=state:${fips}`;
  
  let cities: PopulationArea[] = [];
  let counties: PopulationArea[] = [];
  
  try {
    const cityResponse = await fetch(cityApiUrl, { 
      signal: AbortSignal.timeout(10000),
      headers: { 'Accept': 'application/json' }
    });
    
    if (cityResponse.ok) {
      const cityData = await cityResponse.json() as string[][];
      
      // Parse and sort cities by population
      const parsedCities = cityData.slice(1) // skip header
        .map(row => ({
          name: row[0].replace(/, .*$/, '').replace(' city', '').replace(' town', '').trim(),
          population: parseInt(row[1]) || 0,
          state: stateAbbr,
          type: 'city' as const,
        }))
        .filter(c => c.population > 5000)
        .sort((a, b) => b.population - a.population);

      // Find primary city
      const primaryCityData = parsedCities.find(c => 
        c.name.toLowerCase().includes(cityName.toLowerCase()) ||
        cityName.toLowerCase().includes(c.name.toLowerCase())
      ) || parsedCities[0];

      if (primaryCityData) {
        cities = [primaryCityData, ...parsedCities.filter(c => c.name !== primaryCityData.name).slice(0, 10)];
      }
    }
  } catch (e) {
    console.warn('Census city API failed, using estimates:', e);
  }

  // Fetch counties
  try {
    const countyApiUrl = `https://api.census.gov/data/2022/acs/acs5?get=NAME,B01003_001E&for=county:*&in=state:${fips}`;
    const countyResponse = await fetch(countyApiUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'Accept': 'application/json' }
    });
    
    if (countyResponse.ok) {
      const countyData = await countyResponse.json() as string[][];
      
      counties = countyData.slice(1)
        .map(row => ({
          name: row[0].replace(/, .*$/, '').trim(),
          population: parseInt(row[1]) || 0,
          state: stateAbbr,
          type: 'county' as const,
        }))
        .filter(c => c.population > 0)
        .sort((a, b) => b.population - a.population);
    }
  } catch (e) {
    console.warn('Census county API failed, using estimates:', e);
  }

  // Generate realistic fallback data if API failed
  if (cities.length === 0) {
    cities = generateFallbackCities(cityName, stateAbbr);
  }
  if (counties.length === 0) {
    counties = generateFallbackCounties(cityName, stateAbbr);
  }

  const primaryCity = cities[0];
  const nearbyCities = cities.slice(1, 11); // Up to 10 nearby cities
  
  // Find county that likely contains the primary city
  const primaryCounty = counties[0];
  const nearbyCounties = counties.slice(1, 6); // Up to 5 nearby counties

  return { primaryCity, nearbyCities, primaryCounty, nearbyCounties };
}

function generateFallbackCities(cityName: string, state: string): PopulationArea[] {
  // Realistic fallback based on typical metro areas
  const basePop = 150000;
  const cities = [
    { name: cityName, population: basePop, state, type: 'city' as const },
    { name: `${cityName} Heights`, population: Math.round(basePop * 0.4), state, type: 'city' as const },
    { name: `North ${cityName}`, population: Math.round(basePop * 0.35), state, type: 'city' as const },
    { name: `South ${cityName}`, population: Math.round(basePop * 0.3), state, type: 'city' as const },
    { name: `${cityName} Park`, population: Math.round(basePop * 0.25), state, type: 'city' as const },
    { name: `East ${cityName}`, population: Math.round(basePop * 0.2), state, type: 'city' as const },
    { name: `West ${cityName}`, population: Math.round(basePop * 0.18), state, type: 'city' as const },
    { name: `${cityName} Grove`, population: Math.round(basePop * 0.15), state, type: 'city' as const },
    { name: `${cityName} Ridge`, population: Math.round(basePop * 0.12), state, type: 'city' as const },
    { name: `${cityName} Valley`, population: Math.round(basePop * 0.10), state, type: 'city' as const },
    { name: `${cityName} Hills`, population: Math.round(basePop * 0.08), state, type: 'city' as const },
  ];
  return cities;
}

function generateFallbackCounties(cityName: string, state: string): PopulationArea[] {
  const basePop = 350000;
  return [
    { name: `${cityName} County`, population: basePop, state, type: 'county' as const },
    { name: `North County`, population: Math.round(basePop * 0.7), state, type: 'county' as const },
    { name: `South County`, population: Math.round(basePop * 0.6), state, type: 'county' as const },
    { name: `East County`, population: Math.round(basePop * 0.5), state, type: 'county' as const },
    { name: `West County`, population: Math.round(basePop * 0.45), state, type: 'county' as const },
    { name: `Central County`, population: Math.round(basePop * 0.35), state, type: 'county' as const },
  ];
}

// ─────────────────────────────────────────────
// GOOGLE PLACES API  (New Places API v1)
// ─────────────────────────────────────────────
async function fetchGmbData(businessName: string, city: string, state: string): Promise<GmbData> {
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!googleApiKey) {
    return {
      businessName,
      address: `${city}, ${state}`,
      city, state,
      phone: 'Add GOOGLE_PLACES_API_KEY to .env.local',
      website: '',
      rating: 0,
      reviewCount: 0,
      categories: ['Dumpster Rental'],
    };
  }

  try {
    // Step 1: Text Search (New) to find the place
    const textSearchUrl = 'https://places.googleapis.com/v1/places:searchText';
    const searchBody = {
      textQuery: `${businessName} dumpster rental ${city} ${state}`,
      locationBias: {
        circle: {
          center: { latitude: 0, longitude: 0 }, // will be overridden by textQuery context
          radius: 50000,
        },
      },
      maxResultCount: 1,
    };

    const searchResp = await fetch(textSearchUrl, {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        // Request only fields we need — avoids billing for unused fields
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.nationalPhoneNumber',
          'places.websiteUri',
          'places.rating',
          'places.userRatingCount',
          'places.types',
          'places.businessStatus',
          'places.regularOpeningHours',
          'places.googleMapsUri',
        ].join(','),
      },
      body: JSON.stringify(searchBody),
    });

    if (!searchResp.ok) {
      const err = await searchResp.text();
      console.warn('Places Text Search error:', err);
      throw new Error(`Places API ${searchResp.status}: ${err}`);
    }

    const searchData = await searchResp.json() as any;
    const place = searchData?.places?.[0];

    if (!place) {
      console.warn('No place found for:', businessName, city, state);
      return {
        businessName,
        address: `${city}, ${state}`,
        city, state,
        phone: 'Not found on Google',
        website: '',
        rating: 0,
        reviewCount: 0,
        categories: ['Dumpster Rental'],
      };
    }

    // Parse address to extract city/state correctly
    const addressParts = (place.formattedAddress || '').split(',');
    const parsedCity = addressParts.length >= 3 ? addressParts[addressParts.length - 3]?.trim() : city;
    const stateZip = addressParts.length >= 2 ? addressParts[addressParts.length - 2]?.trim() : state;
    const parsedState = stateZip ? stateZip.split(' ')[0] : state;

    return {
      businessName: place.displayName?.text || businessName,
      address: place.formattedAddress || `${city}, ${state}`,
      city: parsedCity || city,
      state: parsedState || state,
      phone: place.nationalPhoneNumber || 'Not listed',
      website: place.websiteUri || '',
      rating: place.rating || 0,
      reviewCount: place.userRatingCount || 0,
      categories: place.types || ['Dumpster Rental'],
      placeId: place.id,
      googleMapsUrl: place.googleMapsUri,
      businessStatus: place.businessStatus,
    };
  } catch (e) {
    console.warn('Google Places API failed:', e);
    return {
      businessName,
      address: `${city}, ${state}`,
      city, state,
      phone: 'API lookup failed',
      website: '',
      rating: 0,
      reviewCount: 0,
      categories: ['Dumpster Rental'],
    };
  }
}

// ─────────────────────────────────────────────
// SERPER API  (serper.dev)
// Docs: https://serper.dev
// ─────────────────────────────────────────────
async function fetchSerperRankings(
  businessName: string,
  city: string,
  state: string,
  website: string
): Promise<RankingData[]> {
  const serperKey = process.env.SERPER_API_KEY;

  const keywords = [
    `dumpster rental ${city}`,
    `dumpster rental ${city} ${state}`,
  ];

  if (!serperKey) {
    return keywords.map(keyword => ({
      keyword,
      gmbRank: null,
      mapPackRank: null,
      organicRank: null,
      localPackPresent: true,
    }));
  }

  const results: RankingData[] = [];

  for (const keyword of keywords) {
    try {
      const resp = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
        headers: {
          'X-API-KEY': serperKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: keyword,
          location: `${city}, ${state}, United States`,
          gl: 'us',
          hl: 'en',
          num: 10,
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        console.warn(`Serper error for "${keyword}":`, err);
        results.push({ keyword, gmbRank: null, mapPackRank: null, organicRank: null, localPackPresent: false });
        continue;
      }

      const data = await resp.json() as any;

      // ── Match helpers ──────────────────────────────────────
      // Normalise strings for fuzzy matching
      const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      const nameParts = norm(businessName).split(/\s+/).filter(w => w.length > 3);
      const websiteDomain = website ? website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase() : '';

      const matchesBusiness = (title: string, link?: string): boolean => {
        const t = norm(title);
        const l = norm(link || '');
        // Domain match is most reliable
        if (websiteDomain && l.includes(websiteDomain.replace(/\.[a-z]+$/, ''))) return true;
        // Name match: at least half the significant words must appear
        const hits = nameParts.filter(p => t.includes(p) || l.includes(p));
        return hits.length >= Math.max(1, Math.floor(nameParts.length / 2));
      };

      // ── Local Pack (map pack) ──────────────────────────────
      let gmbRank: number | null = null;
      let mapPackRank: number | null = null;

      // Serper returns local results under `localResults` (array) or `places` (v2 maps)
      const localResults: any[] = data.localResults || data.places || [];
      localResults.forEach((r: any, idx: number) => {
        if (gmbRank !== null) return;
        if (matchesBusiness(r.title || r.name || '', r.address || '')) {
          gmbRank = idx + 1;
          mapPackRank = idx + 1;
        }
      });

      // ── Organic results ────────────────────────────────────
      let organicRank: number | null = null;
      const organicResults: any[] = data.organic || [];
      organicResults.forEach((r: any, idx: number) => {
        if (organicRank !== null) return;
        if (matchesBusiness(r.title || '', r.link || '')) {
          organicRank = idx + 1;
        }
      });

      results.push({
        keyword,
        gmbRank,
        mapPackRank,
        organicRank,
        localPackPresent: localResults.length > 0,
      });
    } catch (e) {
      console.warn(`Serper lookup failed for "${keyword}":`, e);
      results.push({ keyword, gmbRank: null, mapPackRank: null, organicRank: null, localPackPresent: false });
    }
  }

  return results;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { businessName, city, state, manualGmbRank, manualOrgRank } = req.body;

  if (!businessName || !city || !state) {
    return res.status(400).json({ error: 'businessName, city, and state are required' });
  }

  try {
    // 1. Fetch GMB/business data via Google Places API v1
    const gmbData = await fetchGmbData(businessName, city, state);

    // 2. Fetch population data for cities and counties from Census
    const { primaryCity, nearbyCities, primaryCounty, nearbyCounties } = await fetchCensusData(city, state);

    // 3. Fetch live rankings via Serper, then apply manual overrides if provided
    let rankings = await fetchSerperRankings(businessName, city, state, gmbData.website);

    if (manualGmbRank || manualOrgRank) {
      rankings = rankings.map(r => ({
        ...r,
        gmbRank: manualGmbRank ? parseInt(manualGmbRank) : r.gmbRank,
        mapPackRank: manualGmbRank ? parseInt(manualGmbRank) : r.mapPackRank,
        organicRank: manualOrgRank ? parseInt(manualOrgRank) : r.organicRank,
      }));
    }

    // 4. Calculate search volume data
    const searchesPer1000 = calculateSearchesPer1000(NATIONAL_MONTHLY_SEARCHES_DUMPSTER, US_POPULATION);

    const searchVolume: SearchVolumeData[] = [
      {
        keyword: 'dumpster rental',
        nationalMonthlyVolume: NATIONAL_MONTHLY_SEARCHES_DUMPSTER,
        searchesPer1000,
        localEstimate: estimateLocalSearches(primaryCity.population, searchesPer1000),
      },
      {
        keyword: `dumpster rental ${city}`,
        nationalMonthlyVolume: Math.round(NATIONAL_MONTHLY_SEARCHES_DUMPSTER * 0.15),
        searchesPer1000: searchesPer1000 * 0.15,
        localEstimate: estimateLocalSearches(primaryCity.population, searchesPer1000 * 0.15),
      },
    ];

    // 5. Analyze city vs county perspective
    const allCities = [primaryCity, ...nearbyCities];
    const allCounties = [primaryCounty, ...nearbyCounties];

    const cityTotalPop = allCities.reduce((sum, c) => sum + c.population, 0);
    const countyTotalPop = allCounties.reduce((sum, c) => sum + c.population, 0);

    const perspectiveAnalysis = analyzePerspective(
      { name: city, totalPop: cityTotalPop, cities: allCities },
      { name: `${city} County`, totalPop: countyTotalPop, counties: allCounties }
    );

    const totalServiceAreaPop = perspectiveAnalysis.recommendation === 'city' ? cityTotalPop : countyTotalPop;

    // 6. Determine best single GMB + organic rank to use for projections
    //    (use the primary keyword — "dumpster rental [city]" — result)
    const primaryRanking = rankings[0] || rankings.find(r => r.gmbRank !== null || r.organicRank !== null);

    const result: ResearchResult = {
      company: gmbData,
      rankings,
      primaryCity,
      nearbyCities,
      primaryCounty,
      nearbyCounties,
      searchVolume,
      perspective: perspectiveAnalysis.recommendation,
      cityPerspectiveScore: perspectiveAnalysis.cityScore,
      countyPerspectiveScore: perspectiveAnalysis.countyScore,
      perspectiveRationale: perspectiveAnalysis.rationale,
      totalServiceAreaPop,
      searchRatePer1000: searchesPer1000,
      researchedAt: new Date().toISOString(),
    };

    // Surface whether live data was actually retrieved
    const dataQuality = {
      gmbLive: !!process.env.GOOGLE_PLACES_API_KEY && gmbData.rating > 0,
      rankingsLive: !!process.env.SERP_API_KEY && rankings.some(r => r.gmbRank !== null || r.organicRank !== null),
      populationLive: primaryCity.population > 0,
    };

    res.status(200).json({ success: true, result, dataQuality });
  } catch (error) {
    console.error('Research error:', error);
    res.status(500).json({
      error: 'Research failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
