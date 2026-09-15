import { put } from '@vercel/blob';

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {

    const { fileName, fileBase64 } = req.body;

    if (!fileName || !fileBase64) {
      return res.status(400).json({
        success: false,
        message: 'Missing file information'
      });
    }

    const fileBuffer = Buffer.from(fileBase64, 'base64');

    const blob = await put(
      `reports/${fileName}`,
      fileBuffer,
      {
        access: 'private',
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        addRandomSuffix: false,
        allowOverwrite: true
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Excel uploaded successfully',
      pathname: blob.pathname
    });

  } catch (error) {

    console.error('Upload error:', error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
}