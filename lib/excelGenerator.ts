// lib/excelGenerator.ts
import ExcelJS from 'exceljs';
import { ResearchResult, buildProjectionData, buildPhasedProjections, GMB_CTR, ORGANIC_CTR } from './research';

const COLORS = {
  darkBg: 'FF0A0E1A',
  surface: 'FF111827',
  surface2: 'FF1A2235',
  accent: 'FF00D4FF',
  accent2: 'FFFF6B35',
  accent3: 'FF7C3AED',
  success: 'FF10B981',
  warning: 'FFF59E0B',
  text: 'FFE2E8F0',
  textMuted: 'FF64748B',
  border: 'FF1E2D45',
  gold: 'FFFFD700',
  white: 'FFFFFFFF',
  black: 'FF000000',
  inputBlue: 'FF0000FF',
  formulaBlack: 'FF000000',
  headerGray: 'FFD9D9D9',
  yellowInput: 'FFFFFF00',
  lightBlue: 'FFDCE6F1',
  green: 'FF00B050',
};

function styleHeader(cell: ExcelJS.Cell, text: string, bgColor: string = COLORS.surface2) {
  cell.value = text;
  cell.font = { bold: true, size: 11, color: { argb: COLORS.accent }, name: 'Calibri' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = {
    bottom: { style: 'thin', color: { argb: COLORS.accent } },
  };
}

function styleTitle(cell: ExcelJS.Cell, text: string) {
  cell.value = text;
  cell.font = { bold: true, size: 16, color: { argb: COLORS.accent }, name: 'Calibri' };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
}

function styleLabel(cell: ExcelJS.Cell, text: string) {
  cell.value = text;
  cell.font = { bold: true, size: 10, color: { argb: COLORS.textMuted }, name: 'Calibri' };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
}

function styleInput(cell: ExcelJS.Cell, value: any, isYellow: boolean = true) {
  cell.value = value;
  cell.font = { size: 11, color: { argb: COLORS.inputBlue }, name: 'Calibri', bold: true };
  if (isYellow) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.yellowInput } };
  }
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
  };
}

function styleFormula(cell: ExcelJS.Cell, formula: string, numberFormat?: string) {
  cell.value = { formula };
  cell.font = { size: 11, color: { argb: COLORS.formulaBlack }, name: 'Calibri' };
  if (numberFormat) cell.numFmt = numberFormat;
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
  };
}

function styleValue(cell: ExcelJS.Cell, value: any, numberFormat?: string, color?: string) {
  cell.value = value;
  cell.font = { size: 11, color: { argb: color || COLORS.text }, name: 'Calibri' };
  if (numberFormat) cell.numFmt = numberFormat;
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}

