// issues a signed session token after purchase (or magic link)
// env: TOKEN_SECRET (required), TOKEN_ISSUER (optional), TOKEN_AUDIENCE (optional)
const crypto = require('crypto');

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}
function signHS256(secret, header, payload) {
  const data = `${header}.${payload}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64')
    .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${data}.${sig}`;
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') { res.status(405).json({error:'Method not allowed'}); return; }

    const secret = process.env.TOKEN_SECRET;
    if (!secret) { res.status(500).json({error:'Missing TOKEN_SECRET env'}); return; }

    const body = typeof req.body === 'object' && req.body ? req.body : JSON.parse(req.body || '{}');

    // inputs
    const now = Math.floor(Date.now()/1000);
    const uid = body.user_id || crypto.randomUUID();
    const plan = (body.plan || 'day').toLowerCase();            // 'day' or 'monthly'
    const man  = body.man || '';                                 // required if plan==='day'
    const recur= (body.recur || 'no').toLowerCase();             // 'yes' or 'no' (monthly only)

    const lifetimeSec = plan === 'day' ? 24*60*60 : 30*24*60*60; // 24h vs 30d
    const exp = now + lifetimeSec;

    const header = b64url(JSON.stringify({alg:'HS256',typ:'JWT'}));
    const payload = b64url(JSON.stringify({
      sub: uid,
      plan, man, recur,
      iat: now, exp: exp,
      iss: process.env.TOKEN_ISSUER || 'blossom-blade',
      aud: process.env.TOKEN_AUDIENCE || 'chat'
    }));
    const token = signHS256(secret, header, payload);

    res.status(200).json({ token, user_id: uid, exp });
  } catch (e) {
    res.status(500).json({error:String(e)});
  }
};
