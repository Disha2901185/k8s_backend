# Leads Intake API

## Endpoint

`POST /v1/leads/intake`

This API is used by the tenant website or any external lead source integration to push leads into the ERP leads inbox.

## Authentication

This endpoint does **not** use bearer token authentication.

It uses tenant lead API credentials in headers:

```http
x-lead-client-id: lead_5188a964fbb9448687deb38d94171960
x-lead-client-secret: sec_019afe706c3ddfa8c9da8e2c262eb4427
Content-Type: application/json
```

## Required Fields

These fields are required in every request body:

- `sourceType`
- `externalSourceId`
- `sourcePayload`

## Common Request Shape

```json
{
  "sourceType": "WEB_FORM",
  "externalSourceId": "wf-1001",
  "name": "John Smith",
  "email": "john.smith@acmecorp.com",
  "phone": "+91 9876543210",
  "companyName": "Acme Corp",
  "subject": "Enterprise Inquiry",
  "messagePreview": "Interested in cloud migration services for 500 servers.",
  "capturedAt": "2026-04-01T12:00:00.000Z",
  "sourcePayload": {}
}
```

## Field Notes

- `sourceType`: one of `WEB_FORM`, `AI_ASSISTANT`, `WHATSAPP`, `RESOURCE_DOWNLOAD`, `EVENT_REGISTRATION`, `EMAIL_INQUIRY`, `LINKEDIN`
- allowed values are controlled from `backend/constant.js` under `LEAD_SOURCE_TYPES`
- `externalSourceId`: unique lead event id from the external system
- `name`: lead person name
- `email`: lead email
- `phone`: lead phone
- `companyName`: lead company name
- `subject`: title or subject for the lead
- `messagePreview`: short preview shown in list UI
- `capturedAt`: ISO datetime when the lead was captured
- `sourcePayload`: source-specific structured data

## Example Request Bodies

### 1. Web Form

```json
{
  "sourceType": "WEB_FORM",
  "externalSourceId": "wf-1001",
  "name": "John Smith",
  "email": "john.smith@acmecorp.com",
  "phone": "+91 9876543210",
  "companyName": "Acme Corp",
  "subject": "Enterprise Inquiry",
  "messagePreview": "Interested in cloud migration services for 500 servers.",
  "capturedAt": "2026-04-01T12:00:00.000Z",
  "sourcePayload": {
    "subject": "Enterprise Inquiry",
    "message": "Hi, we are interested in your cloud migration services for our enterprise division. We have about 500 servers to migrate.",
    "pageSource": "/services/cloud-migration"
  }
}
```

### 2. AI Assistant

```json
{
  "sourceType": "AI_ASSISTANT",
  "externalSourceId": "ai-session-2001",
  "email": "visitor.7482@anonymous.net",
  "companyName": "Unknown Company",
  "messagePreview": "Looking for cloud migration information.",
  "capturedAt": "2026-04-01T12:05:00.000Z",
  "sourcePayload": {
    "sessionDuration": "12m 30s",
    "chatLog": [
      {
        "sender": "Bot",
        "time": "10:00 AM",
        "text": "Welcome to Lean QTC! How can I assist you with your IT needs today?"
      },
      {
        "sender": "User",
        "time": "10:01 AM",
        "text": "I am looking for information on your cloud migration services."
      }
    ]
  }
}
```

### 3. WhatsApp

```json
{
  "sourceType": "WHATSAPP",
  "externalSourceId": "wa-chat-3001",
  "name": "David Ross",
  "email": "david.r@logistics.co",
  "phone": "+1 555 0123",
  "companyName": "Unknown Company",
  "messagePreview": "Can someone call me about pricing?",
  "capturedAt": "2026-04-01T12:10:00.000Z",
  "sourcePayload": {
    "lastMessage": "Can someone call me about pricing?",
    "chatHistory": [
      {
        "direction": "in",
        "text": "Hi, I saw your ad on LinkedIn.",
        "time": "Monday 2:00 PM"
      },
      {
        "direction": "out",
        "text": "Hello! Thanks for reaching out. How can we assist you?",
        "time": "Monday 2:05 PM"
      },
      {
        "direction": "in",
        "text": "Can someone call me about pricing?",
        "time": "Monday 2:10 PM"
      }
    ]
  }
}
```

