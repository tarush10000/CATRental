"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { MapPin, Truck, X, RefreshCw, Navigation, Clock, User, Settings, Calendar, Activity } from "lucide-react";

// === Cesium loader (keeps your class names/UI intact) ===
const CESIUM_BASE = "https://cdn.jsdelivr.net/npm/cesium@1.119.0/Build/Cesium/";
const CESIUM_JS = `${CESIUM_BASE}Cesium.js`;
const CESIUM_CSS = `${CESIUM_BASE}Widgets/widgets.css`;
let cesiumReadyPromise = null;

function loadCesiumOnce() {
    if (typeof window === "undefined") return Promise.resolve();
    if (window.Cesium) return Promise.resolve();
    if (cesiumReadyPromise) return cesiumReadyPromise;

    cesiumReadyPromise = new Promise((resolve) => {
        // Must be set before script loads so workers/assets resolve
        window.CESIUM_BASE_URL = CESIUM_BASE;

        if (!document.querySelector('link[href*="Widgets/widgets.css"]')) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = CESIUM_CSS;
            link.crossOrigin = "";
            document.head.appendChild(link);
        }

        const done = () => resolve();
        if (window.Cesium) return done();

        const script = document.createElement("script");
        script.src = CESIUM_JS;
        script.crossOrigin = "";
        script.async = true;
        script.defer = true;
        script.onload = done;
        script.onerror = done; // fail-soft
        document.head.appendChild(script);
    });

    return cesiumReadyPromise;
}

// Status colors (unchanged)
const STATUS_COLORS = {
    Ready: "#28a745",
    Occupied: "#ffc107",
    "In-transit": "#17a2b8",
    Maintenance: "#dc3545",
};
const getStatusColor = (status) => STATUS_COLORS[status] || "#6c757d";

