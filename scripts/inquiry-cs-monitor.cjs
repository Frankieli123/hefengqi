const { PrismaClient } = require('@prisma/client');
const https = require('https');
const fs = require('fs');

const prisma = new PrismaClient();
const STATE_FILE = process.env.MONITOR_STATE_FILE || '/mnt/vscode/hefengqi/shared/.sg_monitor_state.json';
const TARGET_OPEN_ID = process.env.FEISHU_MONITOR_OPEN_ID;
const FEISHU_GROUP_WEBHOOK = process.env.FEISHU_MONITOR_GROUP_WEBHOOK;
const FEISHU_APP_ID = process.env.FEISHU_MONITOR_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_MONITOR_APP_SECRET;
for (const [name, value] of Object.entries({ TARGET_OPEN_ID, FEISHU_GROUP_WEBHOOK, FEISHU_APP_ID, FEISHU_APP_SECRET })) {
  if (!value) throw new Error(`Missing required monitor configuration: ${name}`);
}

let tenantToken = null;
let tokenExpiresAt = 0;

function postRequest(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        ...headers
      }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); }
        catch (e) { resolve({ raw: buf }); }
      });
    });
    req.setTimeout(8000, () => req.destroy(new Error('request timeout')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getTenantToken() {
  const now = Date.now();
  if (tenantToken && now < tokenExpiresAt - 60000) {
    return tenantToken;
  }
  const res = await postRequest('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: FEISHU_APP_ID,
    app_secret: FEISHU_APP_SECRET
  });
  if (res.tenant_access_token) {
    tenantToken = res.tenant_access_token;
    tokenExpiresAt = now + (res.expire || 7200) * 1000;
    return tenantToken;
  }
  console.error('Failed to get tenant token:', res);
  return null;
}

async function sendFeishuNotification(text, ack = {}, mark = () => {}, eventKey = '') {
  // The inquiry route owns the immediate group card for this configured webhook.
  // Keep the durable private-message fallback without posting the same group twice.
  if (!ack.group) {
    if (eventKey.startsWith('last_inq_id:')) mark('group');
    else {
      try {
        const r = await postRequest(FEISHU_GROUP_WEBHOOK, {msg_type:'text', content:{text}});
        if ((r.code ?? r.StatusCode) !== 0) throw Error(`group API code ${r.code ?? r.StatusCode ?? 'unrecognized'}`);
        mark('group');
      } catch (e) { console.error('Group notify failed:', e.message); }
    }
  }
  if (!ack.dm) {
    try {
      const token = await getTenantToken();
      if (!token) throw Error('no tenant token');
      const payload = {receive_id:TARGET_OPEN_ID,msg_type:'text',content:JSON.stringify({text})};
      if (eventKey) payload.uuid = require('crypto').createHash('sha256').update(eventKey).digest('hex').slice(0,48);
      const r = await postRequest('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id',payload,{Authorization:`Bearer ${token}`});
      if (r.code !== 0) throw Error(`DM API code ${r.code ?? 'unrecognized'}`);
      mark('dm');
    } catch (e) { console.error('DM notify failed:', e.message); }
  }
}

function loadState() {
  const state = JSON.parse(fs.readFileSync(STATE_FILE,'utf8'));
  for (const k of ['last_inq_id','last_msg_id']) if (!state[k]) throw Error('Missing saved poll cursor');
  return state;
}
function saveState(state) {
  const tmp = `${STATE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state,null,2), {mode:0o600});
  fs.renameSync(tmp,STATE_FILE);
}
async function nextRows(model, state, key, conditions = {}) {
  const last = state[key];
  const time = state[key+'_time'] ? new Date(state[key+'_time']) : (await model.findUnique({where:{id:last},select:{createdAt:true}}))?.createdAt;
  if (!time || !Number.isFinite(time.getTime())) throw Error(`Cannot resolve cursor for ${key}`);
  return model.findMany({where:{...conditions,OR:[{createdAt:{gt:time}},{createdAt:time,id:{gt:last}}]},orderBy:[{createdAt:'asc'},{id:'asc'}],take:20});
}
async function deliver(state,key,row,text) {
  const pendingKey = `${key}_pending`;
  const prev = state[pendingKey];
  if (prev && prev.id !== row.id) throw Error('Pending notification does not match next record');
  const ack = prev || {id:row.id};
  await sendFeishuNotification(text,ack,channel=>{
    const saved = {...ack,[channel]:true};
    saveState({...state,[pendingKey]:saved});
    Object.assign(ack,saved); state[pendingKey]=ack;
  },`${key}:${row.id}`);
  if (!ack.group || !ack.dm) return false;
  const updated = {...state,[key]:row.id,[key+'_time']:row.createdAt.toISOString()};
  delete updated[pendingKey]; saveState(updated); Object.assign(state,updated); delete state[pendingKey];
  return true;
}

async function pollOnce() {
  const state = loadState();

  // 1. 检查最新询盘 (Inquiry)
  const inqs = await nextRows(prisma.inquiry,state,'last_inq_id');
  for (const inq of inqs) {

    const text =
`📑 🔔 **【RICEWIND 独立站】收到新询盘通知 (新加坡生产源站)！**

• **询盘编号**: \`${inq.referenceId || '—'}\`
• **客户姓名**: ${inq.name || '匿名客户'}
• **公司名称**: ${inq.company || '—'}
• **客户邮箱**: ${inq.email || '—'}
• **电话/WhatsApp**: ${inq.phoneOrWhatsapp || '—'}
• **国家/地区**: ${inq.country || '—'}
• **采购数量**: ${inq.quantity || '—'}
• **具体需求**: 「${inq.requirements || '—'}」
• **提交时间**: ${new Date(inq.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

💡 _提示：您可直接通过工作台快速拟定报价。_`;

    if (!(await deliver(state,'last_inq_id',inq,text))) break;
  }

  // 2. 检查在线客服访客消息 (CustomerServiceMessage)
  const msgs = await nextRows(prisma.customerServiceMessage,state,'last_msg_id',{senderType:'VISITOR'});
  for (const m of msgs) {

    const text =
`💬 🔔 **【RICEWIND 独立站】在线客服收到新留言 (新加坡生产源站)！**

• **留言内容**: 「${m.body || ''}」
• **客户身份**: 独立站海外访客 (Visitor)
• **会话编号**: \`${m.conversationId}\`
• **提交时间**: ${new Date(m.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

💡 _提示：可在工作台快速回复客户或交由 AI 拟定答复。_`;

    if (!(await deliver(state,'last_msg_id',m,text))) break;
  }
}

async function main() {
  console.log(`[${new Date().toISOString()}] Starting Singapore native Inquiry & CS monitor daemon...`);
  while (true) {
    try {
      await pollOnce();
    } catch (e) {
      console.error('Poll error:', e);
    }
    await new Promise(r => setTimeout(r, 10000)); // 每 10 秒秒级轮询一次
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
