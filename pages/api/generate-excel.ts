// pages/api/generate-excel.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { buildProjectionData } from '../../lib/research';
import { generateExcel } from '../../lib/excelGenerator';
import type { ResearchResult } from '../../lib/research';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { result, overrides } = req.body as { 
    result: ResearchResult; 
    overrides?: {
      conversionRate?: number;
      gmbConversionRate?: number;
      closeRate?: number;
      avgOrderValue?: number;
      currentGmbRank?: number;
      currentOrgRank?: number;
    }
  };

  if (!result) {
    return res.status(400).json({ error: 'Research result is required' });
  }

  try {
    const projData = buildProjectionData(
      result,
      overrides?.conversionRate,
      overrides?.gmbConversionRate,
      overrides?.closeRate,
      overrides?.avgOrderValue
    );

    // Apply rank overrides
    if (overrides?.currentGmbRank) projData.currentGmbRank = overrides.currentGmbRank;
    if (overrides?.currentOrgRank) projData.currentOrgRank = overrides.currentOrgRank;

    const buffer = await generateExcel(result, projData);

    const filename = `SEO_Revenue_Projector_${result.company.businessName.replace(/[^a-zA-Z0-9]/g, '_')}_${result.company.city}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.status(200).send(buffer);
  } catch (error) {
    console.error('Excel generation error:', error);
    res.status(500).json({ 
      error: 'Excel generation failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
