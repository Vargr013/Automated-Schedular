'use client'

import { useState } from 'react'
import { UploadCloud } from 'lucide-react' // Using UploadCloud as a "Publish" icon
import PublishModal from './PublishModal'

export default function PublishButton({ currentMonth }: { currentMonth: string }) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="btn"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: '#10b981', // Emerald/Green for active action
                    color: 'white',
                    border: 'none'
                }}
            >
                <UploadCloud size={16} />
                <span>Publish</span>
            </button>
            <PublishModal isOpen={isOpen} onClose={() => setIsOpen(false)} currentMonth={currentMonth} />
        </>
    )
}