// SVG pin per status (data URL)
function svgPin(color) {
    const svg = `<?xml version="1.0" encoding="UTF-8"?><svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg"><path d="M16 42s12-12.6 12-24A12 12 0 1 0 4 18c0 11.4 12 24 12 24z" fill="${color}"/><circle cx="16" cy="16" r="6" fill="white"/></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function MapPanel({ isOpen, onClose }) {
    const { data: session } = useSession();
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [leafletLoaded, setLeafletLoaded] = useState(false); // keep same name used in UI
    const [is3D, setIs3D] = useState(true);

    const mapRef = useRef(null); // container (keeps class name 'leaflet-map')
    const viewerRef = useRef(null); // Cesium.Viewer
    const markersRef = useRef({}); // id -> Cesium.Entity
    const iconCacheRef = useRef({}); // status -> dataURL
    const fitBoundsRaf = useRef(null);
    const loadingTimeoutRef = useRef(null);

    // Load Cesium immediately (do not gate on requestIdle)
    useEffect(() => {
        let mounted = true;
        (async () => {
            await loadCesiumOnce();
            if (mounted) setLeafletLoaded(true);
        })();
        return () => {
            mounted = false;
        };
    }, []);

    // Initialize Cesium when open & library is ready (with Ion token + terrain)
    useEffect(() => {
        if (!isOpen || !leafletLoaded || viewerRef.current || !mapRef.current || !window.Cesium) return;
        try {
            const Cesium = window.Cesium;

            // Ion token (set in your .env as NEXT_PUBLIC_CESIUM_ION_TOKEN)
            const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
            if (ionToken) {
                Cesium.Ion.defaultAccessToken = ionToken;
            } else {
                console.warn("NEXT_PUBLIC_CESIUM_ION_TOKEN is missing. Falling back to OSM imagery and ellipsoid terrain.");
            }

            // Start with a safe imagery provider that works without tokens; we'll upgrade if token exists
            const osmProvider = new Cesium.UrlTemplateImageryProvider({
                url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                subdomains: ["a", "b", "c"],
                credit: "© OpenStreetMap contributors",
            });

            const viewer = new Cesium.Viewer(mapRef.current, {
                animation: false,
                timeline: false,
                geocoder: false,
                homeButton: false,
                fullscreenButton: false,
                navigationHelpButton: false,
                baseLayerPicker: false,
                sceneModePicker: false,
                sceneMode: Cesium.SceneMode.SCENE3D,
                mapProjection: new Cesium.WebMercatorProjection(),
                imageryProvider: osmProvider,
                terrainProvider: new Cesium.EllipsoidTerrainProvider(),
                requestRenderMode: true,
                maximumRenderTimeChange: 2.0,
            });

            // Nice defaults for 3D
            viewer.scene.globe.depthTestAgainstTerrain = true;
            viewer.scene.screenSpaceCameraController.enableTilt = true;

            // If Ion token is available, upgrade imagery + terrain to Cesium World services
            (async () => {
                if (ionToken) {
                    try {
                        const [terrain, worldImagery] = await Promise.all([
                            Cesium.createWorldTerrainAsync(),
                            Cesium.createWorldImageryAsync({ style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS })
                        ]);
                        viewer.terrainProvider = terrain;
                        viewer.imageryLayers.removeAll();
                        viewer.imageryLayers.addImageryProvider(worldImagery);
                        viewer.scene.requestRender();
                    } catch (err) {
                        console.warn("Ion upgrade failed; staying on OSM + ellipsoid.", err);
                    }
                }
            })();

            // Initial view: Bengaluru-ish
            viewer.scene.camera.setView({
                destination: Cesium.Rectangle.fromDegrees(77.3, 12.8, 77.9, 13.1),
            });

            // Nudge render/resize in case container was 0×0 then became visible
            viewer.scene.requestRender();
            setTimeout(() => viewer.resize(), 0);

            viewerRef.current = viewer;
        } catch (e) {
            console.error("Cesium init failed", e);
        }
    }, [isOpen, leafletLoaded]);

    // Keep viewer sized to container
    useEffect(() => {
        if (!mapRef.current) return;
        const ro = new ResizeObserver(() => {
            if (viewerRef.current) viewerRef.current.resize();
        });
        ro.observe(mapRef.current);
        return () => ro.disconnect();
    }, [leafletLoaded]);

    // Fetch machines when opening (with timeout guard)
    useEffect(() => {
        if (!isOpen || !session) return;
        const run = async () => {
            try {
                setLoading(true);
                loadingTimeoutRef.current = setTimeout(() => setLoading(false), 8000);
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recommendations/machine-locations`, {
                    headers: { Authorization: `Bearer ${session.accessToken}` },
                });
                if (res.ok) {
                    const json = await res.json();
                    setMachines(json.data?.locations || []);
                }
            } catch (e) {
                console.error("Error fetching machine locations", e);
            } finally {
                if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
                setLoading(false);
            }
        };
        run();
    }, [isOpen, session]);

    const filteredMachines = useMemo(
        () => machines.filter((m) => (statusFilter === "all" ? true : m.status === statusFilter)),
        [machines, statusFilter]
    );

    // Sync entities with filtered machines
    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer || !window.Cesium) return;
        const Cesium = window.Cesium;

        const existing = markersRef.current; // id -> Entity
        const nextIds = new Set(filteredMachines.map((m) => m.machineID));

        // Remove stale
        for (const id of Object.keys(existing)) {
            if (!nextIds.has(id)) {
                viewer.entities.remove(existing[id]);
                delete existing[id];
            }
        }

        // Add/update
        filteredMachines.forEach((m) => {
            let ent = existing[m.machineID];
            const pos = Cesium.Cartesian3.fromDegrees(m.longitude, m.latitude);
            const color = getStatusColor(m.status);
            if (!iconCacheRef.current[m.status]) iconCacheRef.current[m.status] = svgPin(color);
            const image = iconCacheRef.current[m.status];

            const description = `
        <div class="machine-popup">
          <div class="popup-header">
            <h4>${m.machineID}</h4>
            <span class="popup-status" style="background:${color}">${m.status}</span>
          </div>
          <div class="popup-content">
            <p><strong>Type:</strong> ${m.machineType}</p>
            <p><strong>Location:</strong> ${m.address}</p>
            ${m.siteID ? `<p><strong>Site:</strong> ${m.siteID}</p>` : ""}
            ${m.userInfo ? `<p><strong>Assigned to:</strong> ${m.userInfo.userName}</p>` : ""}
          </div>
        </div>`;

            if (!ent) {
                ent = viewer.entities.add({
                    id: m.machineID,
                    position: pos,
                    billboard: {
                        image,
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                        scale: 1,
                    },
                    description,
                });
                existing[m.machineID] = ent;
            } else {
                ent.position = pos;
                ent.billboard.image = image;
                ent.description = description;
            }
        });

        // Fit to markers (throttled)
        if (fitBoundsRaf.current) cancelAnimationFrame(fitBoundsRaf.current);
        if (filteredMachines.length > 0) {
            fitBoundsRaf.current = requestAnimationFrame(() => {
                const lats = filteredMachines.map((m) => m.latitude);
                const lons = filteredMachines.map((m) => m.longitude);
                const west = Math.min(...lons);
                const east = Math.max(...lons);
                const south = Math.min(...lats);
                const north = Math.max(...lats);
                const pad = 0.02;
                viewer.scene.camera.flyTo({
                    destination: Cesium.Rectangle.fromDegrees(west - pad, south - pad, east + pad, north + pad),
                    duration: 0.6,
                });
            });
        }
    }, [filteredMachines]);

    // Center on machine & open info
    const centerOnMachine = (m) => {
        const viewer = viewerRef.current;
        if (!viewer) return;
        const ent = markersRef.current[m.machineID];
        if (!ent) return;
        viewer.flyTo(ent, { duration: 0.4 });
        viewer.selectedEntity = ent;
        setSelectedMachine(m);
    };

    const resetView = () => {
        const viewer = viewerRef.current;
        if (!viewer || machines.length === 0 || !window.Cesium) return;
        const Cesium = window.Cesium;
        const lats = machines.map((m) => m.latitude);
        const lons = machines.map((m) => m.longitude);
        const west = Math.min(...lons);
        const east = Math.max(...lons);
        const south = Math.min(...lats);
        const north = Math.max(...lats);
        const pad = 0.02;
        viewer.scene.camera.flyTo({
            destination: Cesium.Rectangle.fromDegrees(west - pad, south - pad, east + pad, north + pad),
            duration: 0.6,
        });
        setSelectedMachine(null);
    };

    const toggle3D = () => {
        const viewer = viewerRef.current;
        if (!viewer || !window.Cesium) return;
        const Cesium = window.Cesium;
        if (viewer.scene.mode === Cesium.SceneMode.SCENE3D) {
            viewer.scene.morphTo2D(0.5);
            setIs3D(false);
        } else {
            viewer.scene.morphTo3D(0.5);
            setIs3D(true);
        }
    };

    // Cleanup
    useEffect(() => () => {
        if (viewerRef.current && viewerRef.current.destroy) {
            viewerRef.current.destroy();
            viewerRef.current = null;
        }
    }, []);

    if (!isOpen) return null;

    return (
        <div className="map-panel-overlay">
            <div className="map-panel">
                {/* Header */}
                <div className="map-panel-header">
                    <div className="map-panel-title">
                        <MapPin size={24} className="map-title-icon" />
                        <div>
                            <h2>Machine Locations</h2>
                            <p>Real-time positioning of your machines</p>
                        </div>
                    </div>
                    <div className="header-actions">
                        <button className="map-panel-close" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Controls */}
                <div className="map-controls">
                    <div className="map-controls-left">
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="map-filter-select">
                            <option value="all">All Machines ({machines.length})</option>
                            <option value="Ready">Ready ({machines.filter((m) => m.status === "Ready").length})</option>
                            <option value="Occupied">Occupied ({machines.filter((m) => m.status === "Occupied").length})</option>
                            <option value="In-transit">In Transit ({machines.filter((m) => m.status === "In-transit").length})</option>
                            <option value="Maintenance">Maintenance ({machines.filter((m) => m.status === "Maintenance").length})</option>
                        </select>

                        <button
                            className="map-btn"
                            onClick={() => {
                                if (!session) return;
                                (async () => {
                                    try {
                                        setLoading(true);
                                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recommendations/machine-locations`, {
                                            headers: { Authorization: `Bearer ${session.accessToken}` },
                                        });
                                        if (res.ok) {
                                            const json = await res.json();
                                            setMachines(json.data?.locations || []);
                                        }
                                    } finally {
                                        setLoading(false);
                                    }
                                })();
                            }}
                            disabled={loading}
                            title="Refresh"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        </button>

                        <button className="map-btn" onClick={resetView} title="Reset View">
                            <Navigation size={16} />
                        </button>

                        {/* 2D/3D toggle (uses the same .map-btn class) */}
                        <button className="map-btn" onClick={toggle3D} title={is3D ? "Switch to 2D" : "Switch to 3D"}>
                            {is3D ? "2D" : "3D"}
                        </button>
                    </div>

                    <div className="map-controls-right">
                        <div className="machines-count">
                            <Activity size={16} />
                            <span>{filteredMachines.length} shown</span>
                        </div>
                    </div>
                </div>

                {/* Map Content */}
                <div className="map-content">
                    <div className="map-container" style={{ position: "relative" }}>
                        {/* Always mount the map; overlay the loader */}
                        <div ref={mapRef} className="leaflet-map" />
                        {loading && (
                            <div className="map-loading" style={{ position: "absolute", inset: 0, zIndex: 2 }}>
                                <RefreshCw className="animate-spin" size={32} />
                                <p>Loading machine locations...</p>
                                {!leafletLoaded && (
                                    <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>Loading map service...</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Machine List Sidebar */}
                    <div className="machine-list-sidebar">
                        <div className="machine-list-header">
                            <h3>Machines ({filteredMachines.length})</h3>
                            {selectedMachine && (
                                <button className="clear-selection" onClick={() => setSelectedMachine(null)}>
                                    Clear Selection
                                </button>
                            )}
                        </div>

                        <div className="machine-list-items">
                            {filteredMachines.map((m) => (
                                <div
                                    key={m.machineID}
                                    className={`machine-item ${selectedMachine?.machineID === m.machineID ? "selected" : ""}`}
                                    onClick={() => centerOnMachine(m)}
                                >
                                    <div className="machine-item-header">
                                        <div className="machine-basic-info">
                                            <div className="machine-icon" style={{ backgroundColor: getStatusColor(m.status) }}>
                                                <Truck size={14} />
                                            </div>
                                            <div className="machine-details">
                                                <span className="machine-id">{m.machineID}</span>
                                                <span className="machine-type">{m.machineType}</span>
                                            </div>
                                        </div>
                                        <span className="machine-status-badge" style={{ backgroundColor: getStatusColor(m.status) }}>
                                            {m.status}
                                        </span>
                                    </div>

                                    <div className="machine-info-grid">
                                        <div className="info-item">
                                            <MapPin size={12} />
                                            <span>{m.address}</span>
                                        </div>
                                        {m.siteID && (
                                            <div className="info-item">
                                                <Settings size={12} />
                                                <span>Site: {m.siteID}</span>
                                            </div>
                                        )}
                                        {m.userInfo && (
                                            <div className="info-item">
                                                <User size={12} />
                                                <span>{m.userInfo.userName}</span>
                                            </div>
                                        )}
                                        <div className="info-item">
                                            <Clock size={12} />
                                            <span>{new Date(m.lastUpdated).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    {m.engineHoursPerDay > 0 && (
                                        <div className="machine-stats">
                                            <div className="stat-badge">
                                                <Activity size={12} />
                                                <span>{m.engineHoursPerDay}h/day</span>
                                            </div>
                                            {m.operatingDays > 0 && (
                                                <div className="stat-badge">
                                                    <Calendar size={12} />
                                                    <span>{m.operatingDays} days</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {filteredMachines.length === 0 && !loading && (
                                <div className="empty-machine-list">
                                    <Truck size={32} className="empty-icon" />
                                    <p>No machines match the current filter</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Status Legend */}
                <div className="map-legend">
                    <h4>Status Legend</h4>
                    <div className="legend-items">
                        {["Ready", "Occupied", "In-transit", "Maintenance"].map((status) => (
                            <div key={status} className="legend-item">
                                <div className="legend-color" style={{ backgroundColor: getStatusColor(status) }} />
                                <span>{status}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Selected Machine Details Panel */}
                {selectedMachine && (
                    <div className="selected-machine-panel">
                        <div className="selected-machine-header">
                            <h4>
                                {selectedMachine.machineID} - {selectedMachine.machineType}
                            </h4>
                            <button onClick={() => setSelectedMachine(null)}>
                                <X size={16} />
                            </button>
                        </div>

                        <div className="selected-machine-details">
                            <div className="detail-row">
                                <span className="detail-label">Status:</span>
                                <span className="detail-value status" style={{ color: getStatusColor(selectedMachine.status) }}>
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
                            {selectedMachine.userInfo && (
                                <div className="detail-row">
                                    <span className="detail-label">Assigned User:</span>
                                    <span className="detail-value">{selectedMachine.userInfo.userName}</span>
                                </div>
                            )}
                            <div className="detail-row">
                                <span className="detail-label">Coordinates:</span>
                                <span className="detail-value">
                                    {selectedMachine.latitude.toFixed(4)}, {selectedMachine.longitude.toFixed(4)}
                                </span>
                            </div>
                        </div>

                        <div className="selected-machine-actions">
                            <button className="map-btn-primary" onClick={() => centerOnMachine(selectedMachine)}>
                                <Navigation size={14} />
                                Focus
                            </button>
                            <button className="map-btn-secondary">
                                <Settings size={14} />
                                Manage
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
