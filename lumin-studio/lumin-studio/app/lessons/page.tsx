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
