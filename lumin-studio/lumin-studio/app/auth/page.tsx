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
