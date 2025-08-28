from fastapi import APIRouter, HTTPException, Depends
import motor.motor_asyncio
from decouple import config
from datetime import datetime, timedelta
from typing import Optional

from ..models.database import APIResponse, Recommendation
from .auth import get_current_user

router = APIRouter()

# MongoDB connection
MONGODB_URL = config("MONGODB_URL")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.caterpillar_db

@router.get("/dashboard/stats", response_model=APIResponse)
async def get_customer_dashboard_stats(current_user: dict = Depends(get_current_user)):
    try:
        if current_user["role"] != "customer":
            raise HTTPException(status_code=403, detail="Customer access required")
        
        user_id = current_user["userID"]
        
        # Count user's machines
        my_machines = await db.machines.count_documents({"userID": user_id})
        active_orders = await db.neworders.count_documents({
            "userID": user_id,
            "status": {"$in": ["Pending", "Approved", "InProgress"]}
        })
        pending_requests = await db.requests.count_documents({
            "userID": user_id,
            "status": "In-Progress"
        })
        completed_orders = await db.neworders.count_documents({
            "userID": user_id,
            "status": "Completed"
        })
        
        stats = {
            "my_machines": my_machines,
            "active_orders": active_orders,
            "pending_requests": pending_requests,
            "completed_orders": completed_orders
        }
        
        return APIResponse(
            success=True,
            message="Customer dashboard stats retrieved successfully",
            data=stats
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/machines", response_model=APIResponse)
async def get_my_machines(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    try:
        if current_user["role"] != "customer":
            raise HTTPException(status_code=403, detail="Customer access required")
        
        query = {"userID": current_user["userID"]}
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
async def get_my_requests(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    try:
        if current_user["role"] != "customer":
            raise HTTPException(status_code=403, detail="Customer access required")
        
        query = {"userID": current_user["userID"]}
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

@router.post("/requests", response_model=APIResponse)
async def create_request(
    request_data: dict,
    current_user: dict = Depends(get_current_user)
):
    try:
        if current_user["role"] != "customer":
            raise HTTPException(status_code=403, detail="Customer access required")
        
        # Validate required fields
        required_fields = ["machineID", "requestType", "description"]
        for field in required_fields:
            if field not in request_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Verify the machine exists and is accessible by the user
        machine = await db.machines.find_one({"machineID": request_data["machineID"]})
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        # Create the request document
        new_request = {
            "userID": current_user["userID"],
            "machineID": request_data["machineID"],
            "requestType": request_data["requestType"],
            "description": request_data["description"],
            "priority": request_data.get("priority", "medium"),
            "status": "In-Progress",
            "requestDate": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            "adminNotes": ""
        }
        
        result = await db.requests.insert_one(new_request)
        
        return APIResponse(
            success=True,
            message="Request created successfully",
            data={"request_id": str(result.inserted_id)}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/recommendations", response_model=APIResponse)
async def get_recommendations(current_user: dict = Depends(get_current_user)):
    try:
        if current_user["role"] != "customer":
            raise HTTPException(status_code=403, detail="Customer access required")
        
        user_id = current_user["userID"]
        
        # Get user's machines for analysis
        user_machines = await db.machines.find({"userID": user_id}).to_list(length=None)
        
        # Generate smart recommendations based on user's machine usage
        recommendations = []
        
        if user_machines:
            # Check for machines needing maintenance
            maintenance_machines = [m for m in user_machines if m.get("status") == "Maintenance"]
            if maintenance_machines:
                recommendations.append({
                    "type": "maintenance",
                    "title": "Schedule Maintenance",
                    "description": f"You have {len(maintenance_machines)} machine(s) requiring maintenance attention.",
                    "priority": "high",
                    "suggested_action": "Contact support to schedule maintenance"
                })
            
            # Check for underutilized machines
            ready_machines = [m for m in user_machines if m.get("status") == "Ready"]
            if len(ready_machines) > 2:
                recommendations.append({
                    "type": "efficiency",
                    "title": "Optimize Machine Usage",
                    "description": f"You have {len(ready_machines)} machines in ready state that could be utilized.",
                    "priority": "medium",
                    "suggested_action": "Consider creating new work orders"
                })
            
            # Cost optimization recommendation
            recommendations.append({
                "type": "cost_saving",
                "title": "Reduce Transportation Costs",
                "description": "Optimize your machine locations to reduce transportation costs by up to 15%.",
                "priority": "low",
                "suggested_action": "Review machine deployment locations"
            })
        else:
            # Default recommendations for new users
            recommendations.extend([
                {
                    "type": "getting_started",
                    "title": "Get Started with CatRental",
                    "description": "Create your first request to get machines assigned to your projects.",
                    "priority": "medium",
                    "suggested_action": "Create a new request"
                },
                {
                    "type": "training",
                    "title": "Training Resources",
                    "description": "Access our training materials to maximize equipment efficiency.",
                    "priority": "low",
                    "suggested_action": "Visit the help center"
                }
            ])
        
        return APIResponse(
            success=True,
            message="Recommendations retrieved successfully",
            data=recommendations
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/orders", response_model=APIResponse)
async def get_my_orders(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    try:
        if current_user["role"] != "customer":
            raise HTTPException(status_code=403, detail="Customer access required")
        
        query = {"userID": current_user["userID"]}
        if status:
            query["status"] = status
        
        cursor = db.neworders.find(query).skip(skip).limit(limit).sort("orderDate", -1)
        orders = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for order in orders:
            order["_id"] = str(order["_id"])
        
        # Get total count for pagination
        total_count = await db.neworders.count_documents(query)
        
        return APIResponse(
            success=True,
            message=f"Found {len(orders)} orders",
            data={
                "orders": orders,
                "total": total_count,
                "skip": skip,
                "limit": limit
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/machine/{machine_id}", response_model=APIResponse)
async def get_machine_details(
    machine_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        if current_user["role"] != "customer":
            raise HTTPException(status_code=403, detail="Customer access required")
        
        machine = await db.machines.find_one({
            "machineID": machine_id,
            "userID": current_user["userID"]
        })
        
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found or access denied")
        
        machine["_id"] = str(machine["_id"])
        
        return APIResponse(
            success=True,
            message="Machine details retrieved successfully",
            data=machine
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/requests/{request_id}", response_model=APIResponse)
async def update_request(
    request_id: str,
    request_data: dict,
    current_user: dict = Depends(get_current_user)
):
    try:
        if current_user["role"] != "customer":
            raise HTTPException(status_code=403, detail="Customer access required")
        
        # Find the request and verify ownership
        request_doc = await db.requests.find_one({
            "_id": request_id,
            "userID": current_user["userID"]
        })
        
        if not request_doc:
            raise HTTPException(status_code=404, detail="Request not found or access denied")
        
        # Only allow updating certain fields and only if not approved/denied
        if request_doc["status"] in ["Approved", "Denied"]:
            raise HTTPException(status_code=400, detail="Cannot update approved or denied requests")
        
        allowed_updates = ["description", "priority"]
        update_data = {k: v for k, v in request_data.items() if k in allowed_updates}
        update_data["updatedAt"] = datetime.utcnow()
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        result = await db.requests.update_one(
            {"_id": request_id, "userID": current_user["userID"]},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Request not found or not updated")
        
        return APIResponse(
            success=True,
            message="Request updated successfully",
            data={"request_id": request_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/requests/{request_id}", response_model=APIResponse)
async def cancel_request(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        if current_user["role"] != "customer":
            raise HTTPException(status_code=403, detail="Customer access required")
        
        # Find the request and verify ownership
        request_doc = await db.requests.find_one({
            "_id": request_id,
            "userID": current_user["userID"]
        })
        
        if not request_doc:
            raise HTTPException(status_code=404, detail="Request not found or access denied")
        
        # Only allow cancellation if request is still in progress
        if request_doc["status"] != "In-Progress":
            raise HTTPException(status_code=400, detail="Can only cancel in-progress requests")
        
        # Update status to cancelled instead of deleting
        result = await db.requests.update_one(
            {"_id": request_id, "userID": current_user["userID"]},
            {"$set": {"status": "Cancelled", "updatedAt": datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Request not found or not cancelled")
        
        return APIResponse(
            success=True,
            message="Request cancelled successfully",
            data={"request_id": request_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/profile", response_model=APIResponse)
async def get_customer_profile(current_user: dict = Depends(get_current_user)):
    try:
        if current_user["role"] != "customer":
            raise HTTPException(status_code=403, detail="Customer access required")
        
        # Get user details from the users collection
        user = await db.users.find_one({"userID": current_user["userID"]})
        
        if not user:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        # Remove sensitive information
        user.pop("password", None)
        user["_id"] = str(user["_id"])
        
        return APIResponse(
            success=True,
            message="Profile retrieved successfully",
            data=user
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/profile", response_model=APIResponse)
async def update_customer_profile(
    profile_data: dict,
    current_user: dict = Depends(get_current_user)
):
    try:
        if current_user["role"] != "customer":
            raise HTTPException(status_code=403, detail="Customer access required")
        
        # Only allow updating certain profile fields
        allowed_updates = ["name", "email", "phone", "address"]
        update_data = {k: v for k, v in profile_data.items() if k in allowed_updates}
        update_data["updatedAt"] = datetime.utcnow()
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        # Check if email is being updated and if it's already taken
        if "email" in update_data:
            existing_user = await db.users.find_one({
                "email": update_data["email"],
                "userID": {"$ne": current_user["userID"]}
            })
            if existing_user:
                raise HTTPException(status_code=400, detail="Email already in use")
        
        result = await db.users.update_one(
            {"userID": current_user["userID"]},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Profile not found or not updated")
        
        return APIResponse(
            success=True,
            message="Profile updated successfully",
            data={"user_id": current_user["userID"]}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/analytics", response_model=APIResponse)
async def get_customer_analytics(current_user: dict = Depends(get_current_user)):
    try:
        if current_user["role"] != "customer":
            raise HTTPException(status_code=403, detail="Customer access required")
        
        user_id = current_user["userID"]
        
        # Get machine utilization data
        machines = await db.machines.find({"userID": user_id}).to_list(length=None)
        
        # Calculate analytics
        total_machines = len(machines)
        status_breakdown = {}
        for machine in machines:
            status = machine.get("status", "Unknown")
            status_breakdown[status] = status_breakdown.get(status, 0) + 1
        
        # Get request statistics
        total_requests = await db.requests.count_documents({"userID": user_id})
        approved_requests = await db.requests.count_documents({
            "userID": user_id, 
            "status": "Approved"
        })
        denied_requests = await db.requests.count_documents({
            "userID": user_id, 
            "status": "Denied"
        })
        
        # Calculate success rate
        success_rate = 0
        if total_requests > 0:
            success_rate = (approved_requests / total_requests) * 100
        
        # Get recent activity (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_requests = await db.requests.count_documents({
            "userID": user_id,
            "requestDate": {"$gte": thirty_days_ago}
        })
        
        analytics = {
            "machine_stats": {
                "total_machines": total_machines,
                "status_breakdown": status_breakdown
            },
            "request_stats": {
                "total_requests": total_requests,
                "approved_requests": approved_requests,
                "denied_requests": denied_requests,
                "success_rate": round(success_rate, 2),
                "recent_requests": recent_requests
            },
            "utilization": {
                "active_percentage": round((status_breakdown.get("Occupied", 0) / max(total_machines, 1)) * 100, 2),
                "maintenance_percentage": round((status_breakdown.get("Maintenance", 0) / max(total_machines, 1)) * 100, 2)
            }
        }
        
        return APIResponse(
            success=True,
            message="Analytics retrieved successfully",
            data=analytics
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")