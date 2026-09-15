import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({success:false,message:'Method not allowed'});
  try {
    const { token, supplier } = req.body || {};
    if (!token || !supplier?.companyName) return res.status(400).json({success:false,message:'Thiếu token hoặc thông tin nhà cung cấp'});
    const safe = String(token).replace(/[^a-zA-Z0-9_-]/g,'');
    const blob = await put(`supplier-surveys/${safe}.json`, JSON.stringify({
      ...supplier,
      token: safe,
      submittedAt: new Date().toISOString()
    }, null, 2), {
      access:'private', contentType:'application/json', addRandomSuffix:false, allowOverwrite:true
    });
    return res.status(200).json({success:true,url:blob.url});
  } catch(e) {
    console.error(e);
    return res.status(500).json({success:false,message:e.message || 'Không thể lưu khảo sát'});
  }
}
