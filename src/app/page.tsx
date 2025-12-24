'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, ShieldCheck } from 'lucide-react'

export default function HomePage() {
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleAdminClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowPasswordInput(true)
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'OneBigPassword123') {
      router.push('/admin')
    } else {
      setError('Incorrect password')
      setPassword('')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(to bottom right, #111827, #1f2937)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'white'
    }}>
      <div style={{
        backgroundColor: '#1f2937',
        padding: '3rem',
        borderRadius: '1.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        maxWidth: '500px',
        width: '90%',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          backgroundColor: '#3b82f6',
          borderRadius: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem'
        }}>
          <ShieldCheck size={32} color="white" />
        </div>

        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '800',
          color: 'white',
          marginBottom: '1rem',
          letterSpacing: '-0.025em'
        }}>
          CityROCK JHB Schedule
        </h1>
        <p style={{
          color: '#9ca3af',
          marginBottom: '2.5rem',
          fontSize: '1.125rem',
          lineHeight: '1.75'
        }}>
          Welcome to the CityROCK JHB Scheduler home page! Please select your role below.
        </p>

        {!showPasswordInput ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Link
              href="/schedule"
              style={{
                display: 'block',
                padding: '1.25rem 2rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '0.75rem',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '1.125rem',
                transition: 'all 0.2s',
                boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              View Schedule
            </Link>

            <button
              onClick={handleAdminClick}
              style={{
                display: 'block',
                padding: '1.25rem 2rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#d1d5db',
                borderRadius: '0.75rem',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '1.125rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.2s',
                cursor: 'pointer',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
              }}
            >
              Admin Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '1.25rem 1rem 1.25rem 3rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  border: error ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.75rem',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: '0' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => { setShowPasswordInput(false); setError(''); }}
                style={{
                  flex: 1,
                  padding: '1rem',
                  backgroundColor: 'transparent',
                  color: '#9ca3af',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  flex: 2,
                  padding: '1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '0.75rem',
                  border: 'none',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Login
              </button>
            </div>
          </form>
        )}
      </div>

      <div style={{ marginTop: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>
        &copy; 2026 Xander Jacobs
      </div>
    </div>
  )
}