function sectionHeader(sheet: ExcelJS.Worksheet, row: number, text: string, colSpan: number, col: number = 1) {
  const cell = sheet.getCell(row, col);
  cell.value = text;
  cell.font = { bold: true, size: 10, color: { argb: COLORS.accent }, name: 'Calibri' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1B2E' } };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
  if (colSpan > 1) {
    sheet.mergeCells(row, col, row, col + colSpan - 1);
  }
}

export async function generateExcel(result: ResearchResult, projData: ReturnType<typeof buildProjectionData>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Dumpster SEO Projector';
  wb.created = new Date();

  // ===== SHEET 1: Summary Dashboard =====
  const summary = wb.addWorksheet('🏆 Summary Dashboard');
  buildSummarySheet(summary, result, projData);

  // ===== SHEET 2: Client Inputs =====
  const inputs = wb.addWorksheet('📋 Client Inputs');
  buildClientInputsSheet(inputs, result, projData);

  // ===== SHEET 3: Market Research =====
  const market = wb.addWorksheet('🗺️ Market Research');
  buildMarketResearchSheet(market, result, projData);

  // ===== SHEET 4: SEO Model =====
  const seoModel = wb.addWorksheet('🔍 SEO Model');
  buildSeoModelSheet(seoModel, result, projData);

  // ===== SHEET 5: Multi-City =====
  const multiCity = wb.addWorksheet('🏙️ Multi-City');
  buildMultiCitySheet(multiCity, result, projData);

  // ===== SHEET 6: Phased Projections =====
  const phased = wb.addWorksheet('📅 Phased Projections');
  buildPhasedSheet(phased, result, projData);

  // ===== SHEET 7: CTR Tables =====
  const ctr = wb.addWorksheet('📊 CTR Tables');
  buildCtrSheet(ctr);

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function buildSummarySheet(sheet: ExcelJS.Worksheet, result: ResearchResult, proj: ReturnType<typeof buildProjectionData>) {
  sheet.columns = [
    { width: 4 }, { width: 35 }, { width: 20 }, { width: 20 }, { width: 25 }
  ];

  // Title
  sheet.mergeCells('B1:E1');
  const titleCell = sheet.getCell('B1');
  titleCell.value = `SEO Revenue Projection  —  ${result.company.businessName}`;
  titleCell.font = { bold: true, size: 18, color: { argb: COLORS.accent }, name: 'Calibri' };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 40;

  sheet.mergeCells('B2:E2');
  const subCell = sheet.getCell('B2');
  subCell.value = `${result.company.city}, ${result.company.state}  ·  Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  subCell.font = { size: 11, color: { argb: COLORS.textMuted }, name: 'Calibri', italic: true };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // KPI Section
  sheet.mergeCells('B4:E4');
  sectionHeader(sheet, 4, 'KEY PERFORMANCE PROJECTIONS', 4, 2);

  // Headers
  ['Metric', 'CURRENT', 'TARGET', 'INCREASE / CHANGE'].forEach((h, i) => {
    const cell = sheet.getCell(5, i + 2);
    styleHeader(cell, h, 'FF0D1B2E');
  });

  const kpis = [
    ['GMB Rank', proj.currentGmbRank, proj.targetGmbRank, `${proj.currentGmbRank} → ${proj.targetGmbRank}`],
    ['Organic Search Rank', proj.currentOrgRank, proj.targetOrgRank, `${proj.currentOrgRank} → ${proj.targetOrgRank}`],
    ['Monthly Clicks', proj.currentGmbClicks + proj.currentOrgClicks, proj.targetGmbClicks + proj.targetOrgClicks, `+${(proj.targetGmbClicks + proj.targetOrgClicks - proj.currentGmbClicks - proj.currentOrgClicks).toLocaleString()}`],
    ['Monthly Revenue', `$${proj.currentMonthlyRevenue.toLocaleString()}`, `$${proj.targetMonthlyRevenue.toLocaleString()}`, `+$${(proj.targetMonthlyRevenue - proj.currentMonthlyRevenue).toLocaleString()}`],
    ['Annual Revenue', `$${proj.currentAnnualRevenue.toLocaleString()}`, `$${proj.targetAnnualRevenue.toLocaleString()}`, `+$${proj.annualIncrease.toLocaleString()}`],
  ];

  kpis.forEach((kpi, i) => {
    const row = 6 + i;
    const [metric, current, target, change] = kpi;
    sheet.getCell(row, 2).value = metric as string;
    sheet.getCell(row, 2).font = { size: 11, name: 'Calibri', bold: true };
    sheet.getCell(row, 3).value = current;
    sheet.getCell(row, 3).font = { size: 11, name: 'Calibri', color: { argb: COLORS.textMuted } };
    sheet.getCell(row, 4).value = target;
    sheet.getCell(row, 4).font = { size: 11, name: 'Calibri', color: { argb: COLORS.success } };
    sheet.getCell(row, 5).value = change as string;
    sheet.getCell(row, 5).font = { size: 11, name: 'Calibri', color: { argb: COLORS.accent2 }, bold: true };
    sheet.getRow(row).height = 22;
  });

  // Annual Revenue increase highlight
  sheet.mergeCells('B12:E12');
  const annualCell = sheet.getCell('B12');
  annualCell.value = `PROJECTED ANNUAL REVENUE INCREASE: +$${proj.annualIncrease.toLocaleString()}`;
  annualCell.font = { bold: true, size: 20, color: { argb: COLORS.success }, name: 'Calibri' };
  annualCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2B1F' } };
  annualCell.alignment = { horizontal: 'center', vertical: 'middle' };
  annualCell.border = { top: { style: 'medium', color: { argb: COLORS.success } }, bottom: { style: 'medium', color: { argb: COLORS.success } } };
  sheet.getRow(12).height = 50;

  // Phased Revenue Ramp
  sheet.mergeCells('B14:E14');
  sectionHeader(sheet, 14, '6-MONTH PHASED REVENUE RAMP', 4, 2);

  ['Phase', 'Traffic Ramp', 'Monthly Revenue', 'Cumulative Revenue'].forEach((h, i) => {
    const cell = sheet.getCell(15, i + 2);
    styleHeader(cell, h, 'FF0D1B2E');
  });

  const phases = buildPhasedProjections(proj.targetMonthlyRevenue, proj.currentMonthlyRevenue);
  phases.forEach((phase, i) => {
    const row = 16 + i;
    const labels = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'];
    sheet.getCell(row, 2).value = labels[i];
    sheet.getCell(row, 2).font = { size: 11, name: 'Calibri' };
    sheet.getCell(row, 3).value = phase.ramp;
    sheet.getCell(row, 3).numFmt = '0%';
    sheet.getCell(row, 3).font = { size: 11, name: 'Calibri' };
    sheet.getCell(row, 4).value = phase.monthly;
    sheet.getCell(row, 4).numFmt = '$#,##0';
    sheet.getCell(row, 4).font = { size: 11, name: 'Calibri', color: { argb: COLORS.success } };
    sheet.getCell(row, 5).value = phase.cumulative;
    sheet.getCell(row, 5).numFmt = '$#,##0';
    sheet.getCell(row, 5).font = { size: 11, name: 'Calibri', bold: true };
    sheet.getRow(row).height = 20;
  });

  // Assumptions
  sheet.mergeCells('B23:E23');
  sectionHeader(sheet, 23, 'KEY ASSUMPTIONS & DATA SOURCES', 4, 2);

  const assumptions = [
    `Local 3-Pack captures 44% of local search clicks; Organic results capture 29%  (Source: Red Local Agency, 2025)`,
    `GMB CTR: Position #1 = 17.6%, #2 = 15.4%, #3 = 15.1%  (Source: First Page Sage, 2026)`,
    `Organic CTR: Position #1 = 39.8%, #2 = 18.7%, #3 = 10.2%, #4 = 7.2%, #5 = 5.1%  (Source: First Page Sage, 2026)`,
    `Timeline ramp: Months 1-2 = 5-10%, Months 3-4 = 37.5-50%, Months 5-6 = 87.5-100% of target traffic`,
    `46% of all Google searches have local intent  (Source: Hennessey Digital)`,
    `Service area: ${result.perspective === 'city' ? `${result.primaryCity.name} + ${result.nearbyCities.length} nearby cities` : `${result.primaryCounty.name} + ${result.nearbyCounties.length} nearby counties`}`,
    `Searches per 1,000 people: ${proj.searchesPer1000.toFixed(2)} (based on national "dumpster rental" volume)`,
  ];

  assumptions.forEach((a, i) => {
    sheet.mergeCells(24 + i, 2, 24 + i, 5);
    const cell = sheet.getCell(24 + i, 2);
    cell.value = a;
    cell.font = { size: 9, color: { argb: COLORS.textMuted }, name: 'Calibri', italic: true };
    sheet.getRow(24 + i).height = 16;
  });
}

function buildClientInputsSheet(sheet: ExcelJS.Worksheet, result: ResearchResult, proj: ReturnType<typeof buildProjectionData>) {
  sheet.columns = [{ width: 4 }, { width: 40 }, { width: 25 }, { width: 30 }];

  sheet.mergeCells('B1:D1');
  const title = sheet.getCell('B1');
  title.value = 'SEO & GMB Revenue Projection Calculator';
  title.font = { bold: true, size: 16, color: { argb: COLORS.accent }, name: 'Calibri' };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 36;

  sheet.mergeCells('B2:D2');
  const sub = sheet.getCell('B2');
  sub.value = `Auto-populated from research. Yellow cells are editable.`;
  sub.font = { size: 10, color: { argb: COLORS.textMuted }, name: 'Calibri', italic: true };
  sub.alignment = { horizontal: 'center' };

  // Business Info
  sectionHeader(sheet, 4, 'BUSINESS INFORMATION', 3, 2);

  const bizData = [
    ['Client / Business Name', result.company.businessName],
    ['Industry / Niche', 'Dumpster Rental'],
    ['City', `${result.company.city}, ${result.company.state}`],
    ['GMB Phone', result.company.phone],
    ['GMB Website', result.company.website],
    ['GMB Rating', result.company.rating],
    ['GMB Review Count', result.company.reviewCount],
    ['Service Area Population', proj.population],
    ['Monthly Searches per 1,000 Pop.', proj.searchesPer1000],
  ];

  bizData.forEach(([label, value], i) => {
    const row = 5 + i;
    styleLabel(sheet.getCell(row, 2), label as string);
    styleInput(sheet.getCell(row, 3), value);
    sheet.getRow(row).height = 20;
  });

  // Rankings
  sectionHeader(sheet, 15, 'CURRENT RANKINGS (Where You Are Today)', 3, 2);
  ['Metric', 'Current Rank', 'Target Rank'].forEach((h, i) => {
    styleHeader(sheet.getCell(16, i + 2), h);
  });

  const rankData = [
    ['Google Business Profile (GMB / Map Pack)', proj.currentGmbRank, proj.targetGmbRank],
    ['Organic Search (Website)', proj.currentOrgRank, proj.targetOrgRank],
  ];

  rankData.forEach(([label, current, target], i) => {
    const row = 17 + i;
    sheet.getCell(row, 2).value = label as string;
    sheet.getCell(row, 2).font = { size: 11, name: 'Calibri' };
    styleInput(sheet.getCell(row, 3), current);
    styleInput(sheet.getCell(row, 4), target);
    sheet.getRow(row).height = 20;
  });

  // Conversion inputs
  sectionHeader(sheet, 20, 'CONVERSION & SALES INPUTS', 3, 2);
  ['Metric', 'Value', 'Notes / Guidance'].forEach((h, i) => {
    styleHeader(sheet.getCell(21, i + 2), h);
  });

  const convData = [
    ['Website Conversion Rate', proj.conversionRate, '% of website visitors who become leads'],
    ['GMB Profile Conversion Rate', proj.gmbConversionRate, '% of GMB clicks who become leads'],
    ['Lead → Order Close Rate', proj.closeRate, '% of leads that convert to paying orders'],
    ['Average Sale / Order Value ($)', proj.avgOrderValue, 'Average revenue per completed order'],
  ];

  convData.forEach(([label, value, note], i) => {
    const row = 22 + i;
    sheet.getCell(row, 2).value = label as string;
    sheet.getCell(row, 2).font = { size: 11, name: 'Calibri' };
    styleInput(sheet.getCell(row, 3), value);
    sheet.getCell(row, 4).value = note as string;
    sheet.getCell(row, 4).font = { size: 9, color: { argb: COLORS.textMuted }, name: 'Calibri', italic: true };
    sheet.getRow(row).height = 20;
  });
}

function buildMarketResearchSheet(sheet: ExcelJS.Worksheet, result: ResearchResult, proj: ReturnType<typeof buildProjectionData>) {
  sheet.columns = [{ width: 4 }, { width: 32 }, { width: 16 }, { width: 16 }, { width: 20 }, { width: 18 }, { width: 16 }];

  sheet.mergeCells('B1:G1');
  const title = sheet.getCell('B1');
  title.value = `Market Research — ${result.company.businessName} — ${result.company.city}, ${result.company.state}`;
  title.font = { bold: true, size: 15, color: { argb: COLORS.accent }, name: 'Calibri' };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 36;

  // Perspective recommendation
  sheet.mergeCells('B3:G3');
  sectionHeader(sheet, 3, 'TARGETING PERSPECTIVE ANALYSIS', 6, 2);

  sheet.mergeCells('B4:G4');
  const perspCell = sheet.getCell('B4');
  perspCell.value = `✅ RECOMMENDED: ${result.perspective.toUpperCase()}-LEVEL TARGETING (City Score: ${result.cityPerspectiveScore} | County Score: ${result.countyPerspectiveScore})`;
  perspCell.font = { bold: true, size: 12, color: { argb: COLORS.success }, name: 'Calibri' };
  perspCell.alignment = { horizontal: 'center', vertical: 'middle' };
  perspCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2B1F' } };
  sheet.getRow(4).height = 28;

  sheet.mergeCells('B5:G5');
  const rationaleCell = sheet.getCell('B5');
  rationaleCell.value = result.perspectiveRationale;
  rationaleCell.font = { size: 10, color: { argb: COLORS.textMuted }, name: 'Calibri', italic: true };
  rationaleCell.alignment = { wrapText: true, vertical: 'middle' };
  sheet.getRow(5).height = 36;

  // Search volume analysis
  sectionHeader(sheet, 7, 'SEARCH VOLUME ANALYSIS', 6, 2);
  ['Keyword', 'National Volume', 'National Rate\n(/1,000 people)', 'Your Pop.', 'Est. Local\nMonthly Searches', 'Data Source'].forEach((h, i) => {
    const cell = sheet.getCell(8, i + 2);
    styleHeader(cell, h);
  });

  result.searchVolume.forEach((sv, i) => {
    const row = 9 + i;
    sheet.getCell(row, 2).value = sv.keyword;
    sheet.getCell(row, 3).value = sv.nationalMonthlyVolume;
    sheet.getCell(row, 3).numFmt = '#,##0';
    sheet.getCell(row, 4).value = sv.searchesPer1000;
    sheet.getCell(row, 4).numFmt = '0.00';
    sheet.getCell(row, 5).value = proj.population;
    sheet.getCell(row, 5).numFmt = '#,##0';
    sheet.getCell(row, 6).value = sv.localEstimate;
    sheet.getCell(row, 6).numFmt = '#,##0';
    sheet.getCell(row, 6).font = { bold: true, color: { argb: COLORS.accent }, name: 'Calibri' };
    sheet.getCell(row, 7).value = 'Google Keyword Planner / Research';
    sheet.getCell(row, 7).font = { size: 9, color: { argb: COLORS.textMuted }, name: 'Calibri', italic: true };
    sheet.getRow(row).height = 18;
  });

  // City population data
  const cityStartRow = 9 + result.searchVolume.length + 2;
  sectionHeader(sheet, cityStartRow, `CITY-LEVEL POPULATIONS (${result.primaryCity.name} + Surrounding Cities)`, 6, 2);
  ['City', 'State', 'Population', 'Type', 'Est. Monthly\nSearches', 'Include?'].forEach((h, i) => {
    const cell = sheet.getCell(cityStartRow + 1, i + 2);
    styleHeader(cell, h);
  });

  const allCities = [result.primaryCity, ...result.nearbyCities];
  allCities.forEach((city, i) => {
    const row = cityStartRow + 2 + i;
    const isFirst = i === 0;
    const searches = Math.round((city.population / 1000) * proj.searchesPer1000);
    sheet.getCell(row, 2).value = city.name;
    sheet.getCell(row, 2).font = { bold: isFirst, size: 11, name: 'Calibri', color: { argb: isFirst ? COLORS.accent : COLORS.text } };
    sheet.getCell(row, 3).value = city.state;
    sheet.getCell(row, 4).value = city.population;
    sheet.getCell(row, 4).numFmt = '#,##0';
    sheet.getCell(row, 5).value = isFirst ? 'Primary' : 'Nearby';
    sheet.getCell(row, 5).font = { size: 10, color: { argb: isFirst ? COLORS.gold : COLORS.textMuted }, name: 'Calibri' };
    sheet.getCell(row, 6).value = searches;
    sheet.getCell(row, 6).numFmt = '#,##0';
    sheet.getCell(row, 7).value = 'YES';
    sheet.getCell(row, 7).font = { bold: true, color: { argb: COLORS.success }, name: 'Calibri' };
    sheet.getRow(row).height = 18;
  });

  // County population data
  const countyStartRow = cityStartRow + 2 + allCities.length + 2;
  sectionHeader(sheet, countyStartRow, `COUNTY-LEVEL POPULATIONS (${result.primaryCounty.name} + Surrounding Counties)`, 6, 2);
  ['County', 'State', 'Population', 'Type', 'Est. Monthly\nSearches', 'Include?'].forEach((h, i) => {
    const cell = sheet.getCell(countyStartRow + 1, i + 2);
    styleHeader(cell, h);
  });

  const allCounties = [result.primaryCounty, ...result.nearbyCounties];
  allCounties.forEach((county, i) => {
    const row = countyStartRow + 2 + i;
    const isFirst = i === 0;
    const searches = Math.round((county.population / 1000) * proj.searchesPer1000);
    sheet.getCell(row, 2).value = county.name;
    sheet.getCell(row, 2).font = { bold: isFirst, size: 11, name: 'Calibri', color: { argb: isFirst ? COLORS.accent2 : COLORS.text } };
    sheet.getCell(row, 3).value = county.state;
    sheet.getCell(row, 4).value = county.population;
    sheet.getCell(row, 4).numFmt = '#,##0';
    sheet.getCell(row, 5).value = isFirst ? 'Primary' : 'Nearby';
    sheet.getCell(row, 5).font = { size: 10, color: { argb: isFirst ? COLORS.gold : COLORS.textMuted }, name: 'Calibri' };
    sheet.getCell(row, 6).value = searches;
    sheet.getCell(row, 6).numFmt = '#,##0';
    sheet.getCell(row, 7).value = 'YES';
    sheet.getCell(row, 7).font = { bold: true, color: { argb: COLORS.success }, name: 'Calibri' };
    sheet.getRow(row).height = 18;
  });

  // Rankings table
  const rankStartRow = countyStartRow + 2 + allCounties.length + 2;
  sectionHeader(sheet, rankStartRow, 'CURRENT SEARCH RANKINGS', 6, 2);
  ['Keyword', 'GMB Rank', 'Map Pack Rank', 'Organic Rank', 'GMB CTR', 'Organic CTR'].forEach((h, i) => {
    const cell = sheet.getCell(rankStartRow + 1, i + 2);
    styleHeader(cell, h);
  });

  result.rankings.forEach((rank, i) => {
    const row = rankStartRow + 2 + i;
    sheet.getCell(row, 2).value = rank.keyword;
    sheet.getCell(row, 3).value = rank.gmbRank || 'Not ranked';
    sheet.getCell(row, 4).value = rank.mapPackRank || 'Not ranked';
    sheet.getCell(row, 5).value = rank.organicRank || 'Not ranked';
    
    const gmbCtr = rank.gmbRank ? (rank.gmbRank <= 3 ? [0.176, 0.154, 0.151][rank.gmbRank - 1] : 0) : 0;
    const orgCtr = rank.organicRank && rank.organicRank <= 10 ? Object.values({1:0.398,2:0.187,3:0.102,4:0.072,5:0.051,6:0.040,7:0.030,8:0.020,9:0.015,10:0.010})[rank.organicRank - 1] : 0;
    
    sheet.getCell(row, 6).value = gmbCtr;
    sheet.getCell(row, 6).numFmt = '0.0%';
    sheet.getCell(row, 7).value = orgCtr;
    sheet.getCell(row, 7).numFmt = '0.0%';
    sheet.getRow(row).height = 18;
  });
}

function buildSeoModelSheet(sheet: ExcelJS.Worksheet, result: ResearchResult, proj: ReturnType<typeof buildProjectionData>) {
  sheet.columns = [{ width: 4 }, { width: 45 }, { width: 22 }, { width: 22 }];

  sheet.mergeCells('B1:D1');
  const title = sheet.getCell('B1');
  title.value = `SEO Revenue Model — Current vs. Target Ranking Comparison`;
  title.font = { bold: true, size: 14, color: { argb: COLORS.accent }, name: 'Calibri' };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 36;

  ['Metric', 'CURRENT Rankings', 'TARGET Rankings'].forEach((h, i) => {
    const cell = sheet.getCell(3, i + 2);
    styleHeader(cell, h, 'FF0D1B2E');
  });

  const organicCtrMap: Record<number, number> = {1:0.398,2:0.187,3:0.102,4:0.072,5:0.051,6:0.040,7:0.030,8:0.020,9:0.015,10:0.010};
  const currentOrganicCtr = organicCtrMap[proj.currentOrgRank] || 0;

  const rows = [
    { section: true, label: 'INPUTS (from Client Inputs sheet)', current: null, target: null },
    { label: 'Service Area Population', current: proj.population, target: proj.population, fmt: '#,##0' },
    { label: 'Monthly Searches per 1,000', current: proj.searchesPer1000, target: proj.searchesPer1000, fmt: '0.00' },
    { label: 'GMB Rank', current: proj.currentGmbRank, target: proj.targetGmbRank },
    { label: 'Organic Search Rank', current: proj.currentOrgRank, target: proj.targetOrgRank },
    { label: 'Website Conversion Rate', current: proj.conversionRate, target: proj.conversionRate, fmt: '0%' },
    { label: 'GMB Conversion Rate', current: proj.gmbConversionRate, target: proj.gmbConversionRate, fmt: '0%' },
    { label: 'Lead → Order Close Rate', current: proj.closeRate, target: proj.closeRate, fmt: '0%' },
    { label: 'Average Order Value', current: proj.avgOrderValue, target: proj.avgOrderValue, fmt: '$#,##0' },
    { section: true, label: 'STEP-BY-STEP CALCULATIONS', current: null, target: null },
    { label: 'Step 1 — Estimated Monthly Searches', current: null, target: null },
    { label: 'Total Monthly Searches', current: proj.monthlySearches, target: proj.monthlySearches, fmt: '#,##0' },
    { section: true, label: 'Step 2 — SERP Click Pools (Local Search Distribution)', current: null, target: null },
    { label: 'GMB / Local Pack Click Pool (44% of searches)', current: Math.round(proj.monthlySearches * 0.44), target: Math.round(proj.monthlySearches * 0.44), fmt: '#,##0' },
    { label: 'Organic Search Click Pool (29% of searches)', current: Math.round(proj.monthlySearches * 0.29), target: Math.round(proj.monthlySearches * 0.29), fmt: '#,##0' },
    { section: true, label: 'Step 3 — Click-Through Rate by Rank', current: null, target: null },
    { label: 'GMB CTR (from CTR Tables)', current: [0.176, 0.154, 0.151][proj.currentGmbRank - 1] || 0, target: 0.176, fmt: '0.0%' },
    { label: 'Organic CTR (from CTR Tables)', current: currentOrganicCtr, target: 0.398, fmt: '0.0%' },
    { section: true, label: 'Step 4 — Estimated Monthly Clicks', current: null, target: null },
    { label: 'GMB Clicks', current: proj.currentGmbClicks, target: proj.targetGmbClicks, fmt: '#,##0' },
    { label: 'Organic Clicks', current: proj.currentOrgClicks, target: proj.targetOrgClicks, fmt: '#,##0' },
    { label: 'Total Clicks', current: proj.currentGmbClicks + proj.currentOrgClicks, target: proj.targetGmbClicks + proj.targetOrgClicks, fmt: '#,##0' },
    { section: true, label: 'Step 5 — Revenue Calculation', current: null, target: null },
    { label: 'GMB Revenue', current: Math.round(proj.currentGmbClicks * proj.gmbConversionRate * proj.closeRate * proj.avgOrderValue), target: Math.round(proj.targetGmbClicks * proj.gmbConversionRate * proj.closeRate * proj.avgOrderValue), fmt: '$#,##0' },
    { label: 'Organic Revenue', current: Math.round(proj.currentOrgClicks * proj.conversionRate * proj.closeRate * proj.avgOrderValue), target: Math.round(proj.targetOrgClicks * proj.conversionRate * proj.closeRate * proj.avgOrderValue), fmt: '$#,##0' },
    { label: 'TOTAL MONTHLY REVENUE', current: proj.currentMonthlyRevenue, target: proj.targetMonthlyRevenue, fmt: '$#,##0', bold: true },
    { label: 'TOTAL ANNUAL REVENUE', current: proj.currentAnnualRevenue, target: proj.targetAnnualRevenue, fmt: '$#,##0', bold: true },
    { label: 'ANNUAL REVENUE INCREASE', current: null, target: proj.annualIncrease, fmt: '$#,##0', bold: true, highlight: true },
  ] as any[];

  let rowNum = 4;
  rows.forEach((r: any) => {
    if (r.section) {
      sheet.mergeCells(rowNum, 2, rowNum, 4);
      const cell = sheet.getCell(rowNum, 2);
      cell.value = r.label;
      cell.font = { bold: true, size: 10, color: { argb: COLORS.accent }, name: 'Calibri' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1B2E' } };
      sheet.getRow(rowNum).height = 20;
    } else {
      const labelCell = sheet.getCell(rowNum, 2);
      labelCell.value = r.label;
      labelCell.font = { size: 11, name: 'Calibri', bold: (r as any).bold || false };
      
      if (r.current !== null && r.current !== undefined) {
        const curCell = sheet.getCell(rowNum, 3);
        curCell.value = r.current;
        if (r.fmt) curCell.numFmt = r.fmt;
        curCell.font = { size: 11, name: 'Calibri', color: { argb: COLORS.textMuted } };
        curCell.alignment = { horizontal: 'center' };
      }
      
      if (r.target !== null && r.target !== undefined) {
        const tarCell = sheet.getCell(rowNum, 4);
        tarCell.value = r.target;
        if (r.fmt) tarCell.numFmt = r.fmt;
        const color = (r as any).highlight ? COLORS.success : ((r as any).bold ? COLORS.accent : COLORS.text);
        tarCell.font = { size: 11, name: 'Calibri', color: { argb: color }, bold: (r as any).bold };
        tarCell.alignment = { horizontal: 'center' };
        if ((r as any).highlight) {
          tarCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2B1F' } };
        }
      }
      sheet.getRow(rowNum).height = 20;
    }
    rowNum++;
  });
}

function buildMultiCitySheet(sheet: ExcelJS.Worksheet, result: ResearchResult, proj: ReturnType<typeof buildProjectionData>) {
  sheet.columns = [
    { width: 4 }, { width: 25 }, { width: 14 }, { width: 12 }, 
    { width: 10 }, { width: 10 }, { width: 12 }, { width: 12 },
    { width: 16 }, { width: 14 }, { width: 14 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
    { width: 16 }, { width: 16 }, { width: 16 }
  ];

  sheet.mergeCells('B1:S1');
  const title = sheet.getCell('B1');
  title.value = `Multi-City / Multi-Location Revenue Projector — ${result.company.businessName}`;
  title.font = { bold: true, size: 14, color: { argb: COLORS.accent }, name: 'Calibri' };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 36;

  const headers = [
    'City / Location', 'Population', 'Searches\n/1,000',
    'GMB\nCurrent', 'GMB\nTarget', 'Organic\nCurrent', 'Organic\nTarget',
    'Est. Monthly\nSearches', 'GMB Clicks\n(Current)', 'GMB Clicks\n(Target)',
    'Org. Clicks\n(Current)', 'Org. Clicks\n(Target)',
    'Revenue\n(Current)', 'Revenue\n(Target)', 'Annual Rev.\nIncrease'
  ];

  headers.forEach((h, i) => {
    const cell = sheet.getCell(3, i + 2);
    styleHeader(cell, h);
  });
  sheet.getRow(3).height = 42;

  const allCities = [result.primaryCity, ...result.nearbyCities];
  allCities.slice(0, 10).forEach((city, i) => {
    const row = 4 + i;
    const searches = Math.round((city.population / 1000) * proj.searchesPer1000);
    const gmbClicksCur = Math.round(searches * 0.44 * (GMB_CTR[proj.currentGmbRank] || 0));
    const gmbClicksTar = Math.round(searches * 0.44 * (GMB_CTR[1] || 0.176));
    const orgClicksCur = Math.round(searches * 0.29 * (ORGANIC_CTR[proj.currentOrgRank] || 0));
    const orgClicksTar = Math.round(searches * 0.29 * (ORGANIC_CTR[1] || 0.398));
    const revCur = Math.round((gmbClicksCur * proj.gmbConversionRate + orgClicksCur * proj.conversionRate) * proj.closeRate * proj.avgOrderValue);
    const revTar = Math.round((gmbClicksTar * proj.gmbConversionRate + orgClicksTar * proj.conversionRate) * proj.closeRate * proj.avgOrderValue);

    const values = [
      city.name, city.population, proj.searchesPer1000,
      proj.currentGmbRank, 1, proj.currentOrgRank, 1,
      searches, gmbClicksCur, gmbClicksTar,
      orgClicksCur, orgClicksTar,
      revCur, revTar, (revTar - revCur) * 12
    ];

    const formats = [
      '', '#,##0', '0.00',
      '', '', '', '',
      '#,##0', '#,##0', '#,##0',
      '#,##0', '#,##0',
      '$#,##0', '$#,##0', '$#,##0'
    ];

    values.forEach((v, j) => {
      const cell = sheet.getCell(row, j + 2);
      cell.value = v;
      if (formats[j]) cell.numFmt = formats[j];
      if (j === 0 && i === 0) cell.font = { bold: true, color: { argb: COLORS.accent }, name: 'Calibri' };
      else cell.font = { size: 11, name: 'Calibri' };
      if (j >= 12) cell.font = { ...cell.font, color: { argb: j === 14 ? COLORS.success : COLORS.text } };
    });

    sheet.getRow(row).height = 18;
  });
}

function buildPhasedSheet(sheet: ExcelJS.Worksheet, result: ResearchResult, proj: ReturnType<typeof buildProjectionData>) {
  sheet.columns = [{ width: 4 }, { width: 42 }, ...Array(6).fill({ width: 18 })];

  sheet.mergeCells('B1:H1');
  const title = sheet.getCell('B1');
  title.value = `Phased Revenue Projections — 6-Month Ramp-Up Timeline`;
  title.font = { bold: true, size: 14, color: { argb: COLORS.accent }, name: 'Calibri' };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 36;

  const phases = buildPhasedProjections(proj.targetMonthlyRevenue, proj.currentMonthlyRevenue);
  const monthLabels = ['Month 1\nEarly Signs\n(5%)', 'Month 2\nEarly Signs\n(10%)', 'Month 3\nNoticeable\n(37.5%)', 'Month 4\nNoticeable\n(50%)', 'Month 5\nMeaningful\n(87.5%)', 'Month 6\nFull Target\n(100%)'];

  ['Metric', ...monthLabels].forEach((h, i) => {
    const cell = sheet.getCell(3, i + 2);
    styleHeader(cell, h);
  });
  sheet.getRow(3).height = 52;

  sheet.getCell('B4').value = 'Traffic Ramp Multiplier';
  sheet.getCell('B4').font = { size: 11, name: 'Calibri' };
  phases.forEach((p, i) => {
    const cell = sheet.getCell(4, i + 3);
    cell.value = p.ramp;
    cell.numFmt = '0%';
    cell.alignment = { horizontal: 'center' };
  });

  sectionHeader(sheet, 6, 'INCREMENTAL MONTHLY REVENUE (Target Revenue × Traffic Ramp)', 7, 2);

  ['GMB Incremental Revenue', 'Organic Incremental Revenue', 'Total Incremental Revenue'].forEach((label, li) => {
    const row = 7 + li;
    sheet.getCell(row, 2).value = label;
    sheet.getCell(row, 2).font = { size: 11, name: 'Calibri', bold: li === 2 };

    phases.forEach((p, i) => {
      const gmbIncremental = Math.round((proj.targetGmbClicks * proj.gmbConversionRate * proj.closeRate * proj.avgOrderValue) * p.ramp);
      const orgIncremental = Math.round((proj.targetOrgClicks * proj.conversionRate * proj.closeRate * proj.avgOrderValue) * p.ramp);
      
      let val = li === 0 ? gmbIncremental : li === 1 ? orgIncremental : gmbIncremental + orgIncremental;
      const cell = sheet.getCell(row, i + 3);
      cell.value = val;
      cell.numFmt = '$#,##0';
      cell.alignment = { horizontal: 'center' };
      if (li === 2) cell.font = { bold: true, color: { argb: COLORS.success }, name: 'Calibri' };
    });
    sheet.getRow(row).height = 20;
  });

  sectionHeader(sheet, 11, 'CUMULATIVE REVENUE OVER 6 MONTHS', 7, 2);
  sheet.getCell('B12').value = 'Cumulative Revenue';
  sheet.getCell('B12').font = { size: 11, name: 'Calibri', bold: true };
  
  let cumulative = 0;
  phases.forEach((p, i) => {
    const monthly = Math.round(proj.currentMonthlyRevenue + (proj.targetMonthlyRevenue - proj.currentMonthlyRevenue) * p.ramp);
    cumulative += monthly;
    const cell = sheet.getCell(12, i + 3);
    cell.value = cumulative;
    cell.numFmt = '$#,##0';
    cell.alignment = { horizontal: 'center' };
    cell.font = { bold: true, name: 'Calibri' };
  });

  const totalCell = sheet.getCell('B14');
  totalCell.value = 'Total Projected Revenue Over 6 Months';
  totalCell.font = { bold: true, size: 12, name: 'Calibri' };
  const totalValueCell = sheet.getCell('C14');
  totalValueCell.value = cumulative;
  totalValueCell.numFmt = '$#,##0';
  totalValueCell.font = { bold: true, size: 14, color: { argb: COLORS.success }, name: 'Calibri' };
  sheet.mergeCells('C14:H14');
  sheet.getRow(14).height = 30;
}

function buildCtrSheet(sheet: ExcelJS.Worksheet) {
  sheet.columns = [{ width: 4 }, { width: 30 }, { width: 15 }, { width: 4 }, { width: 25 }, { width: 15 }];

  sheet.mergeCells('B1:F1');
  const title = sheet.getCell('B1');
  title.value = `Click-Through Rate (CTR) Reference Tables  —  Source: First Page Sage 2026 & Research Report`;
  title.font = { bold: true, size: 13, color: { argb: COLORS.accent }, name: 'Calibri' };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  styleHeader(sheet.getCell('B3'), 'ORGANIC SEARCH CTR BY POSITION');
  styleHeader(sheet.getCell('E3'), 'GMB / LOCAL PACK CTR BY POSITION');

  ['Organic Rank', 'CTR'].forEach((h, i) => styleHeader(sheet.getCell(4, i + 2), h));
  ['GMB Rank', 'CTR'].forEach((h, i) => styleHeader(sheet.getCell(4, i + 5), h));

  Object.entries(ORGANIC_CTR).forEach(([rank, ctr], i) => {
    sheet.getCell(5 + i, 2).value = parseInt(rank);
    sheet.getCell(5 + i, 2).alignment = { horizontal: 'center' };
    sheet.getCell(5 + i, 3).value = ctr;
    sheet.getCell(5 + i, 3).numFmt = '0.0%';
    sheet.getCell(5 + i, 3).alignment = { horizontal: 'center' };
  });

  Object.entries(GMB_CTR).forEach(([rank, ctr], i) => {
    sheet.getCell(5 + i, 5).value = parseInt(rank);
    sheet.getCell(5 + i, 5).alignment = { horizontal: 'center' };
    sheet.getCell(5 + i, 6).value = ctr;
    sheet.getCell(5 + i, 6).numFmt = '0.0%';
    sheet.getCell(5 + i, 6).alignment = { horizontal: 'center' };
  });

  sectionHeader(sheet, 16, 'LOCAL SERP TRAFFIC DISTRIBUTION  (Source: Research Report)', 5, 2);
  ['Channel', 'Share of Local Clicks', 'Notes'].forEach((h, i) => styleHeader(sheet.getCell(17, i + 2), h));
  
  [
    ['Google Local 3-Pack (GMB)', '44%', 'Dominates local SERP real estate'],
    ['Organic Results', '29%', 'Below the Local Pack'],
    ['Paid Search (Google Ads)', '19%', 'Varies by industry'],
    ['"More Places" Button', '8%', 'Overflow from Local Pack'],
  ].forEach(([channel, share, note], i) => {
    const row = 18 + i;
    sheet.getCell(row, 2).value = channel;
    sheet.getCell(row, 3).value = share;
    sheet.getCell(row, 3).alignment = { horizontal: 'center' };
    sheet.getCell(row, 4).value = note;
    sheet.getCell(row, 4).font = { size: 10, color: { argb: COLORS.textMuted }, italic: true, name: 'Calibri' };
    sheet.getRow(row).height = 18;
  });
}
