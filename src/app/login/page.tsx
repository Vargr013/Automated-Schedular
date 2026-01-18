'use client'

import { authenticate } from '@/app/actions/auth'
import { useActionState } from 'react'

export default function LoginPage() {
    const [errorMessage, dispatch, isPending] = useActionState(authenticate, undefined)

    return (
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
            <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '400px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>Login</h1>
                <form action={dispatch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>Email</label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            required
                            placeholder="admin@example.com"
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '0.25rem',
                                border: '1px solid #d1d5db',
                                backgroundColor: '#ffffff',
                                color: '#000000'
                            }}
                        />
                    </div>
                    <div>
                        <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>Password</label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            required
                            minLength={6}
                            placeholder="••••••"
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '0.25rem',
                                border: '1px solid #d1d5db',
                                backgroundColor: '#ffffff',
                                color: '#000000'
                            }}
                        />
                    </div>
                    {errorMessage && (
                        <div style={{ color: '#ef4444', fontSize: '0.875rem' }}>{errorMessage}</div>
                    )}
                    <button
                        type="submit"
                        disabled={isPending}
                        style={{
                            backgroundColor: '#000',
                            color: 'white',
                            padding: '0.75rem',
                            borderRadius: '0.25rem',
                            fontWeight: '600',
                            cursor: isPending ? 'not-allowed' : 'pointer',
                            opacity: isPending ? 0.7 : 1
                        }}
                    >
                        {isPending ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    )
}
