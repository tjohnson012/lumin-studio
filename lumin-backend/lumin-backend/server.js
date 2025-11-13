import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'lumin-secret';

app.use(cors());
app.use(express.json());

const DB_FILE = 'database.json';

function readDB() {
  if (!fs.existsSync(DB_FILE)) return { users: [], lessons: [] };
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const auth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  
  const db = readDB();
  if (db.users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'User exists' });
  }

  const user = { id: Date.now(), username, passwordHash: hashPassword(password) };
  db.users.push(user);
  writeDB(db);

  const token = jwt.sign({ id: user.id, username }, JWT_SECRET);
  res.json({ token, username });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.username === username && u.passwordHash === hashPassword(password));
  
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username }, JWT_SECRET);
  res.json({ token, username });
});

app.get('/api/lessons', auth, (req, res) => {
  const db = readDB();
  res.json(db.lessons.filter(l => l.userId === req.user.id));
});

app.delete('/api/lessons/:id', auth, (req, res) => {
  const db = readDB();
  db.lessons = db.lessons.filter(l => !(l.id === req.params.id && l.userId === req.user.id));
  writeDB(db);
  res.json({ success: true });
});

app.post('/api/generate', auth, async (req, res) => {
  try {
    const { topic, difficulty, duration = '30 minutes' } = req.body;
    console.log(`🤖 Claude generating: ${topic}`);

    // Try the latest model first, fallback if needed
    let modelToUse = "claude-sonnet-4-20250514";
    
    const message = await anthropic.messages.create({
      model: modelToUse,
      max_tokens: 8000,
      temperature: 0.8,
      messages: [{
        role: "user",
        content: `Create interactive lesson on "${topic}" (${difficulty}, ${duration}). 

JSON format:
{"title":"...","description":"...","estimatedTime":"${duration}",
"sections":[
  {"title":"Introduction","type":"text","content":"400-500 words"},
  {"title":"Core Concepts","type":"text","content":"600-700 words"},
  {"title":"Visual Understanding","type":"visual","diagram":"graph TD\\nA-->B","diagramType":"mermaid","explanation":"300 words"},
  {"title":"Interactive Example","type":"code","language":"python","content":"import math\\ndef calc():\\n  print('test')\\ncalc()","explanation":"300 words","expectedOutput":"output"},
  {"title":"Deep Dive","type":"text","content":"500 words"},
  {"title":"Practice Quiz","type":"quiz","questions":[{"question":"Q","options":["A","B","C","D"],"correct":2,"explanation":"why"}]},
  {"title":"Hands-On Project","type":"project","content":"400 words","requirements":["r1"],"hints":["h1"],"starterCode":"# code","testCases":[{"input":"x","expected":"y"}]},
  {"title":"Key Takeaways","type":"text","content":"300 words"}
]}

- 7+ quiz questions
- Runnable Python code
- Valid Mermaid syntax
- 3000+ words total

Return ONLY JSON.`
      }]
    }).catch(async (err) => {
      // If that model fails, try fallback
      if (err.message.includes('not_found')) {
        console.log('⚠️ Trying fallback model...');
        modelToUse = "claude-sonnet-4-20250514";
        return anthropic.messages.create({
          model: modelToUse,
          max_tokens: 8000,
          temperature: 0.8,
          messages: [{
            role: "user",
            content: `Create interactive lesson on "${topic}" (${difficulty}, ${duration}). 

JSON format with 7+ quiz questions, runnable Python code, valid Mermaid diagrams. Return ONLY JSON.

{"title":"...","description":"...","estimatedTime":"${duration}","sections":[...]}`
          }]
        });
      }
      throw err;
    });

    let content = message.content[0].text;
    const match = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (match) content = match[1];
    
    const data = JSON.parse(content.trim());
    const lesson = {
      id: Date.now().toString(),
      userId: req.user.id,
      topic, difficulty, duration,
      created: new Date().toISOString(),
      ...data
    };

    const db = readDB();
    db.lessons.push(lesson);
    writeDB(db);

    console.log(`✅ Done with ${modelToUse}`);
    res.json(lesson);
  } catch (error) {
    console.error('❌', error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', claude: !!process.env.ANTHROPIC_API_KEY });
});

app.listen(port, () => {
  console.log(`🚀 http://localhost:${port}`);
  console.log(`🤖 Claude API Key: ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`📝 Add your key to .env file: ANTHROPIC_API_KEY=sk-ant-...`);
});
