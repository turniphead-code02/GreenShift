import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const {
      fileName,
      data
    } = req.body;

    if (!fileName || !data) {
      return res.status(400).json({
        success: false,
        message: 'Missing fileName or data'
      });
    }

    const jsonData = JSON.stringify(data, null, 2);

    const blob = await put(
      `annual-data/${fileName}`,
      jsonData,
      {
        access: 'private',
        addRandomSuffix: false,
        contentType: 'application/json',
        allowOverwrite: true
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Dữ liệu đã được lưu lên Vercel Blob',
      url: blob.url
    });

  } catch (error) {
    console.error('Save annual data error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Không thể lưu dữ liệu'
    });
  }
}