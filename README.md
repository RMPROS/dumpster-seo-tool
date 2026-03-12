# 🗑️ Dumpster SEO Revenue Projector

A full-stack Next.js tool that researches dumpster rental companies and generates customized SEO revenue projection spreadsheets.

## What It Does

1. **Researches a company's GMB/search presence** — looks up business data, reviews, and estimated rankings for "dumpster rental [city]" and "dumpster rental [company location]"

2. **Fetches population data** — pulls from US Census Bureau API to get:
   - The company's city population
   - 10 surrounding cities' populations
   - The primary county population
   - 5 surrounding counties' populations

3. **Calculates search ratios** — computes searches per 1,000 people using national "dumpster rental" search volume benchmarks (~550,000/month)

4. **Analyzes city vs county perspective** — scores which geographic targeting level is better for SEO strategy

5. **Generates a custom Excel workbook** with 7 sheets:
   - 🏆 Summary Dashboard
   - 📋 Client Inputs (pre-populated with research)
   - 🗺️ Market Research (city & county populations, perspective analysis)
   - 🔍 SEO Model (current vs target revenue calculations)
   - 🏙️ Multi-City (all cities with individual projections)
   - 📅 Phased Projections (6-month ramp-up timeline)
   - 📊 CTR Tables (benchmark reference)

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript
- **Styling**: Tailwind CSS + custom CSS
- **Excel**: ExcelJS
- **Population Data**: US Census Bureau ACS5 API (free, no key needed)
- **Rankings**: SerpAPI (optional, for live SERP data)
- **GMB Data**: Google Places API (optional, for live business data)
- **Deploy**: Vercel

## Quick Start

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/dumpster-seo-projector.git
cd dumpster-seo-projector

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys (optional)

# Run development server
npm run dev

# Open http://localhost:3000
```

## Deploy to Vercel

### Option 1: One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/dumpster-seo-projector)

### Option 2: Manual Deploy
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# Settings → Environment Variables
```

### Environment Variables on Vercel

| Variable | Required | Description |
|----------|----------|-------------|
| `SERPER_API_KEY` | Optional | serper.dev key for live ranking data (2,500/mo free) |
| `GOOGLE_PLACES_API_KEY` | Optional | Google Places API (New) for live GMB data |

**Note**: The tool works without any API keys using Census Bureau data + manual ranking inputs.

## Getting API Keys

### Serper (Live Rankings)
1. Go to https://serper.dev
2. Sign up — free tier gives **2,500 searches/month**
3. Copy your API key from the dashboard
4. Add to Vercel env vars as `SERPER_API_KEY`

### Google Places API — New (GMB Data)
1. Go to https://console.cloud.google.com
2. Create or select a project
3. Enable **"Places API (New)"** — must be the new version, not the legacy Places API
4. Create credentials → API key
5. (Recommended) Restrict the key to "Places API (New)" only
6. Add to Vercel env vars as `GOOGLE_PLACES_API_KEY`

## How Rankings Are Determined

Without API keys, the tool:
- Uses manual rank inputs you enter in the UI
- Falls back to position #3 for GMB and #7 for organic (typical for unoptimized businesses)

With SerpAPI:
- Performs live Google searches for "dumpster rental [city]"
- Checks local pack (map pack) results for the business name
- Checks organic results for the business name/website

## Search Volume Methodology

The tool uses a **searches per 1,000 people** ratio approach:

1. **National baseline**: "dumpster rental" = ~550,000 searches/month nationally
2. **Rate calculation**: 550,000 / 335,000,000 (US population) × 1,000 = **1.64 searches per 1,000 people**
3. **Local estimate**: `(local_population / 1,000) × 1.64 = estimated monthly local searches`

This allows fair comparison across markets of different sizes.

## City vs County Perspective Analysis

The tool scores both perspectives (0–100) based on:

| Factor | City Score | County Score |
|--------|-----------|-------------|
| Avg population < 100k | +15 | — |
| 8+ cities available | +10 | — |
| Avg county pop > 200k | — | +15 |
| ≤ 6 counties | — | +10 |
| Dumpster search behavior | +10 | — |

**Why cities win for dumpster rental**: Customers search "dumpster rental Austin" not "dumpster rental Travis County" — city-level keywords match actual search intent.

## CTR Benchmarks Used

| Channel | Position | CTR |
|---------|----------|-----|
| Google Local Pack | #1 | 17.6% |
| Google Local Pack | #2 | 15.4% |
| Google Local Pack | #3 | 15.1% |
| Organic | #1 | 39.8% |
| Organic | #2 | 18.7% |
| Organic | #3 | 10.2% |
| Organic | #4 | 7.2% |
| Organic | #5 | 5.1% |

**Source**: First Page Sage 2026

## Revenue Calculation Formula

```
Monthly Searches × 44% (Local Pack share) × GMB CTR × GMB Conv Rate × Close Rate × Avg Order = GMB Revenue
Monthly Searches × 29% (Organic share) × Organic CTR × Web Conv Rate × Close Rate × Avg Order = Organic Revenue
Total Revenue = GMB Revenue + Organic Revenue
```

## Project Structure

```
dumpster-seo-projector/
├── pages/
│   ├── index.tsx          # Main UI (input → research → review → download)
│   ├── _app.tsx           # App wrapper
│   └── api/
│       ├── research.ts    # Research endpoint (Census, Places, SERP)
│       └── generate-excel.ts  # Excel generation endpoint
├── lib/
│   ├── research.ts        # Core research logic & calculations
│   └── excelGenerator.ts  # Excel workbook builder (7 sheets)
├── styles/
│   └── globals.css        # Dark theme design system
├── .env.example           # Environment variable template
├── vercel.json            # Vercel deployment config
└── README.md
```

## Data Sources

- **Population**: [US Census Bureau ACS 2022](https://api.census.gov) (free, no key)
- **CTR benchmarks**: [First Page Sage 2026](https://firstpagesage.com)
- **Local search share**: [Red Local Agency 2025](https://redlocal.agency)
- **Search volume**: Google Keyword Planner estimates
- **Timeline data**: Ahrefs, Neil Patel, Hennessey Digital

## License

MIT — free to use and modify.
