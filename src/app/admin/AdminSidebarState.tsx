'use client'

import { useEffect } from 'react'

const STORAGE_KEY = 'admin-sidebar-open'

export default function AdminSidebarState() {
    useEffect(() => {
        const panel = document.querySelector<HTMLDetailsElement>('.admin-sidebar-panel')
        const sidebar = document.querySelector<HTMLElement>('.admin-sidebar')
        if (!panel) return

        const saved = window.localStorage.getItem(STORAGE_KEY)
        if (saved === '0') {
            panel.open = false
        } else if (saved === '1') {
            panel.open = true
        }

        if (sidebar) {
            sidebar.classList.toggle('is-collapsed', !panel.open)
        }

        const onToggle = () => {
            window.localStorage.setItem(STORAGE_KEY, panel.open ? '1' : '0')
            if (sidebar) {
                sidebar.classList.toggle('is-collapsed', !panel.open)
            }
        }

        panel.addEventListener('toggle', onToggle)
        return () => {
            panel.removeEventListener('toggle', onToggle)
        }
    }, [])

    return null
}
