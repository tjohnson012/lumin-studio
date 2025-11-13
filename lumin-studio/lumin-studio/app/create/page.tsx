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
