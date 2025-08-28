# backend/app/routers/recommendations.py

from fastapi import APIRouter, HTTPException, Depends, Query
import motor.motor_asyncio
from decouple import config
from datetime import datetime, timedelta
from typing import Optional, List
import uuid
import random
from ..models.database import (
    APIResponse, Transfer, TransferCreate, TransferUpdate, TransferStatus,
    RecommendationModel, RecommendationCreate, RecommendationType, RecommendationSeverity,
    MachineLocation
)
from .auth import get_current_user

router = APIRouter()

# MongoDB connection
MONGODB_URL = config("MONGODB_URL")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.caterpillar_db

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
                "status": "Maintenance",
                "userID": transfer["userID2"],
                "location": transfer["location2"],
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

@router.get("/machine-locations", response_model=APIResponse)
async def get_machine_locations(
    current_user: dict = Depends(get_current_user)
):
    """Get machine locations for map display"""
    try:
        if current_user["role"] == "admin":
            # Admin sees all their dealership's machines - use the same field name as in admin dashboard
            machines = await db.machines.find({
                "dealerID": current_user["dealershipID"]  # This matches the admin dashboard query
            }).to_list(length=None)
        else:
            # Customer sees only their rented machines
            machines = await db.machines.find({
                "userID": current_user["userID"]  # This should match the actual field name in DB
            }).to_list(length=None)
        
        print(f"Found {len(machines)} machines for user {current_user['userID']} with role {current_user['role']}")
        
        locations = []
        
        for machine in machines:
            try:
                # Debug: Print machine structure
                print(f"Processing machine: {machine.get('machineID', 'No ID')} - Keys: {list(machine.keys())}")
                
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
                machine_user_id = machine.get("userID")  # Try camelCase first
                if not machine_user_id:
                    machine_user_id = machine.get("user_id")  # Try snake_case as fallback
                
                if machine_user_id:
                    try:
                        user = await db.users.find_one({"userID": machine_user_id})
                        if user:
                            user_info = {
                                "userID": machine_user_id,
                                "userName": user.get("name", "Unknown User"),
                                "userEmail": user.get("email", None)
                            }
                        else:
                            # User not found, but machine has userID
                            user_info = {
                                "userID": machine_user_id,
                                "userName": "Unknown User",
                                "userEmail": None
                            }
                    except Exception as user_error:
                        print(f"Error fetching user data for {machine_user_id}: {user_error}")
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
                
            except Exception as machine_error:
                print(f"Error processing machine {machine.get('machineID', 'Unknown')}: {machine_error}")
                import traceback
                traceback.print_exc()
                # Continue with next machine instead of failing completely
                continue
        
        print(f"Successfully processed {len(locations)} machine locations")
        
        return APIResponse(
            success=True,
            message=f"Found {len(locations)} machine locations",
            data={"locations": locations}
        )
        
    except Exception as e:
        print(f"Full error in get_machine_locations: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Helper function to create transfer recommendations
async def create_transfer_recommendation(user_id_1: str, user_id_2: str, machine_id: str, dealer_id: str):
    """Create a transfer recommendation when conditions are met"""
    try:
        # Get machine and user details
        machine = await db.machines.find_one({"machineID": machine_id})
        user1 = await db.users.find_one({"userID": user_id_1})
        user2 = await db.users.find_one({"userID": user_id_2})
        
        if not all([machine, user1, user2]):
            return
        
        # Calculate potential savings (simplified logic)
        estimated_savings = random.uniform(500, 2000)  # Replace with actual calculation
        
        transfer_data = {
            "transferID": str(uuid.uuid4()),
            "userID1": user_id_1,
            "userID2": user_id_2,
            "dealerID": dealer_id,
            "location1": machine["location"],
            "location2": user2.get("preferredLocation", "Location 2"),
            "machineID": machine_id,
            "status": "pending",
            "estimatedSavings": estimated_savings,
            "recommendationReason": f"Direct transfer from {machine['location']} to user location can save approximately ${estimated_savings:.0f} in transportation costs",
            "adminComments": None,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        await db.transfers.insert_one(transfer_data)
        
    except Exception as e:
        print(f"Error creating transfer recommendation: {e}")