from fastapi import APIRouter, HTTPException, Depends, Query
import motor.motor_asyncio
from decouple import config
from datetime import datetime, timedelta
from typing import Optional, List
import uuid
from math import radians, sin, cos, sqrt, atan2
from ..models.database import (
    APIResponse, Transfer, TransferCreate, TransferUpdate, TransferStatus,
    RecommendationModel, RecommendationCreate, RecommendationType, RecommendationSeverity,
    MachineLocation, TransferRecommendation
)
from .auth import get_current_user

router = APIRouter()

# MongoDB connection
MONGODB_URL = config("MONGODB_URL")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.caterpillar_db

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in kilometers"""
    R = 6371.0  # Earth radius in kilometers
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

@router.get("/transfers", response_model=APIResponse)
async def get_transfers(
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get transfer recommendations for admins"""
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        query = {"dealerID": current_user["dealershipID"]}
        if status:
            query["status"] = status
            
        transfers = await db.transfers.find(query).sort("createdAt", -1).to_list(length=None)
        
        # Convert ObjectId to string and enrich with user/machine data
        for transfer in transfers:
            transfer["_id"] = str(transfer["_id"])
            
            # Get user names
            user1 = await db.users.find_one({"userID": transfer["userID1"]})
            user2 = await db.users.find_one({"userID": transfer["userID2"]})
            machine = await db.machines.find_one({"machineID": transfer["machineID"]})
            
            transfer["user1_name"] = user1["name"] if user1 else "Unknown"
            transfer["user2_name"] = user2["name"] if user2 else "Unknown"
            transfer["machine_type"] = machine["machineType"] if machine else "Unknown"
        
        return APIResponse(
            success=True,
            message=f"Found {len(transfers)} transfer recommendations",
            data={"transfers": transfers}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/transfers/{transfer_id}", response_model=APIResponse)
async def update_transfer_status(
    transfer_id: str,
    transfer_update: TransferUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update transfer recommendation status"""
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        transfer = await db.transfers.find_one({
            "transferID": transfer_id,
            "dealerID": current_user["dealershipID"]
        })
        
        if not transfer:
            raise HTTPException(status_code=404, detail="Transfer recommendation not found")
        
        update_data = {
            "status": transfer_update.status.value,
            "adminComments": transfer_update.admin_comments,
            "updatedAt": datetime.utcnow()
        }
        
        # If approved, update machine details
        if transfer_update.status == TransferStatus.APPROVED:
            machine_update = {
                "status": "In-transit",
                "userID": transfer["userID2"],
                "location": f"{transfer['location2']['lat']}, {transfer['location2']['lon']}",
                "updatedAt": datetime.utcnow()
            }
            
            await db.machines.update_one(
                {"machineID": transfer["machineID"]},
                {"$set": machine_update}
            )
        
        await db.transfers.update_one(
            {"transferID": transfer_id},
            {"$set": update_data}
        )
        
        return APIResponse(
            success=True,
            message="Transfer recommendation updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/transfer-optimization", response_model=APIResponse)
async def get_transfer_recommendations(
    current_user: dict = Depends(get_current_user),
    max_distance: float = 100.0  # km
):
    """Generate transfer recommendations to optimize machine allocation"""
    
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    dealer_id = current_user["dealershipID"]
    
    # Get all pending orders that need machines
    pending_orders = await db.neworders.find({
        "status": "Pending"
    }).to_list(length=None)
    
    # Get all occupied machines from this dealership
    occupied_machines = await db.machines.find({
        "dealerID": dealer_id,
        "status": "Occupied",
        "userID": {"$ne": None}
    }).to_list(length=None)
    
    transfer_recommendations = []
    
    for order in pending_orders:
        order_coords = order["location"].split(", ")
        if len(order_coords) != 2:
            continue
            
        try:
            order_lat, order_lon = float(order_coords[0]), float(order_coords[1])
        except ValueError:
            continue
        
        # Find machines of the same type that could be transferred
        suitable_machines = [
            m for m in occupied_machines 
            if order["machineType"].lower() in m["machineType"].lower()
        ]
        
        for machine in suitable_machines:
            machine_coords = machine["location"].split(", ")
            if len(machine_coords) != 2:
                continue
                
            try:
                machine_lat, machine_lon = float(machine_coords[0]), float(machine_coords[1])
            except ValueError:
                continue
            
            # Calculate distance from machine to order location
            machine_to_order_distance = calculate_distance(
                machine_lat, machine_lon, order_lat, order_lon
            )
            
            # Only consider if within reasonable distance
            if machine_to_order_distance <= max_distance:
                # Calculate potential savings (simplified calculation)
                # Assume cost per km is $2 for transportation
                cost_per_km = 2.0
                
                # Distance from dealer to order location
                # (This would need dealer coordinates - using approximation)
                estimated_dealer_distance = machine_to_order_distance * 1.5  # Rough estimate
                
                current_cost = estimated_dealer_distance * cost_per_km
                transfer_cost = machine_to_order_distance * cost_per_km
                estimated_savings = max(0, current_cost - transfer_cost)
                
                if estimated_savings > 0:
                    # Get user names
                    current_user_doc = await db.users.find_one({"userID": machine["userID"]})
                    requesting_user_doc = await db.users.find_one({"userID": order["userID"]})
                    
                    recommendation = {
                        "recommendation_id": str(uuid.uuid4()),
                        "from_user_id": machine["userID"],
                        "from_user_name": current_user_doc["name"] if current_user_doc else "Unknown",
                        "to_user_id": order["userID"],
                        "to_user_name": requesting_user_doc["name"] if requesting_user_doc else "Unknown",
                        "machine_id": machine["machineID"],
                        "machine_type": machine["machineType"],
                        "order_id": str(order["_id"]),
                        "estimated_savings": round(estimated_savings, 2),
                        "distance_saved": round(estimated_dealer_distance - machine_to_order_distance, 2),
                        "current_location": f"{machine_lat}, {machine_lon}",
                        "target_location": f"{order_lat}, {order_lon}",
                        "reason": f"Machine can be transferred directly, saving ${estimated_savings:.2f} in transport costs",
                        "priority": "high" if estimated_savings > 100 else "medium" if estimated_savings > 50 else "low",
                        "created_at": datetime.utcnow()
                    }
                    
                    transfer_recommendations.append(recommendation)
    
    # Sort by estimated savings (highest first)
    transfer_recommendations.sort(key=lambda x: x["estimated_savings"], reverse=True)
    
    # Store recommendations in database for future reference
    if transfer_recommendations:
        for rec in transfer_recommendations:
            rec_doc = {
                "recommendationID": rec["recommendation_id"],
                "type": "transfer_optimization",
                "dealerID": dealer_id,
                "data": rec,
                "status": "active",
                "createdAt": datetime.utcnow()
            }
            await db.recommendations.insert_one(rec_doc)
    
    return APIResponse(
        success=True,
        message=f"Found {len(transfer_recommendations)} transfer optimization opportunities",
        data={
            "recommendations": transfer_recommendations,
            "total_potential_savings": sum(r["estimated_savings"] for r in transfer_recommendations)
        }
    )

@router.get("/usage-optimization", response_model=APIResponse)
async def get_usage_recommendations(
    current_user: dict = Depends(get_current_user),
    user_id: Optional[str] = None
):
    """Generate usage optimization recommendations"""
    
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    dealer_id = current_user["dealershipID"]
    
    # Get all users with machines from this dealership
    users_query = {"dealershipID": dealer_id} if not user_id else {"userID": user_id}
    users = await db.users.find(users_query).to_list(length=None)
    
    usage_recommendations = []
    
    for user in users:
        if user["role"] != "customer":
            continue
            
        # Get user's occupied machines
        user_machines = await db.machines.find({
            "userID": user["userID"],
            "status": "Occupied"
        }).to_list(length=None)
        
        if not user_machines:
            continue
        
        # Calculate overall utilization
        total_utilization = []
        underutilized_machines = []
        overutilized_machines = []
        
        for machine in user_machines:
            engine_hours = machine.get("engineHoursPerDay", 0.0)
            idle_hours = machine.get("idleHours", 0.0)
            total_hours = engine_hours + idle_hours
            
            if total_hours > 0:
                utilization = (engine_hours / total_hours) * 100
                total_utilization.append(utilization)
                
                if utilization < 20:  # Less than 20% utilization
                    underutilized_machines.append({
                        "machine_id": machine["machineID"],
                        "machine_type": machine["machineType"],
                        "utilization": round(utilization, 2)
                    })
                elif utilization > 85:  # More than 85% utilization
                    overutilized_machines.append({
                        "machine_id": machine["machineID"],
                        "machine_type": machine["machineType"],
                        "utilization": round(utilization, 2)
                    })
        
        if not total_utilization:
            continue
        
        avg_utilization = sum(total_utilization) / len(total_utilization)
        
        # Generate recommendations based on utilization patterns
        if len(underutilized_machines) >= 2:  # Multiple underutilized machines
            recommendation = {
                "recommendation_id": str(uuid.uuid4()),
                "user_id": user["userID"],
                "user_name": user["name"],
                "recommendation_type": "reduce_machines",
                "current_utilization": round(avg_utilization, 2),
                "recommended_action": f"Consider returning {len(underutilized_machines)} underutilized machines",
                "potential_savings": len(underutilized_machines) * 500,  # Estimated daily savings per machine
                "affected_machines": [m["machine_id"] for m in underutilized_machines],
                "details": underutilized_machines,
                "priority": "medium",
                "reason": f"Average utilization is {avg_utilization:.1f}% with {len(underutilized_machines)} machines under 20% usage",
                "created_at": datetime.utcnow()
            }
            usage_recommendations.append(recommendation)
        
        elif len(overutilized_machines) >= 1:  # Any overutilized machines
            recommendation = {
                "recommendation_id": str(uuid.uuid4()),
                "user_id": user["userID"],
                "user_name": user["name"],
                "recommendation_type": "increase_machines",
                "current_utilization": round(avg_utilization, 2),
                "recommended_action": f"Consider requesting additional machines to reduce overutilization",
                "potential_savings": None,
                "affected_machines": [m["machine_id"] for m in overutilized_machines],
                "details": overutilized_machines,
                "priority": "high",
                "reason": f"Average utilization is {avg_utilization:.1f}% with {len(overutilized_machines)} machines over 85% usage",
                "created_at": datetime.utcnow()
            }
            usage_recommendations.append(recommendation)
        
        elif 40 <= avg_utilization <= 60:  # Optimal range
            recommendation = {
                "recommendation_id": str(uuid.uuid4()),
                "user_id": user["userID"],
                "user_name": user["name"],
                "recommendation_type": "optimize_usage",
                "current_utilization": round(avg_utilization, 2),
                "recommended_action": "Great job! Your machine utilization is optimal",
                "potential_savings": None,
                "affected_machines": [m["machineID"] for m in user_machines],
                "details": [],
                "priority": "low",
                "reason": f"Excellent utilization rate of {avg_utilization:.1f}%",
                "created_at": datetime.utcnow()
            }
            usage_recommendations.append(recommendation)
    
    # Store recommendations in database
    if usage_recommendations:
        for rec in usage_recommendations:
            rec_doc = {
                "recommendationID": rec["recommendation_id"],
                "type": "usage_optimization",
                "dealerID": dealer_id,
                "userID": rec["user_id"],
                "data": rec,
                "status": "active",
                "createdAt": datetime.utcnow()
            }
            await db.recommendations.insert_one(rec_doc)
    
    return APIResponse(
        success=True,
        message=f"Generated {len(usage_recommendations)} usage optimization recommendations",
        data={
            "recommendations": usage_recommendations,
            "total_users_analyzed": len(users)
        }
    )

@router.post("/create-transfer", response_model=APIResponse)
async def create_direct_transfer(
    from_user_id: str,
    to_user_id: str,
    machine_id: str,
    target_location_lat: float,
    target_location_lon: float,
    current_user: dict = Depends(get_current_user)
):
    """Create a direct transfer between users based on recommendations"""
    
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Validate the machine exists and is occupied by from_user
    machine = await db.machines.find_one({
        "machineID": machine_id,
        "userID": from_user_id,
        "status": "Occupied",
        "dealerID": current_user["dealershipID"]
    })
    
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found or not available for transfer")
    
    # Validate users exist
    from_user = await db.users.find_one({"userID": from_user_id})
    to_user = await db.users.find_one({"userID": to_user_id})
    
    if not from_user or not to_user:
        raise HTTPException(status_code=404, detail="One or both users not found")
    
    # Create transfer record
    machine_coords = machine["location"].split(", ")
    if len(machine_coords) == 2:
        machine_lat, machine_lon = float(machine_coords[0]), float(machine_coords[1])
    else:
        machine_lat, machine_lon = 0.0, 0.0
    
    transfer_doc = {
        "transferID": str(uuid.uuid4()),
        "machineID": machine_id,
        "dealerID": current_user["dealershipID"],
        "userID1": from_user_id,  # Current user
        "userID2": to_user_id,    # Target user
        "location1": {"lat": machine_lat, "lon": machine_lon},
        "location2": {"lat": target_location_lat, "lon": target_location_lon},
        "status": TransferStatus.PENDING.value,
        "transferType": "direct_recommendation",
        "createdBy": current_user["userID"],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    result = await db.transfers.insert_one(transfer_doc)
    
    return APIResponse(
        success=True,
        message="Direct transfer created successfully",
        data={
            "transfer_id": transfer_doc["transferID"],
            "from_user": from_user["name"],
            "to_user": to_user["name"],
            "machine_id": machine_id
        }
    )

@router.get("/", response_model=APIResponse)
async def get_all_recommendations(
    current_user: dict = Depends(get_current_user),
    recommendation_type: Optional[str] = Query(None),
    status: str = Query("active"),
    limit: int = Query(50, le=100)
):
    """Get all recommendations for the dealership"""
    
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {
        "dealerID": current_user["dealershipID"],
        "status": status
    }
    
    if recommendation_type:
        query["type"] = recommendation_type
    
    recommendations = await db.recommendations.find(query).sort(
        "createdAt", -1
    ).limit(limit).to_list(length=limit)
    
    # Convert ObjectId to string
    for rec in recommendations:
        rec["_id"] = str(rec["_id"])
    
    return APIResponse(
        success=True,
        message=f"Found {len(recommendations)} recommendations",
        data={
            "recommendations": recommendations,
            "filters": {
                "type": recommendation_type,
                "status": status,
                "limit": limit
            }
        }
    )

@router.patch("/{recommendation_id}/dismiss", response_model=APIResponse)
async def dismiss_recommendation(
    recommendation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Dismiss a recommendation"""
    
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.recommendations.update_one(
        {
            "recommendationID": recommendation_id,
            "dealerID": current_user["dealershipID"]
        },
        {
            "$set": {
                "status": "dismissed",
                "dismissedBy": current_user["userID"],
                "dismissedAt": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    
    return APIResponse(
        success=True,
        message="Recommendation dismissed successfully"
    )

@router.get("/machine-locations", response_model=APIResponse)
async def get_machine_locations(
    current_user: dict = Depends(get_current_user)
):
    """Get machine locations for map display"""
    try:
        if current_user["role"] == "admin":
            # Admin sees all their dealership's machines
            machines = await db.machines.find({
                "dealerID": current_user["dealershipID"]
            }).to_list(length=None)
        else:
            # Customer sees only their rented machines
            machines = await db.machines.find({
                "userID": current_user["userID"]
            }).to_list(length=None)
        
        locations = []
        
        for machine in machines:
            try:
                # Parse latitude and longitude from the location field
                latitude = None
                longitude = None
                address = "Unknown Location"
                
                if machine.get("location"):
                    location_parts = machine["location"].split(",")
                    
                    if len(location_parts) >= 2:
                        try:
                            # Try to parse coordinates from the last two parts
                            longitude = float(location_parts[-1].strip())
                            latitude = float(location_parts[-2].strip())
                            
                            # If there are more than 2 parts, the first parts are the address
                            if len(location_parts) > 2:
                                address = ",".join(location_parts[:-2]).strip()
                            else:
                                address = machine.get("siteID", "Machine Location")
                                
                        except (ValueError, IndexError):
                            # If parsing fails, use default coordinates (Bangalore center)
                            latitude = 12.9716
                            longitude = 77.5946
                            address = machine.get("location", "Unknown Location")
                    else:
                        # If no coordinates, use default location
                        latitude = 12.9716
                        longitude = 77.5946  
                        address = machine.get("location", "Unknown Location")
                else:
                    # Default coordinates if no location data
                    latitude = 12.9716
                    longitude = 77.5946
                    address = machine.get("siteID", "Unknown Location")
                
                # Get user information if machine is assigned
                user_info = None
                machine_user_id = machine.get("userID")
                
                if machine_user_id:
                    try:
                        user = await db.users.find_one({"userID": machine_user_id})
                        if user:
                            user_info = {
                                "userID": machine_user_id,
                                "userName": user.get("name", "Unknown User"),
                                "userEmail": user.get("emailID", user.get("email"))
                            }
                        else:
                            user_info = {
                                "userID": machine_user_id,
                                "userName": "Unknown User",
                                "userEmail": None
                            }
                    except Exception:
                        user_info = {
                            "userID": machine_user_id,
                            "userName": "Unknown User", 
                            "userEmail": None
                        }
                
                location = {
                    "machineID": machine.get("machineID", "Unknown"),
                    "machineType": machine.get("machineType", "Unknown"),
                    "status": machine.get("status", "Unknown"),
                    "latitude": latitude,
                    "longitude": longitude,
                    "address": address,
                    "siteID": machine.get("siteID"),
                    "userInfo": user_info,
                    "dealerID": machine.get("dealerID"),
                    "engineHoursPerDay": machine.get("engineHoursPerDay", 0),
                    "idleHours": machine.get("idleHours", 0),
                    "operatingDays": machine.get("operatingDays", 0),
                    "checkOutDate": machine.get("checkOutDate"),
                    "checkInDate": machine.get("checkInDate"),
                    "lastUpdated": machine.get("updatedAt", machine.get("createdAt"))
                }
                locations.append(location)
                
            except Exception:
                # Continue with next machine instead of failing completely
                continue
        
        return APIResponse(
            success=True,
            message=f"Found {len(locations)} machine locations",
            data={"locations": locations}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/recommendations", response_model=APIResponse)
async def get_recommendations(
    user_type: Optional[str] = Query(None, regex="^(admin|customer)$"),
    severity: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get text recommendations for user"""
    try:
        query = {}
        
        if current_user["role"] == "admin":
            query["targetUserType"] = "admin"
            query["$or"] = [
                {"userID": current_user["userID"]},
                {"dealerID": current_user["dealershipID"]}
            ]
        else:
            query["targetUserType"] = "customer"
            query["userID"] = current_user["userID"]
        
        if severity:
            query["severity"] = severity
        
        recommendations = await db.recommendations.find(query).sort("dateTime", -1).to_list(length=50)
        
        for rec in recommendations:
            rec["_id"] = str(rec["_id"])
        
        return APIResponse(
            success=True,
            message=f"Found {len(recommendations)} recommendations",
            data={"recommendations": recommendations}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/recommendations", response_model=APIResponse)
async def create_recommendation(
    recommendation: RecommendationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new recommendation (usually called by system)"""
    try:
        rec_data = {
            "recommendationID": str(uuid.uuid4()),
            "userID": recommendation.user_id,
            "recommendation": recommendation.recommendation,
            "recommendationType": recommendation.recommendation_type.value,
            "severity": recommendation.severity.value,
            "targetUserType": recommendation.target_user_type.value,
            "dateTime": datetime.utcnow(),
            "isRead": False,
            "isDismissed": False,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        await db.recommendations.insert_one(rec_data)
        
        return APIResponse(
            success=True,
            message="Recommendation created successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")