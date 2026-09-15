import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { company } = req.body;

    if (!company) {
      return res.status(400).json({
        success: false,
        message: 'Company information is missing'
      });
    }

    // Use tax code as the identifier for the company
    // If tax code is missing, use a timestamp instead
   const companyName = company.name
  .trim()
  .replace(/[<>:"/\\|?*]/g, '_');

const fileName = `companies/${companyName}.json`;

    const blob = await put(
      fileName,
      JSON.stringify(company, null, 2),
      {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Company information saved successfully',
      url: blob.url
    });

  } catch (error) {
    console.error('Save company error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to save company information'
    });
  }
}