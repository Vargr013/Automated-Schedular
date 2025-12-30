'use client'

import { ArrowUp, ArrowDown, DollarSign, Clock } from 'lucide-react'

type Stats = {
    totalCost: number
    totalHours: number
    departmentCosts: Record<string, number>
    departmentHours: Record<string, number>
    typeCosts: Record<string, number>
}

export default function CostDashboard({ stats, budget }: { stats: Stats, budget: number }) {
    const { totalCost, totalHours, departmentCosts, departmentHours, typeCosts } = stats
    const variance = budget - totalCost
    const percentUsed = budget > 0 ? (totalCost / budget) * 100 : 0
    const isOverBudget = totalCost > budget

    const deptData = Object.entries(departmentCosts)
        .sort(([, a], [, b]) => b - a)
        .map(([name, cost]) => ({
            name,
            cost,
            hours: departmentHours[name] || 0,
            percent: totalCost > 0 ? (cost / totalCost) * 100 : 0
        }))

    const typeData = Object.entries(typeCosts)
        .map(([name, cost]) => ({ name, cost, percent: totalCost > 0 ? (cost / totalCost) * 100 : 0 }))

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Top Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="card">
                    <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <DollarSign size={16} /> Total Cost
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{formatCurrency(totalCost)}</div>
                    <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: isOverBudget ? 'red' : 'green', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {isOverBudget ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                        {formatCurrency(Math.abs(variance))} {isOverBudget ? 'Over Budget' : 'Under Budget'}
                    </div>
                </div>

                <div className="card">
                    <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={16} /> Total Hours
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{totalHours.toFixed(1)}</div>
                    <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: 'var(--muted-foreground)' }}>
                        Avg Hourly Cost: {totalHours > 0 ? formatCurrency(totalCost / totalHours) : 'R0.00'}
                    </div>
                </div>

                <div className="card">
                    <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Budget Utilization</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem', color: percentUsed > 100 ? 'red' : percentUsed > 90 ? 'orange' : 'var(--foreground)' }}>
                        {percentUsed.toFixed(1)}%
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--muted)', borderRadius: '4px', marginTop: '1rem', overflow: 'hidden' }}>
                        <div style={{
                            width: `${Math.min(percentUsed, 100)}%`,
                            height: '100%',
                            backgroundColor: percentUsed > 100 ? 'red' : percentUsed > 90 ? 'orange' : 'var(--primary)',
                            transition: 'width 0.5s ease-out'
                        }}></div>
                    </div>
                </div>
            </div>

            {/* Breakdowns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>

                {/* Department Distribution */}
                <div className="card">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.5rem' }}>Cost by Department</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {deptData.map(d => (
                            <div key={d.name}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                                    <span style={{ fontWeight: '500' }}>{d.name} <span style={{ fontWeight: 'normal', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>({d.hours.toFixed(1)}h)</span></span>
                                    <span>{formatCurrency(d.cost)} ({d.percent.toFixed(1)}%)</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--muted)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${d.percent}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '3px' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Employment Type */}
                <div className="card">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.5rem' }}>Cost by Type</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {typeData.map(d => (
                            <div key={d.name}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                                    <span style={{ fontWeight: '500' }}>{d.name === 'FULL_TIME' ? 'Full Time' : d.name === 'PART_TIME' ? 'Part Time' : d.name}</span>
                                    <span>{formatCurrency(d.cost)} ({d.percent.toFixed(1)}%)</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--muted)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${d.percent}%`, height: '100%', backgroundColor: d.name === 'FULL_TIME' ? '#3b82f6' : '#a855f7', borderRadius: '3px' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}
