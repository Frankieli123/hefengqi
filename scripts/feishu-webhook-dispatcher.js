const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const FEISHU_WEBHOOK_URL = "https://open.feishu.cn/open-apis/bot/v2/hook/3e323113-9af1-45f6-b049-afcc71c59275";

async function sendFeishuCard(card) {
  try {
    const res = await fetch(FEISHU_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Feishu webhook post error:", e);
    return null;
  }
}

async function checkAndDispatch() {
  // 1. 检查未推送的询盘
  // 通过检查最后一次记录的时间标记
  const fs = require("fs");
  const path = require("path");
  const stateFile = path.resolve(__dirname, ".feishu_notify_state.json");
  let state = { lastInquiryTime: "2026-09-01T00:00:00.000Z", lastMessageTime: new Date(Date.now() - 5 * 60 * 1000).toISOString() };
  if (fs.existsSync(stateFile)) {
    try {
      state = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
    } catch (e) {}
  }

  // 1. 查询新询盘
  const newInquiries = await prisma.inquiry.findMany({
    where: {
      createdAt: { gt: new Date(state.lastInquiryTime) },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const inq of newInquiries) {
    const card = {
      msg_type: "interactive",
      card: {
        config: { wide_screen_mode: true },
        header: {
          title: { tag: "plain_text", content: "🎯 收到来自独立站的新询盘！" },
          template: "blue",
        },
        elements: [
          {
            tag: "div",
            fields: [
              { is_short: true, text: { tag: "lark_md", content: `**单号：**\n${inq.referenceId}` } },
              { is_short: true, text: { tag: "lark_md", content: `**客户：**\n${inq.name}` } },
              { is_short: true, text: { tag: "lark_md", content: `**国家/地区：**\n${inq.country}` } },
              { is_short: true, text: { tag: "lark_md", content: `**邮箱：**\n${inq.email}` } },
              { is_short: true, text: { tag: "lark_md", content: `**电话/WhatsApp：**\n${inq.phoneOrWhatsapp || "未提供"}` } },
              { is_short: true, text: { tag: "lark_md", content: `**语种：**\n${inq.locale.toUpperCase()}` } },
              { is_short: false, text: { tag: "lark_md", content: `**采购需求：**\n> ${inq.requirements}` } },
            ],
          },
          {
            tag: "action",
            actions: [
              {
                tag: "button",
                text: { tag: "plain_text", content: "前往后台查看询盘" },
                type: "primary",
                url: "https://ricewind.com/admin/inquiries",
              },
            ],
          },
        ],
      },
    };
    await sendFeishuCard(card);
    state.lastInquiryTime = inq.createdAt.toISOString();
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf-8");
  }

  // 2. 查询客服聊天的新访客留言 (最近的访客留言)
  const newMessages = await prisma.customerServiceMessage.findMany({
    where: {
      senderType: "VISITOR",
      createdAt: { gt: new Date(state.lastMessageTime) },
    },
    include: {
      conversation: true,
    },
    orderBy: { createdAt: "asc" },
  });

  for (const msg of newMessages) {
    const card = {
      msg_type: "interactive",
      card: {
        config: { wide_screen_mode: true },
        header: {
          title: { tag: "plain_text", content: "💬 独立站收到新访客在线留言！" },
          template: "turquoise",
        },
        elements: [
          {
            tag: "div",
            fields: [
              { is_short: true, text: { tag: "lark_md", content: `**会话语种：** ${msg.conversation.locale.toUpperCase()}` } },
              { is_short: true, text: { tag: "lark_md", content: `**状态：** ${msg.conversation.status}` } },
              { is_short: false, text: { tag: "lark_md", content: `**访客消息：**\n> ${msg.body}` } },
            ],
          },
          {
            tag: "action",
            actions: [
              {
                tag: "button",
                text: { tag: "plain_text", content: "前往后台客服回复" },
                type: "primary",
                url: "https://ricewind.com/admin/customer-service",
              },
            ],
          },
        ],
      },
    };
    await sendFeishuCard(card);
    state.lastMessageTime = msg.createdAt.toISOString();
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf-8");
  }

  await prisma.$disconnect();
}

checkAndDispatch();
