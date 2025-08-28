from fastapi import APIRouter, HTTPException, Depends
import motor.motor_asyncio
from decouple import config
from datetime import datetime, timedelta
from typing import Optional

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

@router.get("/requests/recent", response_model=APIResponse)
async def get_recent_requests(current_user: dict = Depends(get_current_user)):
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        dealer_id = current_user["dealershipID"]
        
        # Get machine IDs for this dealer
        dealer_machines = await db.machines.find(
            {"dealerID": dealer_id},
            {"machineID": 1}
        ).to_list(length=None)
        machine_ids = [m["machineID"] for m in dealer_machines]
        
        if not machine_ids:
            return APIResponse(
                success=True,
                message="No recent requests found",
                data=[]
            )
        
        # Find recent requests for dealer's machines
        cursor = db.requests.find(
            {"machineID": {"$in": machine_ids}}
        ).sort("requestDate", -1).limit(5)
        
        requests = await cursor.to_list(length=5)
        
        # Convert ObjectId to string
        for request in requests:
            request["_id"] = str(request["_id"])
        
        return APIResponse(
            success=True,
            message="Recent requests retrieved successfully",
            data=requests
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/machines", response_model=APIResponse)
async def get_all_machines(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        query = {"dealerID": current_user["dealershipID"]}
        if status:
            query["status"] = status
        
        cursor = db.machines.find(query).skip(skip).limit(limit).sort("updatedAt", -1)
        machines = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for machine in machines:
            machine["_id"] = str(machine["_id"])
        
        # Get total count for pagination
        total_count = await db.machines.count_documents(query)
        
        return APIResponse(
            success=True,
            message=f"Found {len(machines)} machines",
            data={
                "machines": machines,
                "total": total_count,
                "skip": skip,
                "limit": limit
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/requests", response_model=APIResponse)
async def get_all_requests(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        dealer_id = current_user["dealershipID"]
        
        # Get machine IDs for this dealer
        dealer_machines = await db.machines.find(
            {"dealerID": dealer_id},
            {"machineID": 1}
        ).to_list(length=None)
        machine_ids = [m["machineID"] for m in dealer_machines]
        
        if not machine_ids:
            return APIResponse(
                success=True,
                message="No requests found",
                data={"requests": [], "total": 0, "skip": skip, "limit": limit}
            )
        
        query = {"machineID": {"$in": machine_ids}}
        if status:
            query["status"] = status
        
        cursor = db.requests.find(query).skip(skip).limit(limit).sort("requestDate", -1)
        requests = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for request in requests:
            request["_id"] = str(request["_id"])
        
        # Get total count for pagination
        total_count = await db.requests.count_documents(query)
        
        return APIResponse(
            success=True,
            message=f"Found {len(requests)} requests",
            data={
                "requests": requests,
                "total": total_count,
                "skip": skip,
                "limit": limit
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/requests/{request_id}/status", response_model=APIResponse)
async def update_request_status(
    request_id: str,
    status_data: dict,
    current_user: dict = Depends(get_current_user)
):
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        new_status = status_data.get("status")
        if new_status not in ["Approved", "Denied", "In-Progress"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        # Find the request
        request_doc = await db.requests.find_one({"_id": request_id})
        if not request_doc:
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Verify the machine belongs to this dealer
        machine = await db.machines.find_one({"machineID": request_doc["machineID"]})
        if not machine or machine["dealerID"] != current_user["dealershipID"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update the request
        update_data = {
            "status": new_status,
            "updatedAt": datetime.utcnow(),
            "adminNotes": status_data.get("notes", "")
        }
        
        result = await db.requests.update_one(
            {"_id": request_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Request not found or not updated")
        
        return APIResponse(
            success=True,
            message=f"Request status updated to {new_status}",
            data={"request_id": request_id, "new_status": new_status}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")