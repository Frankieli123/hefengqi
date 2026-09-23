
const { PrismaClient } = require('/mnt/vscode/hefengqi/node_modules/@prisma/client');
const http = require('http');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://hefengqi_dev:hfq_dev_db_2026_local_only_x7q9@127.0.0.1:5432/hefengqi_dev"
    }
  }
});

let lastMessageTime = new Date();
let lastInquiryTime = new Date();

function postWebhook(payload) {
  const data = JSON.stringify(payload);
  const options = {
    hostname: '192.168.31.10',
    port: 19960,
    path: '/api/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'User-Agent': 'Hefengqi-DB-Dispatcher/1.0'
    },
    timeout: 5000
  };

  const req = http.request(options, (res) => {});
  req.on('error', (e) => console.error('Webhook error:', e.message));
  req.write(data);
  req.end();
}

async function poll() {
  try {
    const newMessages = await prisma.customerServiceMessage.findMany({
      where: {
        senderType: 'VISITOR',
        createdAt: { gt: lastMessageTime }
      },
      include: { conversation: true },
      orderBy: { createdAt: 'asc' }
    });

    for (const msg of newMessages) {
      lastMessageTime = msg.createdAt;
      console.log(`[${new Date().toISOString()}] New message: ${msg.body}`);
      postWebhook({
        event: 'customer_service.message.created',
        conversation: {
          id: msg.conversationId,
          locale: msg.conversation.locale || 'zh',
          status: msg.conversation.status
        },
        message: {
          id: msg.id,
          senderType: 'VISITOR',
          body: msg.body,
          createdAt: msg.createdAt.toISOString()
        }
      });
    }

    const newInquiries = await prisma.inquiry.findMany({
      where: {
        createdAt: { gt: lastInquiryTime }
      },
      orderBy: { createdAt: 'asc' }
    });

    for (const inq of newInquiries) {
      lastInquiryTime = inq.createdAt;
      console.log(`[${new Date().toISOString()}] New inquiry: ${inq.referenceId}`);
      postWebhook({
        event: 'inquiry.created',
        inquiry: {
          referenceId: inq.referenceId,
          locale: inq.locale || 'en',
          name: inq.name,
          company: inq.company,
          email: inq.email,
          phoneOrWhatsapp: inq.phoneOrWhatsapp,
          country: inq.country,
          productId: inq.productId,
          quantity: inq.quantity,
          requirements: inq.requirements,
          createdAt: inq.createdAt.toISOString()
        }
      });
    }
  } catch (err) {
    console.error('Poll error:', err.message);
  }
}

async function main() {
  const latestMsg = await prisma.customerServiceMessage.findFirst({
    where: { senderType: 'VISITOR' },
    orderBy: { createdAt: 'desc' }
  });
  if (latestMsg) {
    // 往前推1分钟，确保刚刚发的那条也能立刻补推出来！
    lastMessageTime = new Date(Date.now() - 10 * 60 * 1000);
  }
  const latestInq = await prisma.inquiry.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  if (latestInq) {
    lastInquiryTime = latestInq.createdAt;
  }
  console.log('Watching database changes...');
  setInterval(poll, 1500);
}

main();
