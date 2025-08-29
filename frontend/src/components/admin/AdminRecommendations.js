'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, TrendingUp, BarChart, Truck } from 'lucide-react'
import TransferOptimization from '../Recommendations/TransferOptimization'
import UsageOptimization from '../Recommendations/UsageOptimization'

export default function AdminRecommendations({ session }) {
    const [activeTab, setActiveTab] = useState('transfer')

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">
                    <Lightbulb className="page-title-icon" />
                    AI Recommendations
                </h1>
                <p className="page-subtitle">
                    Optimize your fleet operations with AI-powered insights
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation" style={{ marginBottom: '24px' }}>
                <div className="tab-buttons" style={{ display: 'flex', background: 'white', borderRadius: '12px', padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <button 
                        className={`tab-button ${activeTab === 'transfer' ? 'active' : ''}`}
                        onClick={() => setActiveTab('transfer')}
                        style={{
                            flex: 1,
                            padding: '12px 24px',
                            border: 'none',
                            borderRadius: '8px',
                            background: activeTab === 'transfer' ? '#0070f3' : 'transparent',
                            color: activeTab === 'transfer' ? 'white' : '#666',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Truck size={18} />
                        Transfer Optimization
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'usage' ? 'active' : ''}`}
                        onClick={() => setActiveTab('usage')}
                        style={{
                            flex: 1,
                            padding: '12px 24px',
                            border: 'none',
                            borderRadius: '8px',
                            background: activeTab === 'usage' ? '#0070f3' : 'transparent',
                            color: activeTab === 'usage' ? 'white' : '#666',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <BarChart size={18} />
                        Usage Optimization
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'transfer' && (
                    <TransferOptimization token={session.accessToken} />
                )}
                {activeTab === 'usage' && (
                    <UsageOptimization token={session.accessToken} />
                )}
            </div>
        </div>
    )
}