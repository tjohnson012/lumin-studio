#!/bin/bash

# Create Next.js config
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
}
module.exports = nextConfig
EOF

# TypeScript config
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{"name": "next"}],
    "paths": {"@/*": ["./*"]}
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

# Tailwind config
cat > tailwind.config.ts << 'EOF'
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: { extend: {} },
  plugins: [],
};
export default config;
EOF

# PostCSS
cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} }
}
EOF

mkdir -p app/auth app/create app/lessons "app/lesson/[id]"

# Global CSS with BrowseGraph design
cat > app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --gray1: hsl(0, 0%, 8.5%);
  --gray2: hsl(0, 0%, 11%);
  --gray3: hsl(0, 0%, 13.6%);
  --gray4: hsl(0, 0%, 15.8%);
  --gray5: hsl(0, 0%, 17.9%);
  --gray6: hsl(0, 0%, 20.5%);
  --gray7: hsl(0, 0%, 24.3%);
  --gray8: hsl(0, 0%, 31.2%);
  --gray9: hsl(0, 0%, 43.9%);
  --gray10: hsl(0, 0%, 49.4%);
  --gray11: hsl(0, 0%, 62.8%);
  --gray12: hsl(0, 0%, 93%);
}

* { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
body { font-family: system-ui, -apple-system, sans-serif; background: var(--gray1); color: var(--gray12); }
EOF

# Root layout
cat > app/layout.tsx << 'EOF'
import "./globals.css";
export const metadata = { title: "Lumin Studio", description: "AI Course Builder" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark"><body>{children}</body></html>;
}
EOF

# Auth page
cat > app/auth/page.tsx << 'EOF'
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch(`http://localhost:3001/api/auth/${isLogin ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      localStorage.setItem('token', data.token)
      localStorage.setItem('username', data.username)
      router.push('/lessons')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gray1)] p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[var(--gray12)]">Lumin Studio</h1>
          <p className="text-[var(--gray11)] mt-2">Create AI-powered lessons in seconds</p>
        </div>

        <div className="bg-[var(--gray2)] border border-[var(--gray6)] rounded-xl p-8">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg transition ${isLogin ? 'bg-[var(--gray12)] text-[var(--gray1)]' : 'text-[var(--gray11)]'}`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-lg transition ${!isLogin ? 'bg-[var(--gray12)] text-[var(--gray1)]' : 'text-[var(--gray11)]'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--gray3)] border border-[var(--gray6)] rounded-lg text-[var(--gray12)] placeholder-[var(--gray9)]"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--gray3)] border border-[var(--gray6)] rounded-lg text-[var(--gray12)] placeholder-[var(--gray9)]"
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-[var(--gray12)] text-[var(--gray1)] rounded-lg font-medium hover:bg-[var(--gray11)] transition"
            >
              {isLogin ? 'Login' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
EOF

# Home page redirect
cat > app/page.tsx << 'EOF'
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    const token = localStorage.getItem('token')
    router.push(token ? '/lessons' : '/auth')
  }, [router])

  return <div className="min-h-screen flex items-center justify-center bg-[var(--gray1)]">
    <p className="text-[var(--gray11)]">Loading...</p>
  </div>
}
EOF

