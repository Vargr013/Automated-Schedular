'use client'

import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export default function HomePage() {
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

          <Link
            href="/login"
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
          </Link>
        </div>
      </div>

      <div style={{ marginTop: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>
        &copy; 2026 Xander Jacobs
      </div>
    </div>
  )
}
