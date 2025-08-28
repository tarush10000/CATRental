from fastapi import APIRouter, HTTPException, Depends
import motor.motor_asyncio
from decouple import config
from datetime import datetime, timedelta

from ..models.database import APIResponse, DashboardStats
from .auth import get_current_user

router = APIRouter()

# MongoDB connection
MONGODB_URL = config("MONGODB_URL")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.caterpillar_db

@router.get("/dashboard/stats", response_model=APIResponse)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        dealer_id = current_user["dealershipID"]
        
        # Count machines by status
        total_machines = await db.machines.count_documents({"dealerID": dealer_id})
        active_machines = await db.machines.count_documents({
            "dealerID": dealer_id,
            "status": {"$in": ["Occupied", "In-transit"]}
        })
        maintenance_machines = await db.machines.count_documents({
            "dealerID": dealer_id,
            "status": "Maintenance"
        })
        
        # Count pending requests
        dealer_machines = await db.machines.find(
            {"dealerID": dealer_id},
            {"machineID": 1}
        ).to_list(length=None)
        machine_ids = [m["machineID"] for m in dealer_machines]
        
        pending_requests = await db.requests.count_documents({
            "machineID": {"$in": machine_ids},
            "status": "In-Progress"
        })
        
        stats = {
            "total_machines": total_machines,
            "active_machines": active_machines,
            "maintenance_machines": maintenance_machines,
            "pending_requests": pending_requests
        }
        
        return APIResponse(
            success=True,
            message="Dashboard stats retrieved successfully",
            data=stats
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/machines/recent", response_model=APIResponse)
async def get_recent_machines(current_user: dict = Depends(get_current_user)):
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        cursor = db.machines.find(
            {"dealerID": current_user["dealershipID"]}
        ).sort("updatedAt", -1).limit(5)
        
        machines = await cursor.to_list(length=5)
        
        # Convert ObjectId to string
        for machine in machines:
            machine["_id"] = str(machine["_id"])
        
        return APIResponse(
            success=True,
            message="Recent machines retrieved successfully",
            data=machines
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")