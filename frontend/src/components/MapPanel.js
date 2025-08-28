'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    MapPin, Truck, X, RefreshCw, Filter, Navigation,
    Clock, User, Settings, ZoomIn, ZoomOut, Maximize2, Calendar
} from 'lucide-react'

const MapPanel = ({ isOpen, onClose }) => {
    const { data: session } = useSession()
    const [machines, setMachines] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedMachine, setSelectedMachine] = useState(null)
    const [statusFilter, setStatusFilter] = useState('all')
    const [mapCenter, setMapCenter] = useState({ lat: 12.9716, lng: 77.5946 }) // Bangalore
    const [zoomLevel, setZoomLevel] = useState(10)

    useEffect(() => {
        if (isOpen && session) {
            fetchMachineLocations()
        }
    }, [isOpen, session])

    const fetchMachineLocations = async () => {
        try {
            setLoading(true)
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recommendations/machine-locations`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })
            
            if (response.ok) {
                const data = await response.json()
                setMachines(data.data?.locations || [])
            }
            
        } catch (error) {
            console.error('Error fetching machine locations:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status) => {
        const colors = {
            'Ready': '#28a745',
            'Occupied': '#ffc107',
            'In-transit': '#17a2b8',
            'Maintenance': '#dc3545'
        }
        return colors[status] || '#6c757d'
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Ready': return '🟢'
            case 'Occupied': return '🟡'
            case 'In-transit': return '🔵'
            case 'Maintenance': return '🔴'
            default: return '⚪'
        }
    }

    const filteredMachines = machines.filter(machine => 
        statusFilter === 'all' || machine.status === statusFilter
    )

    const centerOnMachine = (machine) => {
        setMapCenter({ lat: machine.latitude, lng: machine.longitude })
        setSelectedMachine(machine)
        setZoomLevel(15)
    }

    const resetView = () => {
        setMapCenter({ lat: 12.9716, lng: 77.5946 })
        setZoomLevel(10)
        setSelectedMachine(null)
    }

    if (!isOpen) return null

    return (
        <div className="map-panel-overlay">
            <div className="map-panel">
                {/* Header */}
                <div className="map-panel-header">
                    <div className="map-panel-title">
                        <MapPin size={24} />
                        <div>
                            <h2>Machine Locations</h2>
                            <p>Real-time positioning of your machines</p>
                        </div>
                    </div>
                    <button className="map-panel-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Controls */}
                <div className="map-controls">
                    <div className="map-controls-left">
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="map-filter-select"
                        >
                            <option value="all">All Machines ({machines.length})</option>
                            <option value="Ready">Ready ({machines.filter(m => m.status === 'Ready').length})</option>
                            <option value="Occupied">Occupied ({machines.filter(m => m.status === 'Occupied').length})</option>
                            <option value="In-transit">In Transit ({machines.filter(m => m.status === 'In-transit').length})</option>
                            <option value="Maintenance">Maintenance ({machines.filter(m => m.status === 'Maintenance').length})</option>
                        </select>
                        
                        <button className="map-btn" onClick={fetchMachineLocations} disabled={loading}>
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                        
                        <button className="map-btn" onClick={resetView}>
                            <Navigation size={16} />
                        </button>
                    </div>

                    <div className="map-controls-right">
                        <button className="map-btn" onClick={() => setZoomLevel(Math.min(18, zoomLevel + 1))}>
                            <ZoomIn size={16} />
                        </button>
                        <button className="map-btn" onClick={() => setZoomLevel(Math.max(8, zoomLevel - 1))}>
                            <ZoomOut size={16} />
                        </button>
                    </div>
                </div>

                {/* Map Content */}
                <div className="map-content">
                    {loading ? (
                        <div className="map-loading">
                            <RefreshCw className="animate-spin" size={32} />
                            <p>Loading machine locations...</p>
                        </div>
                    ) : (
                        <>
                            {/* Simplified Map View */}
                            <div className="map-container">
                                <div className="map-grid">
                                    {filteredMachines.map((machine) => (
                                        <div
                                            key={machine.machineID}
                                            className={`map-marker ${selectedMachine?.machineID === machine.machineID ? 'selected' : ''}`}
                                            onClick={() => centerOnMachine(machine)}
                                            style={{
                                                left: `${((machine.longitude - mapCenter.lng + 0.5) * 100) % 100}%`,
                                                top: `${((mapCenter.lat - machine.latitude + 0.5) * 100) % 100}%`,
                                                borderColor: getStatusColor(machine.status)
                                            }}
                                        >
                                            <div className="marker-icon">
                                                <Truck size={16} style={{ color: getStatusColor(machine.status) }} />
                                            </div>
                                            <div className="marker-status">{getStatusIcon(machine.status)}</div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Map Background */}
                                <div className="map-background">
                                    <div className="map-grid-lines"></div>
                                    <div className="map-center-indicator">
                                        <div className="center-dot"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Machine List */}
                            <div className="machine-list">
                                <div className="machine-list-header">
                                    <h3>Machines ({filteredMachines.length})</h3>
                                </div>
                                
                                <div className="machine-list-items">
                                    {filteredMachines.map((machine) => (
                                        <div 
                                            key={machine.machineID}
                                            className={`machine-item ${selectedMachine?.machineID === machine.machineID ? 'selected' : ''}`}
                                            onClick={() => centerOnMachine(machine)}
                                        >
                                            <div className="machine-item-header">
                                                <div className="machine-basic-info">
                                                    <Truck size={16} style={{ color: getStatusColor(machine.status) }} />
                                                    <span className="machine-id">{machine.machineID}</span>
                                                    <span className="machine-type">{machine.machineType}</span>
                                                </div>
                                                <span 
                                                    className="machine-status-badge"
                                                    style={{ backgroundColor: getStatusColor(machine.status) }}
                                                >
                                                    {machine.status}
                                                </span>
                                            </div>
                                            
                                            <div className="machine-location-info">
                                                <MapPin size={14} />
                                                <span>{machine.address}</span>
                                            </div>
                                            
                                            {machine.userID && (
                                                <div className="machine-user-info">
                                                    <User size={14} />
                                                    <span>Assigned to user</span>
                                                </div>
                                            )}
                                            
                                            <div className="machine-updated">
                                                <Clock size={14} />
                                                <span>Updated {new Date(machine.lastUpdated).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Selected Machine Details */}
                {selectedMachine && (
                    <div className="selected-machine-panel">
                        <div className="selected-machine-header">
                            <h4>{selectedMachine.machineID} - {selectedMachine.machineType}</h4>
                            <button onClick={() => setSelectedMachine(null)}>
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div className="selected-machine-details">
                            <div className="detail-row">
                                <span className="detail-label">Status:</span>
                                <span 
                                    className="detail-value status"
                                    style={{ color: getStatusColor(selectedMachine.status) }}
                                >
                                    {selectedMachine.status}
                                </span>
                            </div>
                            
                            <div className="detail-row">
                                <span className="detail-label">Location:</span>
                                <span className="detail-value">{selectedMachine.address}</span>
                            </div>
                            
                            {selectedMachine.siteID && (
                                <div className="detail-row">
                                    <span className="detail-label">Site ID:</span>
                                    <span className="detail-value">{selectedMachine.siteID}</span>
                                </div>
                            )}
                            
                            <div className="detail-row">
                                <span className="detail-label">Coordinates:</span>
                                <span className="detail-value">
                                    {selectedMachine.latitude.toFixed(4)}, {selectedMachine.longitude.toFixed(4)}
                                </span>
                            </div>
                            
                            {selectedMachine.userInfo && (
                                <>
                                    <div className="detail-row">
                                        <span className="detail-label">Assigned User:</span>
                                        <span className="detail-value">{selectedMachine.userInfo.userName}</span>
                                    </div>
                                    {selectedMachine.userInfo.userEmail && (
                                        <div className="detail-row">
                                            <span className="detail-label">Contact:</span>
                                            <span className="detail-value">{selectedMachine.userInfo.userEmail}</span>
                                        </div>
                                    )}
                                </>
                            )}
                            
                            {selectedMachine.engineHoursPerDay > 0 && (
                                <div className="detail-row">
                                    <span className="detail-label">Engine Hours/Day:</span>
                                    <span className="detail-value">{selectedMachine.engineHoursPerDay}</span>
                                </div>
                            )}
                            
                            {selectedMachine.operatingDays > 0 && (
                                <div className="detail-row">
                                    <span className="detail-label">Operating Days:</span>
                                    <span className="detail-value">{selectedMachine.operatingDays}</span>
                                </div>
                            )}
                            
                            {selectedMachine.checkOutDate && (
                                <div className="detail-row">
                                    <span className="detail-label">Check Out:</span>
                                    <span className="detail-value">
                                        {new Date(selectedMachine.checkOutDate).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                            
                            {selectedMachine.checkInDate && (
                                <div className="detail-row">
                                    <span className="detail-label">Check In:</span>
                                    <span className="detail-value">
                                        {new Date(selectedMachine.checkInDate).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                            
                            <div className="detail-row">
                                <span className="detail-label">Last Updated:</span>
                                <span className="detail-value">
                                    {new Date(selectedMachine.lastUpdated).toLocaleString()}
                                </span>
                            </div>
                        </div>
                        
                        <div className="selected-machine-actions">
                            <button className="map-btn-primary">
                                <Navigation size={14} />
                                Get Directions
                            </button>
                            <button className="map-btn-secondary">
                                <Settings size={14} />
                                Manage
                            </button>
                        </div>
                    </div>
                )}

                {/* Legend */}
                <div className="map-legend">
                    <h4>Status Legend</h4>
                    <div className="legend-items">
                        {['Ready', 'Occupied', 'In-transit', 'Maintenance'].map(status => (
                            <div key={status} className="legend-item">
                                <div 
                                    className="legend-color"
                                    style={{ backgroundColor: getStatusColor(status) }}
                                ></div>
                                <span>{status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MapPanel