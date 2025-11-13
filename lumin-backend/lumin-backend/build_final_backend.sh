#!/bin/bash

# Create package.json
cat > package.json << 'EOF'
{
  "name": "lumin-backend-final",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "node server.js",
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "@anthropic-ai/sdk": "^0.28.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "better-sqlite3": "^11.0.0"
  }
}
EOF

# Create server with Claude API
cat > server.js << 'EOF'
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'lumin-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

// Initialize database
const db = new Database('lumin.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    topic TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Initialize Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    const result = stmt.run(username, passwordHash);

    const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET);

    res.json({ token, username });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);

    res.json({ token, username: user.username });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get user's lessons
app.get('/api/lessons', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM lessons WHERE user_id = ? ORDER BY created_at DESC');
    const lessons = stmt.all(req.user.id);
    
    res.json(lessons.map(l => ({
      ...l,
      content: JSON.parse(l.content)
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

// Delete lesson
app.delete('/api/lessons/:id', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM lessons WHERE id = ? AND user_id = ?');
    stmt.run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

// Generate lesson
app.post('/api/generate', authenticateToken, async (req, res) => {
  try {
    const { topic, difficulty, duration = '30 minutes' } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    console.log(`Generating with Claude: ${topic} (${difficulty})`);

    const prompt = `You are an expert educational content creator. Create a comprehensive, interactive lesson on: "${topic}"

Level: ${difficulty}
Duration: ${duration}

CRITICAL REQUIREMENTS - READ CAREFULLY:

1. VISUAL UNDERSTANDING SECTION:
   - Must include Mermaid diagram code
   - Use flowcharts, sequence diagrams, or concept maps
   - Diagram must visualize the core concept
   - Include 200-300 words explaining the diagram

2. INTERACTIVE EXAMPLE SECTION:
   - Code MUST be complete and runnable
   - Must produce actual output when executed
   - Include print statements to show results
   - Add comments explaining each step
   - MUST work in Python (will run in browser via Pyodide)

3. QUIZ SECTION:
   - Create 5-7 questions (not just 3)
   - Test application and understanding, not memorization
   - Each question needs detailed explanation (4-5 sentences)
   - Mix difficulty levels within the quiz

4. HANDS-ON PROJECT:
   - Must be executable code project
   - Provide complete starter code template
   - Include test cases to validate solution
   - Make it achievable in 20-30 minutes

Return JSON in this EXACT format:

{
  "title": "Engaging, specific lesson title",
  "description": "3-4 sentence hook that makes learner excited",
  "estimatedTime": "${duration}",
  "sections": [
    {
      "title": "Introduction",
      "type": "text",
      "content": "400-500 word engaging introduction with real-world hook"
    },
    {
      "title": "Core Concepts",
      "type": "text",
      "content": "600-700 words explaining key concepts with examples and analogies"
    },
    {
      "title": "Visual Understanding",
      "type": "visual",
      "diagram": "graph TD\\n    A[Start] --> B[Process]\\n    B --> C[End]",
      "diagramType": "mermaid",
      "explanation": "300-400 words explaining what the diagram shows and how to interpret it"
    },
    {
      "title": "Interactive Example",
      "type": "code",
      "language": "python",
      "content": "# Complete, runnable Python code (30-50 lines)\\n# Must include:\\n# - Imports\\n# - Functions with docstrings\\n# - Example usage\\n# - Print statements showing output\\n\\nimport math\\n\\ndef example_function():\\n    result = calculate_something()\\n    print(f'Result: {result}')\\n    return result\\n\\n# Run the example\\nexample_function()",
      "explanation": "300-400 words explaining what happens when code runs, why it works, how to modify it",
      "expectedOutput": "Show what the code prints when executed"
    },
    {
      "title": "Deep Dive",
      "type": "text",
      "content": "500-600 words on advanced topics, edge cases, best practices"
    },
    {
      "title": "Practice Quiz",
      "type": "quiz",
      "questions": [
        {
          "question": "Application-based question requiring understanding",
          "options": ["Wrong with common misconception", "Another wrong", "Correct requiring understanding", "Tricky wrong"],
          "correct": 2,
          "explanation": "4-5 sentences explaining why correct answer is right and others are wrong"
        }
        // ... 6 more questions (7 total)
      ]
    },
    {
      "title": "Hands-On Project",
      "type": "project",
      "content": "400-500 word project description with clear goals",
      "requirements": ["Specific requirement 1", "Specific requirement 2", "Specific requirement 3", "Bonus challenge"],
      "hints": ["Specific hint 1", "Specific hint 2", "Specific hint 3"],
      "starterCode": "# Complete starter template\\n# Student fills in TODOs\\n\\ndef main():\\n    # TODO: Implement this\\n    pass\\n\\nif __name__ == '__main__':\\n    main()",
      "testCases": [
        {"input": "example input", "expected": "expected output"},
        {"input": "test case 2", "expected": "output 2"}
      ]
    },
    {
      "title": "Key Takeaways",
      "type": "text",
      "content": "300-400 word summary with action items and next steps"
    }
  ]
}

QUALITY STANDARDS:
- Total: 3000-4000 words minimum
- All code must be executable Python
- All diagrams must be valid Mermaid syntax
- 7 quiz questions minimum
- Everything must work when user tries it

Return ONLY valid JSON, no markdown.`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8000,
      temperature: 0.8,
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    let content = message.content[0].text;
    
    // Extract JSON from markdown if needed
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                      content.match(/```\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }
    
    content = content.trim();
    const lessonData = JSON.parse(content);

    const lessonId = Date.now().toString();
    const lesson = {
      id: lessonId,
      topic,
      difficulty,
      duration,
      created: new Date().toISOString(),
      ...lessonData
    };

    // Save to database
    const stmt = db.prepare('INSERT INTO lessons (id, user_id, topic, difficulty, content) VALUES (?, ?, ?, ?, ?)');
    stmt.run(lessonId, req.user.id, topic, difficulty, JSON.stringify(lesson));

    console.log('Lesson generated and saved');
    res.json(lesson);

  } catch (error) {
    console.error('Error generating lesson:', error);
    res.status(500).json({ 
      error: 'Failed to generate lesson',
      message: error.message 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Lumin Backend (Claude Edition)',
    claudeConfigured: !!process.env.ANTHROPIC_API_KEY
  });
});

app.listen(port, () => {
  console.log(`🚀 Lumin Backend (Claude Edition) on http://localhost:${port}`);
  console.log(`🤖 Claude API: ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`💾 Database: lumin.db`);
});
EOF

# Create .env.example
cat > .env.example << 'EOF'
# Anthropic API Key (required)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# JWT Secret (change in production)
JWT_SECRET=your-secret-key-here

# Server Configuration
PORT=3001
EOF

cat > .gitignore << 'EOF'
node_modules/
.env
*.db
*.log
.DS_Store
EOF

cat > README.md << 'EOF'
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
EOF

echo "✅ Backend created!"

