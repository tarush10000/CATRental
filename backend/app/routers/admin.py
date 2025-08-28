from fastapi import APIRouter, HTTPException, Depends, Query
import motor.motor_asyncio
from decouple import config
from datetime import datetime, timedelta
from typing import Optional, List
from ..models.database import APIResponse, DashboardStats
from .auth import get_current_user

router = APIRouter()

# MongoDB connection
MONGODB_URL = config("MONGODB_URL")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.caterpillar_db

@router.get("/dashboard", response_model=APIResponse)
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    """
    Get comprehensive dashboard data including stats and notifications
    """
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        dealer_id = current_user["dealershipID"]
        
        # Total inventory of machines
        total_machines = await db.machines.count_documents({"dealerID": dealer_id})
        
        # Number of active orders/occupied machines
        active_orders = await db.machines.count_documents({
            "dealerID": dealer_id,
            "status": {"$in": ["Occupied", "In-transit"]}
        })
        
        # Revenue calculation for last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        # Get completed orders from last 30 days
        # Assuming you have rental pricing in orders collection
        revenue_pipeline = [
            {
                "$lookup": {
                    "from": "machines",
                    "localField": "machineID",
                    "foreignField": "machineID",
                    "as": "machine_data"
                }
            },
            {
                "$match": {
                    "machine_data.dealerID": dealer_id,
                    "status": "Completed",
                    "updatedAt": {"$gte": thirty_days_ago}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_revenue": {"$sum": "$estimatedCost"}  # Adjust field name based on your schema
                }
            }
        ]
        
        try:
            revenue_result = await db.neworders.aggregate(revenue_pipeline).to_list(length=1)
            total_revenue = revenue_result[0]["total_revenue"] if revenue_result else 0.0
        except:
            # Fallback calculation if orders collection doesn't exist yet
            total_revenue = active_orders * 1500.0  # $1500 average per active machine

        # Get recent notifications/alerts
        notifications = []
        
        # Check for machines needing maintenance (example logic)
        maintenance_machines = await db.machines.find({
            "dealerID": dealer_id,
            "status": "Maintenance"
        }).to_list(length=5)
        
        for machine in maintenance_machines:
            notifications.append({
                "type": "maintenance",
                "title": "Machine Maintenance Required",
                "message": f"Machine {machine.get('machineID', 'Unknown')} requires maintenance",
                "timestamp": datetime.utcnow(),
                "priority": "high"
            })
        
        # Check for pending requests
        dealer_machines = await db.machines.find(
            {"dealerID": dealer_id},
            {"machineID": 1}
        ).to_list(length=None)
        machine_ids = [m["machineID"] for m in dealer_machines]
        
        pending_requests = await db.requests.find({
            "machineID": {"$in": machine_ids},
            "status": "In-Progress"
        }).to_list(length=5)
        
        for request in pending_requests:
            notifications.append({
                "type": "request",
                "title": f"{request.get('requestType', 'Unknown')} Request",
                "message": f"New {request.get('requestType', 'request').lower()} request pending approval",
                "timestamp": request.get('requestDate', datetime.utcnow()),
                "priority": "medium"
            })
        
        # Sort notifications by timestamp (newest first)
        notifications.sort(key=lambda x: x['timestamp'], reverse=True)
        
        dashboard_data = {
            "total_machines": total_machines,
            "active_orders": active_orders,
            "revenue": round(total_revenue, 2),
            "notifications": notifications[:10]  # Limit to 10 most recent
        }
        
        return APIResponse(
            success=True,
            message="Dashboard data retrieved successfully",
            data=dashboard_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/dashboard/stats", response_model=APIResponse)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """
    Get detailed dashboard statistics
    """
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
        ready_machines = await db.machines.count_documents({
            "dealerID": dealer_id,
            "status": "Ready"
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
            "ready_machines": ready_machines,
            "pending_requests": pending_requests,
            "utilization_rate": round((active_machines / total_machines * 100), 2) if total_machines > 0 else 0
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
    """
    Get recently updated machines
    """
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        cursor = db.machines.find(
            {"dealerID": current_user["dealershipID"]}
        ).sort("updatedAt", -1).limit(10)
        
        machines = await cursor.to_list(length=10)
        
        # Convert ObjectId to string and format data
        for machine in machines:
            machine["_id"] = str(machine["_id"])
            if "updatedAt" in machine and isinstance(machine["updatedAt"], datetime):
                machine["updatedAt"] = machine["updatedAt"].isoformat()
            if "createdAt" in machine and isinstance(machine["createdAt"], datetime):
                machine["createdAt"] = machine["createdAt"].isoformat()
        
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
    """
    Get recent requests for dealer's machines
    """
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
        ).sort("requestDate", -1).limit(10)
        
        requests = await cursor.to_list(length=10)
        
        # Convert ObjectId to string and format data
        for request in requests:
            request["_id"] = str(request["_id"])
            if "requestDate" in request and isinstance(request["requestDate"], datetime):
                request["requestDate"] = request["requestDate"].isoformat()
        
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
    status: Optional[str] = Query(None, description="Filter by machine status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return")
):
    """
    Get all machines with optional filtering and pagination
    """
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        query = {"dealerID": current_user["dealershipID"]}
        if status:
            query["status"] = status
        
        cursor = db.machines.find(query).skip(skip).limit(limit).sort("updatedAt", -1)
        machines = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string and format dates
        for machine in machines:
            machine["_id"] = str(machine["_id"])
            if "updatedAt" in machine and isinstance(machine["updatedAt"], datetime):
                machine["updatedAt"] = machine["updatedAt"].isoformat()
            if "createdAt" in machine and isinstance(machine["createdAt"], datetime):
                machine["createdAt"] = machine["createdAt"].isoformat()
        
        # Get total count for pagination
        total_count = await db.machines.count_documents(query)
        
        return APIResponse(
            success=True,
            message=f"Found {len(machines)} machines",
            data={
                "machines": machines,
                "total": total_count,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + len(machines)) < total_count
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/requests", response_model=APIResponse)
async def get_all_requests(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = Query(None, description="Filter by request status"),
    request_type: Optional[str] = Query(None, description="Filter by request type"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=500, description="Number of records to return")
):
    """
    Get all requests with optional filtering and pagination
    """
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
                data={
                    "requests": [],
                    "total": 0,
                    "skip": skip,
                    "limit": limit,
                    "has_more": False
                }
            )
        
        # Build query
        query = {"machineID": {"$in": machine_ids}}
        if status:
            query["status"] = status
        if request_type:
            query["requestType"] = request_type
        
        cursor = db.requests.find(query).skip(skip).limit(limit).sort("requestDate", -1)
        requests = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string and format dates
        for request in requests:
            request["_id"] = str(request["_id"])
            if "requestDate" in request and isinstance(request["requestDate"], datetime):
                request["requestDate"] = request["requestDate"].isoformat()
        
        # Get total count for pagination
        total_count = await db.requests.count_documents(query)
        
        return APIResponse(
            success=True,
            message=f"Found {len(requests)} requests",
            data={
                "requests": requests,
                "total": total_count,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + len(requests)) < total_count
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/requests/{request_id}", response_model=APIResponse)
async def update_request(
    request_id: str,
    status: str,
    admin_comments: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a request status (approve/deny)
    """
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Validate status
        valid_statuses = ["Approved", "Denied", "In-Progress"]
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
        
        # Update request
        update_data = {
            "status": status,
            "updatedAt": datetime.utcnow()
        }
        if admin_comments:
            update_data["adminComments"] = admin_comments
        
        result = await db.requests.update_one(
            {"requestID": request_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Request not found")
        
        return APIResponse(
            success=True,
            message=f"Request {status.lower()} successfully",
            data={"request_id": request_id, "status": status}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/analytics", response_model=APIResponse)
async def get_analytics(current_user: dict = Depends(get_current_user)):
    """
    Get analytics data for the dashboard
    """
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        dealer_id = current_user["dealershipID"]
        
        # Machine utilization over time (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        # Monthly revenue trend
        revenue_pipeline = [
            {
                "$lookup": {
                    "from": "machines",
                    "localField": "machineID",
                    "foreignField": "machineID",
                    "as": "machine_data"
                }
            },
            {
                "$match": {
                    "machine_data.dealerID": dealer_id,
                    "status": "Completed",
                    "updatedAt": {"$gte": thirty_days_ago}
                }
            },
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$updatedAt"},
                        "month": {"$month": "$updatedAt"},
                        "day": {"$dayOfMonth": "$updatedAt"}
                    },
                    "daily_revenue": {"$sum": "$estimatedCost"},
                    "orders_count": {"$sum": 1}
                }
            },
            {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}}
        ]
        
        try:
            revenue_trend = await db.neworders.aggregate(revenue_pipeline).to_list(length=30)
        except:
            revenue_trend = []
        
        # Machine type distribution
        machine_types_pipeline = [
            {"$match": {"dealerID": dealer_id}},
            {
                "$group": {
                    "_id": "$machineType",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"count": -1}}
        ]
        
        machine_types = await db.machines.aggregate(machine_types_pipeline).to_list(length=None)
        
        analytics_data = {
            "revenue_trend": revenue_trend,
            "machine_distribution": machine_types,
            "period": "last_30_days"
        }
        
        return APIResponse(
            success=True,
            message="Analytics data retrieved successfully",
            data=analytics_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")