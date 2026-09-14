# 在线客服 Webhook

后台位置：`/admin/settings#customer-service`。

启用后，访客发送消息和管理员回复都会向已配置的 HTTPS 地址发送 `POST` 请求。Webhook 失败不会阻塞站内聊天。

## 请求头

```text
Content-Type: application/json
X-RICEWIND-Event: customer_service.message.created
X-RICEWIND-Signature: sha256=<hex digest>
User-Agent: RICEWIND-Customer-Service/1.0
```

签名计算对象是未经修改的原始请求体：

```text
HMAC-SHA256(webhook_secret, raw_request_body)
```

接收端必须使用恒定时间比较校验签名，并使用 `message.id` 去重。

## 消息结构

```json
{
  "event": "customer_service.message.created",
  "sentAt": "2026-09-13T14:00:00.000Z",
  "conversation": {
    "id": "conversation-id",
    "locale": "zh",
    "status": "OPEN"
  },
  "message": {
    "id": "message-id",
    "senderType": "VISITOR",
    "body": "需要 UPS 产品选型支持",
    "createdAt": "2026-09-13T14:00:00.000Z"
  }
}
```

`senderType` 为 `VISITOR` 或 `ADMIN`。接收端应在 5 秒内返回任意 `2xx` 状态码。

## 安全边界

- 生产环境仅允许公网 HTTPS 地址，拒绝 localhost、内网和链路本地 IP。
- Webhook 密钥不会在后台页面或公开接口中回显。
- 消息正文可能包含客户信息，接收系统需要使用访问控制并按隐私政策保留数据。
