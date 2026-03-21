// api/extract-pdf.js
// This is a Vercel serverless function

import pdfParse from 'pdf-parse';

function cleanExtractedPdfText(text) {
  if (!text) return text;

  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      if (!line) return false;

      // Remove page numbers
      if (/^page\s*\d+\s*of\s*\d+$/i.test(line)) return false;

      // Remove phone / fax lines (any common format)
      if (/\(?\d{3}\)?\s*\d{3}[-\s]?\d{4}/.test(line)) return false;
      if (/fax\b/i.test(line)) return false;

      // Remove address-like lines
      if (/\b(blvd|boulevard|street|st|avenue|ave|road|rd|drive|dr|court|ct|way)\b/i.test(line)) return false;
      if (/\b\d{5}(-\d{4})?\b/.test(line)) return false; // ZIP

      // Remove district / header lines
      if (/unified\s+school\s+district/i.test(line)) return false;

      return true;
    })
    .join('\n')
    .trim();
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfBase64 } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: 'No PDF data provided' });
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Parse PDF
    const data = await pdfParse(pdfBuffer);

    const fullText = data.text || '';
    const pageCount = data.numpages;

    // Extract only "Examples of Expressions" section if it exists (case-insensitive)
    const marker = 'examples of expressions:';
    const lower = fullText.toLowerCase();

    let extractedText = fullText.trim();

    if (lower.includes(marker)) {
      extractedText = fullText.substring(lower.indexOf(marker) + marker.length).trim();
    }

    // Clean footers, headers, addresses, phones, etc.
    extractedText = cleanExtractedPdfText(extractedText);

    return res.status(200).json({
      success: true,
      text: extractedText,
      pageCount: pageCount
    });
  } catch (error) {
    console.error('PDF processing error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process PDF'
    });
  }
}
