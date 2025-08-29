'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, TrendingUp, BarChart, Truck, RefreshCw, Zap, Sparkles } from 'lucide-react'
import TransferOptimization from '../Recommendations/TransferOptimization'
import UsageOptimization from '../Recommendations/UsageOptimization'

export default function AdminRecommendations({ session }) {
    const [activeTab, setActiveTab] = useState('transfer')
    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)

    const refreshData = () => {
        setLoading(true)
        // Trigger refresh in child components
        window.dispatchEvent(new CustomEvent('refreshRecommendations'))
        setTimeout(() => setLoading(false), 1000)
    }

    const generateRecommendations = async () => {
        try {
            setGenerating(true)
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recommendations/generate-recommendations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                },
            })
            
            const result = await response.json()
            
            if (result.success) {
                // Show success message
                alert(`✅ Generated ${result.data.transfer_opportunities_generated} transfer opportunities and AI-powered usage recommendations!`)
                
                // Refresh the data
                refreshData()
            } else {
                alert('❌ Failed to generate recommendations: ' + result.message)
            }
        } catch (error) {
            console.error('Error generating recommendations:', error)
            alert('❌ Error generating recommendations. Please try again.')
        } finally {
            setGenerating(false)
        }
    }

    return (
        <div>
            {/* Page Header */}
            <div className="page-header" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '24px',
                padding: '24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                color: 'white'
            }}>
                <div>
                    <h1 className="page-title" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        fontSize: '28px', 
                        fontWeight: '700',
                        color: 'white',
                        margin: '0 0 8px 0'
                    }}>
                        <Lightbulb className="page-title-icon" size={32} style={{ color: '#ffd700' }} />
                        AI-Powered Recommendations
                    </h1>
                    <p className="page-subtitle" style={{ 
                        fontSize: '16px', 
                        color: 'rgba(255,255,255,0.9)', 
                        margin: 0 
                    }}>
                        Optimize your fleet operations with intelligent insights and automated recommendations
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={generateRecommendations}
                        disabled={generating}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 20px',
                            background: generating ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.95)',
                            color: generating ? 'rgba(255,255,255,0.7)' : '#667eea',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: generating ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                    >
                        {generating ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                Generate AI Recommendations
                            </>
                        )}
                    </button>
                    <button
                        onClick={refreshData}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 16px',
                            background: 'rgba(255,255,255,0.1)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '12px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                            transition: 'all 0.2s'
                        }}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation" style={{ marginBottom: '24px' }}>
                <div className="tab-buttons" style={{ 
                    display: 'flex', 
                    background: 'white', 
                    borderRadius: '12px', 
                    padding: '6px', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
                }}>
                    <button 
                        className={`tab-button ${activeTab === 'transfer' ? 'active' : ''}`}
                        onClick={() => setActiveTab('transfer')}
                        style={{
                            flex: 1,
                            padding: '14px 24px',
                            border: 'none',
                            borderRadius: '8px',
                            background: activeTab === 'transfer' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                            color: activeTab === 'transfer' ? 'white' : '#666',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            fontWeight: '600',
                            fontSize: '14px',
                            boxShadow: activeTab === 'transfer' ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none'
                        }}
                    >
                        <Truck size={18} />
                        Transfer Optimization
                        <Zap size={14} style={{ opacity: 0.7 }} />
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'usage' ? 'active' : ''}`}
                        onClick={() => setActiveTab('usage')}
                        style={{
                            flex: 1,
                            padding: '14px 24px',
                            border: 'none',
                            borderRadius: '8px',
                            background: activeTab === 'usage' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                            color: activeTab === 'usage' ? 'white' : '#666',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            fontWeight: '600',
                            fontSize: '14px',
                            boxShadow: activeTab === 'usage' ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none'
                        }}
                    >
                        <BarChart size={18} />
                        Usage Optimization
                        <Sparkles size={14} style={{ opacity: 0.7 }} />
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