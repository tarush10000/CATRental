from fastapi import APIRouter, HTTPException, Depends, Query
import motor.motor_asyncio
import math
from decouple import config
from datetime import datetime, timedelta
from typing import Optional, List
from ..models.database import APIResponse, DashboardStats
from .auth import get_current_user

router = APIRouter()

MACHINE_TYPES = {
    'Excavator': {'hourlyRate': 150, 'dailyRate': 1200, 'category': 'Heavy Construction'},
    'Bulldozer': {'hourlyRate': 180, 'dailyRate': 1440, 'category': 'Heavy Construction'},
    'Loader': {'hourlyRate': 120, 'dailyRate': 960, 'category': 'Material Handling'},
    'Grader': {'hourlyRate': 140, 'dailyRate': 1120, 'category': 'Road Construction'},
    'Compactor': {'hourlyRate': 100, 'dailyRate': 800, 'category': 'Compaction'},
    'Crane': {'hourlyRate': 220, 'dailyRate': 1760, 'category': 'Heavy Lifting'},
    'Dump Truck': {'hourlyRate': 80, 'dailyRate': 640, 'category': 'Transportation'},
    'Backhoe': {'hourlyRate': 130, 'dailyRate': 1040, 'category': 'General Construction'}
}

# MongoDB connection
MONGODB_URL = config("MONGODB_URL")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.caterpillar_db

def calculate_machine_revenue(machine_type: str, duration_hours: float, billing_type: str = 'hourly') -> float:
    """Calculate revenue for a single machine based on type and duration"""
    machine = MACHINE_TYPES.get(machine_type)
    
    if not machine:
        return duration_hours * 100  # Default fallback rate
    
    if billing_type == 'daily':
        days = math.ceil(duration_hours / 24)
        return days * machine['dailyRate']
    else:
        return duration_hours * machine['hourlyRate']

def calculate_occupied_duration(start_time: datetime, end_time: datetime = None) -> float:
    """Calculate duration in hours for occupied machines"""
    if end_time is None:
        end_time = datetime.utcnow()
    
    duration = end_time - start_time
    return duration.total_seconds() / 3600

async def get_revenue_from_occupied_machines(dealer_id: str) -> float:
    """Calculate total revenue from currently occupied machines"""
    try:
        occupied_machines = await db.machines.find({
            "dealerID": dealer_id,
            "status": "Occupied"
        }).to_list(length=None)
        
        total_revenue = 0.0
        
        for machine in occupied_machines:
            machine_type = machine.get('machineType', 'Unknown')
            
            # Try to get when machine became occupied, fallback to updatedAt
            start_time = machine.get('occupiedSince') or machine.get('updatedAt')
            
            if start_time:
                duration_hours = calculate_occupied_duration(start_time)
                billing_type = machine.get('billingType', 'hourly')
                machine_revenue = calculate_machine_revenue(machine_type, duration_hours, billing_type)
                total_revenue += machine_revenue
        
        return round(total_revenue, 2)
        
    except Exception as e:
        print(f"Error calculating revenue: {str(e)}")
        return 0.0

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
        
        # ===== NEW REVENUE CALCULATION =====
        # Calculate revenue from occupied machines based on machine types and duration
        occupied_revenue = await get_revenue_from_occupied_machines(dealer_id)
        
        # Optional: Also calculate completed orders revenue for the month
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        completed_revenue = 0.0
        
        try:
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
                        "total_revenue": {"$sum": "$estimatedCost"}
                    }
                }
            ]
            
            revenue_result = await db.neworders.aggregate(revenue_pipeline).to_list(length=1)
            completed_revenue = revenue_result[0]["total_revenue"] if revenue_result else 0.0
        except:
            # If orders collection doesn't work, skip completed revenue
            completed_revenue = 0.0
        
        # Total revenue combines both streams
        total_revenue = (occupied_revenue + completed_revenue) * 100
        # ===== END NEW REVENUE CALCULATION =====

        # Get recent notifications/alerts (unchanged)
        notifications = []
        
        # Check for machines needing maintenance
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
            "revenue": total_revenue,  # This will now show real calculated revenue!
            "notifications": notifications[:10]
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
        
        # Debug: Check if dealershipID exists
        dealer_id = current_user.get("dealershipID")
        if not dealer_id:
            raise HTTPException(
                status_code=400, 
                detail="Dealership ID not found for user. Please check user registration."
            )
        
        print(f"DEBUG: Looking for machines with dealerID: {dealer_id}")
        
        try:
            cursor = db.machines.find(
                {"dealerID": dealer_id}
            ).sort("updatedAt", -1).limit(10)
            
            machines = await cursor.to_list(length=10)
            print(f"DEBUG: Found {len(machines)} machines")
            
        except Exception as db_error:
            print(f"DEBUG: Database error: {str(db_error)}")
            raise HTTPException(
                status_code=500, 
                detail=f"Database query failed: {str(db_error)}"
            )
        
        # Convert ObjectId to string and format data
        formatted_machines = []
        for machine in machines:
            try:
                machine["_id"] = str(machine["_id"])
                
                # Safely handle datetime conversion
                if "updatedAt" in machine:
                    if isinstance(machine["updatedAt"], datetime):
                        machine["updatedAt"] = machine["updatedAt"].isoformat()
                    elif machine["updatedAt"] is None:
                        machine["updatedAt"] = datetime.utcnow().isoformat()
                
                if "createdAt" in machine:
                    if isinstance(machine["createdAt"], datetime):
                        machine["createdAt"] = machine["createdAt"].isoformat()
                    elif machine["createdAt"] is None:
                        machine["createdAt"] = datetime.utcnow().isoformat()
                
                # Ensure required fields exist
                machine.setdefault("machineID", "Unknown")
                machine.setdefault("machineType", "Unknown")
                machine.setdefault("status", "Unknown")
                machine.setdefault("location", "Unknown")
                
                formatted_machines.append(machine)
                
            except Exception as format_error:
                print(f"DEBUG: Error formatting machine {machine.get('_id', 'unknown')}: {str(format_error)}")
                continue
        
        return APIResponse(
            success=True,
            message=f"Recent machines retrieved successfully. Found {len(formatted_machines)} machines.",
            data={"machines": formatted_machines}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {str(e)}"
        )
        

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
    
@router.get("/users", response_model=APIResponse)
async def get_users(current_user: dict = Depends(get_current_user)):
    """Get all users with default health scores"""
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get all customer users (not just from this dealership)
        users = await db.users.find({
            "role": "customer"  # Only get customers
        }).to_list(length=None)
        
        # Add default health score if missing
        for user in users:
            user["_id"] = str(user["_id"])
            if user.get("health_score") is None:
                user["health_score"] = 700
            if user.get("score_last_updated") is None:
                user["score_last_updated"] = user.get("createdAt")
        
        return APIResponse(
            success=True,
            message=f"Found {len(users)} users",
            data={"users": users}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")