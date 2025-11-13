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
