# Lumin Backend - Claude Edition

Real AI lesson generation using Claude 3.5 Sonnet.

## Features

- ✅ Claude 3.5 Sonnet API integration
- ✅ User authentication with JWT
- ✅ SQLite database for lesson storage
- ✅ Per-user lesson management
- ✅ Better educational content than GPT-4

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

Get your key: https://console.anthropic.com/settings/keys

3. Run server:
```bash
npm run dev
```

## API Endpoints

### Auth
- POST /api/auth/register - Create account
- POST /api/auth/login - Login

### Lessons (requires auth)
- GET /api/lessons - Get user's lessons
- POST /api/generate - Generate new lesson
- DELETE /api/lessons/:id - Delete lesson

All authenticated endpoints need header:
```
Authorization: Bearer <token>
```