# Create lesson page
cat > app/create/page.tsx << 'EOF'
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Create() {
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('beginner')
  const [duration, setDuration] = useState('30 minutes')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (!localStorage.getItem('token')) router.push('/auth')
  }, [router])

  const handleGenerate = async () => {
    if (!topic.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('http://localhost:3001/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ topic: topic.trim(), difficulty, duration })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Generation failed')
      }

      const lesson = await res.json()
      router.push(`/lesson/${lesson.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--gray1)] p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[var(--gray12)]">Create Lesson</h1>
            <p className="text-[var(--gray11)] mt-2">AI-powered course generation with Claude</p>
          </div>
          <Link href="/lessons" className="text-[var(--gray11)] hover:text-[var(--gray12)]">← Back</Link>
        </div>

        <div className="bg-[var(--gray2)] border border-[var(--gray6)] rounded-xl p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--gray12)] mb-2">Topic *</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Machine Learning Basics"
              className="w-full px-4 py-3 bg-[var(--gray3)] border border-[var(--gray6)] rounded-lg text-[var(--gray12)] placeholder-[var(--gray9)]"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--gray12)] mb-2">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--gray3)] border border-[var(--gray6)] rounded-lg text-[var(--gray12)]"
                disabled={loading}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--gray12)] mb-2">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--gray3)] border border-[var(--gray6)] rounded-lg text-[var(--gray12)]"
                disabled={loading}
              >
                <option value="15 minutes">15 minutes</option>
                <option value="30 minutes">30 minutes</option>
                <option value="60 minutes">60 minutes</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!topic.trim() || loading}
            className="w-full py-4 bg-[var(--gray12)] text-[var(--gray1)] rounded-lg font-medium hover:bg-[var(--gray11)] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Generating with Claude AI...
              </span>
            ) : 'Generate Lesson'}
          </button>

          <p className="text-xs text-[var(--gray10)] text-center">
            Powered by Claude 3.5 Sonnet • Takes 15-30 seconds
          </p>
        </div>
      </div>
    </div>
  )
}
EOF

# Lessons list
cat > app/lessons/page.tsx << 'EOF'
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Lessons() {
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('username')
    
    if (!token) {
      router.push('/auth')
      return
    }

    setUsername(user || '')
    fetchLessons(token)
  }, [router])

  const fetchLessons = async (token: string) => {
    try {
      const res = await fetch('http://localhost:3001/api/lessons', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setLessons(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lesson?')) return

    try {
      await fetch(`http://localhost:3001/api/lessons/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      setLessons(lessons.filter(l => l.id !== id))
    } catch (err) {
      alert('Failed to delete')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    router.push('/auth')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--gray1)]">
      <p className="text-[var(--gray11)]">Loading...</p>
    </div>
  }

  return (
    <div className="min-h-screen bg-[var(--gray1)] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[var(--gray12)]">Your Lessons</h1>
            <p className="text-[var(--gray11)] mt-1">Welcome back, {username}</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/create"
              className="px-6 py-3 bg-[var(--gray12)] text-[var(--gray1)] rounded-lg font-medium hover:bg-[var(--gray11)] transition"
            >
              + Create Lesson
            </Link>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-[var(--gray3)] text-[var(--gray11)] rounded-lg hover:bg-[var(--gray4)] transition"
            >
              Logout
            </button>
          </div>
        </div>

        {lessons.length === 0 ? (
          <div className="text-center py-20 bg-[var(--gray2)] border border-[var(--gray6)] rounded-xl">
            <p className="text-[var(--gray11)] mb-4">No lessons yet</p>
            <Link
              href="/create"
              className="inline-block px-6 py-3 bg-[var(--gray12)] text-[var(--gray1)] rounded-lg font-medium hover:bg-[var(--gray11)] transition"
            >
              Create Your First Lesson
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="group bg-[var(--gray2)] border border-[var(--gray6)] rounded-xl p-6 hover:border-[var(--gray8)] transition relative"
              >
                <button
                  onClick={() => handleDelete(lesson.id)}
                  className="absolute top-4 right-4 text-[var(--gray9)] hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                  title="Delete lesson"
                >
                  🗑️
                </button>
                
                <Link href={`/lesson/${lesson.id}`} className="block">
                  <h3 className="text-xl font-semibold text-[var(--gray12)] mb-2 pr-8">
                    {lesson.title || lesson.topic}
                  </h3>
                  <p className="text-sm text-[var(--gray11)] capitalize mb-1">
                    {lesson.difficulty} • {lesson.duration}
                  </p>
                  <p className="text-xs text-[var(--gray10)]">
                    {new Date(lesson.created).toLocaleDateString()}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
EOF

echo "✅ Clean frontend built!"
echo "Run: npm run dev"