### 4. Resource Download

```json
{
  "sourceType": "RESOURCE_DOWNLOAD",
  "externalSourceId": "dl-4001",
  "name": "Emily Blunt",
  "email": "emily@creative.design",
  "companyName": "Creative Design",
  "messagePreview": "Downloaded 2024 UI/UX Trends Report.",
  "capturedAt": "2026-04-01T12:15:00.000Z",
  "sourcePayload": {
    "contentTitle": "2024 UI/UX Trends Report",
    "contentType": "PDF Guide",
    "downloadedAt": "2026-04-01T09:15:00.000Z"
  }
}
```

### 5. Event Registration

```json
{
  "sourceType": "EVENT_REGISTRATION",
  "externalSourceId": "event-5001",
  "name": "Michael Chang",
  "email": "m.chang@startuplab.io",
  "companyName": "Startup Lab",
  "subject": "Webinar Registration",
  "messagePreview": "Registered for The Future of AI in DevOps.",
  "capturedAt": "2026-04-01T12:20:00.000Z",
  "sourcePayload": {
    "webinarTitle": "The Future of AI in DevOps",
    "webinarDate": "2026-04-05T14:00:00.000Z",
    "attended": true,
    "questionsAsked": [
      "How does this integrate with Kubernetes?",
      "Is there a free tier?"
    ]
  }
}
```

### 6. Email Inquiry

```json
{
  "sourceType": "EMAIL_INQUIRY",
  "externalSourceId": "mail-6001",
  "name": "Sarah Connor",
  "email": "sarah.c@techfin.com",
  "companyName": "TechFin Solutions",
  "subject": "Partnership Opportunity",
  "messagePreview": "Looking for a reliable implementation partner.",
  "capturedAt": "2026-04-01T12:25:00.000Z",
  "sourcePayload": {
    "subject": "Partnership Opportunity",
    "message": "Hello Team, I am reaching out from TechFin Solutions. We are looking for a reliable implementation partner for our banking clients. Would you be open to a discovery call?",
    "attachments": [
      "partnership_deck.pdf"
    ]
  }
}
```

### 7. LinkedIn

```json
{
  "sourceType": "LINKEDIN",
  "externalSourceId": "li-7001",
  "name": "James Cameron",
  "email": "james.cameron@visionary.com",
  "companyName": "Visionary Tech",
  "messagePreview": "Would love to connect and learn more.",
  "capturedAt": "2026-04-01T12:30:00.000Z",
  "sourcePayload": {
    "profileUrl": "linkedin.com/in/jamescameron",
    "message": "Saw your post about AI-driven analytics. Would love to connect and learn more."
  }
}
```

## Source Payload Expectations

The backend validates `sourcePayload` based on `sourceType`.

- `WEB_FORM`: include at least one of `subject`, `message`, `pageSource`
- `AI_ASSISTANT`: include `chatLog` or `sessionDuration` or `transcript`
- `WHATSAPP`: include `chatHistory` or `lastMessage`
- `RESOURCE_DOWNLOAD`: include `contentTitle` or `contentType`
- `EVENT_REGISTRATION`: include `webinarTitle` or `webinarDate`
- `EMAIL_INQUIRY`: include `subject` or `message`
- `LINKEDIN`: include `profileUrl` or `message`
## Integration Notes

- `externalSourceId` should be unique per source event
- retries from the same source should reuse the same `externalSourceId`
- use ISO datetime for `capturedAt`
- send `messagePreview` when available to improve list display in the UI
- keep `sourcePayload` structured because the lead detail drawer reads source-specific fields from it

## Expected Usage Flow

1. Tenant admin gets `clientId` and `clientSecret`
2. Tenant website or connector stores those credentials securely
3. External source sends leads to `POST /v1/leads/intake`
4. ERP saves the lead in the tenant database
5. Logged-in ERP users work on the saved lead using bearer-token protected APIs
