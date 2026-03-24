'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { KeyRound, ShieldAlert, ShieldCheck, ShieldOff, UserRoundCog } from 'lucide-react'
import { disableUserLogin, grantAdminAccess, revokeAdminAccess, setUserPassword } from '@/app/actions/admin-users'

type AdminUser = {
    id: number
    name: string
    email: string
    type: string
    category: string
    role: string
    hasPassword: boolean
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'Something went wrong. Please try again.'
}

export default function AdminUsersManager({
    users,
    currentUserId,
}: {
    users: AdminUser[]
    currentUserId: number | null
}) {
    const [selectedPasswordUser, setSelectedPasswordUser] = useState<AdminUser | null>(null)
    const [busyKey, setBusyKey] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const adminCount = useMemo(() => users.filter((user) => user.role === 'ADMIN').length, [users])
    const loginCount = useMemo(() => users.filter((user) => user.hasPassword).length, [users])
    const activeAdminLoginCount = useMemo(() => users.filter((user) => user.role === 'ADMIN' && user.hasPassword).length, [users])

    const runAction = (key: string, action: () => Promise<void>, successMessage?: string) => {
        startTransition(async () => {
            setBusyKey(key)

            try {
                await action()
                if (successMessage) {
                    window.alert(successMessage)
                }
            } catch (error) {
                window.alert(getErrorMessage(error))
            } finally {
                setBusyKey(null)
            }
        })
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Admin Users</h1>
                    <p style={{ margin: '0.45rem 0 0', color: 'var(--muted-foreground)', maxWidth: '760px', lineHeight: 1.6 }}>
                        Admin access is attached to existing staff accounts in this build. Add the person on the staff screen first, then grant admin access and set their password here.
                    </p>
                </div>
                <Link href="/admin/staff" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                    <UserRoundCog size={16} />
                    Manage Staff
                </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card">
                    <div className="roster-summary-label">Admin Accounts</div>
                    <div className="roster-summary-value">{adminCount}</div>
                    <div className="roster-summary-note">Users currently marked with the `ADMIN` role.</div>
                </div>
                <div className="card">
                    <div className="roster-summary-label">Enabled Logins</div>
                    <div className="roster-summary-value">{loginCount}</div>
                    <div className="roster-summary-note">Users with a password set and able to sign in.</div>
                </div>
                <div className="card">
                    <div className="roster-summary-label">Active Admin Logins</div>
                    <div className="roster-summary-value">{activeAdminLoginCount}</div>
                    <div className="roster-summary-note">Admin users who currently have a working login.</div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                    <ShieldAlert size={18} style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                    <div style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
                        Removing admin access and disabling logins are protected so the system always keeps at least one active admin login.
                        Your own admin role and login also cannot be removed from this screen while you are signed in.
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--muted)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>User</th>
                                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>Staff</th>
                                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>Admin Role</th>
                                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>Login</th>
                                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => {
                                const isCurrentUser = currentUserId === user.id
                                const roleActionKey = `role-${user.id}`
                                const passwordActionKey = `password-${user.id}`
                                const disableActionKey = `disable-${user.id}`

                                return (
                                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                                                {user.name}
                                                {isCurrentUser ? (
                                                    <span style={{ marginLeft: '0.45rem', fontSize: '0.74rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>(You)</span>
                                                ) : null}
                                            </div>
                                            <div style={{ marginTop: '0.25rem', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>{user.email}</div>
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', color: 'var(--muted-foreground)' }}>
                                            <div>{user.type === 'FULL_TIME' ? 'Full Time' : 'Part Time'}</div>
                                            <div style={{ marginTop: '0.25rem', fontSize: '0.82rem' }}>{user.category}</div>
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.35rem',
                                                    padding: '0.3rem 0.6rem',
                                                    borderRadius: '999px',
                                                    backgroundColor: user.role === 'ADMIN' ? 'rgba(34, 197, 94, 0.14)' : 'rgba(148, 163, 184, 0.14)',
                                                    color: user.role === 'ADMIN' ? '#166534' : 'var(--muted-foreground)',
                                                    fontSize: '0.76rem',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {user.role === 'ADMIN' ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                                                {user.role}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.35rem',
                                                    padding: '0.3rem 0.6rem',
                                                    borderRadius: '999px',
                                                    backgroundColor: user.hasPassword ? 'rgba(var(--primary-rgb), 0.12)' : 'rgba(148, 163, 184, 0.12)',
                                                    color: user.hasPassword ? 'var(--foreground)' : 'var(--muted-foreground)',
                                                    fontSize: '0.76rem',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                <KeyRound size={14} />
                                                {user.hasPassword ? 'Enabled' : 'Not Set'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.55rem', flexWrap: 'wrap' }}>
                                                {user.role === 'ADMIN' ? (
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary"
                                                        disabled={isCurrentUser || (isPending && busyKey === roleActionKey)}
                                                        onClick={() => runAction(
                                                            roleActionKey,
                                                            async () => { await revokeAdminAccess(user.id) },
                                                            `${user.name} no longer has admin access.`
                                                        )}
                                                    >
                                                        Remove Admin
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="btn"
                                                        disabled={isPending && busyKey === roleActionKey}
                                                        onClick={() => runAction(
                                                            roleActionKey,
                                                            async () => { await grantAdminAccess(user.id) },
                                                            `${user.name} can now access the admin area once a password is set.`
                                                        )}
                                                    >
                                                        Grant Admin
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary"
                                                    disabled={isPending && busyKey === passwordActionKey}
                                                    onClick={() => setSelectedPasswordUser(user)}
                                                >
                                                    {user.hasPassword ? 'Reset Password' : 'Set Password'}
                                                </button>
                                                {user.hasPassword ? (
                                                    <button
                                                        type="button"
                                                        className="btn btn-danger"
                                                        disabled={isCurrentUser || (isPending && busyKey === disableActionKey)}
                                                        onClick={() => {
                                                            if (!window.confirm(`Disable login for ${user.name}?`)) {
                                                                return
                                                            }

                                                            runAction(
                                                                disableActionKey,
                                                                async () => { await disableUserLogin(user.id) },
                                                                `Login disabled for ${user.name}.`
                                                            )
                                                        }}
                                                    >
                                                        Disable Login
                                                    </button>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>
                                        No users found.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedPasswordUser ? (
                <div className="modal-overlay" onClick={() => setSelectedPasswordUser(null)}>
                    <div className="modal-content" onClick={(event) => event.stopPropagation()} style={{ maxWidth: '480px', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                                    {selectedPasswordUser.hasPassword ? 'Reset Password' : 'Set Password'}
                                </h3>
                                <p style={{ margin: '0.4rem 0 0', color: 'var(--muted-foreground)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                    This updates the login password for <strong>{selectedPasswordUser.name}</strong>.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedPasswordUser(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--muted-foreground)' }}
                            >
                                &times;
                            </button>
                        </div>

                        <form
                            action={async (formData) => {
                                const actionKey = `password-${selectedPasswordUser.id}`
                                setBusyKey(actionKey)

                                try {
                                    await setUserPassword(selectedPasswordUser.id, formData)
                                    setSelectedPasswordUser(null)
                                    window.alert(`Password updated for ${selectedPasswordUser.name}.`)
                                } catch (error) {
                                    window.alert(getErrorMessage(error))
                                } finally {
                                    setBusyKey(null)
                                }
                            }}
                        >
                            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>New Password</label>
                                <input
                                    name="password"
                                    type="password"
                                    minLength={8}
                                    required
                                    autoFocus
                                    className="input"
                                    placeholder="Minimum 8 characters"
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setSelectedPasswordUser(null)}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn"
                                    disabled={busyKey === `password-${selectedPasswordUser.id}`}
                                >
                                    Save Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
