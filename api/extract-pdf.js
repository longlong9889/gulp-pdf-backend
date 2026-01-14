// api/extract-pdf.js
// This is a Vercel serverless function

import pdfParse from 'pdf-parse';

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
    
    let fullText = data.text;
    const pageCount = data.numpages;

    // Extract only "Examples of Expressions" section if it exists
    const examplesStart = fullText.indexOf('Examples of Expressions:');
    let extractedText = fullText.trim();

    if (examplesStart !== -1) {
      extractedText = fullText
        .substring(examplesStart + 'Examples of Expressions:'.length)
        .replace(/\d{3} De Anza Boulevard.*?Fax \(\d{3}\) \d{3}-\d{4}/gi, '')
        .replace(/Lammersville.*?District/gi, '')
        .replace(/Page \d+ of \d+/gi, '')
        .trim();
    }

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