# Lumin Studio

AI-powered lesson generation platform. Creates comprehensive, interactive educational content in 90 seconds using Claude 4 Sonnet.

## Features

- Generates 3000+ word lessons with 8 structured sections
- Interactive quizzes with instant feedback
- Runnable Python code (Pyodide in-browser execution)
- Dynamic Mermaid.js diagrams
- User authentication and lesson management

## Tech Stack

Backend: Node.js, Express, Anthropic Claude API, JWT
Frontend: React 18, Mermaid.js, Pyodide

## Quick Start

### Backend Setup
```bash
cd backend
npm install
```

Create `.env` file:
```
ANTHROPIC_API_KEY=your_key_here
PORT=3001
```

Start server:
```bash
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

App opens at `http://localhost:3000`

## Get API Key

https://console.anthropic.com
