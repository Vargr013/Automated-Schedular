'use client'

import { useState } from 'react'
import Link from 'next/link'

type User = {
    id: number
    name: string
}

export default function UserSearch({ users }: { users: User[] }) {
    const [searchTerm, setSearchTerm] = useState('')

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <input
                    type="text"
                    placeholder="Search for your name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        fontSize: '1.125rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        color: 'var(--foreground)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                />
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {filteredUsers.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '2rem' }}>
                        No staff members found matching "{searchTerm}"
                    </div>
                ) : (
                    filteredUsers.map(user => (
                        <Link
                            key={user.id}
                            href={`/schedule/${user.id}`}
                            style={{
                                display: 'block',
                                padding: '1.5rem',
                                backgroundColor: 'var(--background)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                textDecoration: 'none',
                                color: 'var(--foreground)',
                                fontWeight: '500',
                                fontSize: '1.125rem',
                                textAlign: 'center',
                                transition: 'all 0.2s',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        >
                            {user.name}
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
