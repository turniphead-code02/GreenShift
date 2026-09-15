import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({success:false,message:'Method not allowed'});
  try {
    const { pin, companyName, reviewer, decision, note, reportHash } = req.body || {};
    const expected = process.env.EXPERT_REVIEW_PIN;
    if (expected && pin !== expected) return res.status(401).json({success:false,message:'PIN chuyên gia không đúng'});
    if (!companyName || !reviewer || !decision) return res.status(400).json({success:false,message:'Thiếu thông tin phê chuẩn'});
    const safe = companyName.trim().replace(/[<>:"/\\|?*]/g,'_').replace(/\s+/g,'_');
    const record = { companyName, reviewer, decision, note:note||'', reportHash:reportHash||'', attestedAt:new Date().toISOString(),
      disclaimer:'Đây là bản ghi phê chuẩn nội bộ, không phải chứng nhận ISO hoặc xác nhận của cơ quan quản lý.' };
    const blob = await put(`expert-attestations/${safe}.json`, JSON.stringify(record,null,2), {
      access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:true
    });
    return res.status(200).json({success:true,url:blob.url,record});
  } catch(e) {
    console.error(e);
    return res.status(500).json({success:false,message:e.message || 'Không thể lưu phê chuẩn'});
  }
}
