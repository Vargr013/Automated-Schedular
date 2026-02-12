export default function Loading() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem' }}>
            <div style={{
                marginBottom: '1.5rem',
                height: '2rem',
                width: '200px',
                backgroundColor: 'var(--muted)',
                borderRadius: '0.375rem',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />

            <div style={{
                marginBottom: '1rem',
                height: '40px',
                width: '100%',
                backgroundColor: 'var(--muted)',
                borderRadius: '0.375rem',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />

            <div className="card" style={{ flex: 1, backgroundColor: 'var(--card)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ height: '20px', width: '100%', backgroundColor: 'var(--muted)', borderRadius: '4px' }} />
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem' }}>
                        <div style={{ height: '20px', width: '20%', backgroundColor: 'var(--muted)', borderRadius: '4px' }} />
                        <div style={{ height: '20px', width: '30%', backgroundColor: 'var(--muted)', borderRadius: '4px' }} />
                        <div style={{ height: '20px', width: '15%', backgroundColor: 'var(--muted)', borderRadius: '4px' }} />
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                }
            `}</style>
        </div>
    )
}
