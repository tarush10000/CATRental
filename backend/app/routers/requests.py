from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import motor.motor_asyncio
from decouple import config
from datetime import datetime
import uuid
from bson import ObjectId
from ..models.database import RequestCreate, RequestUpdate, APIResponse, RequestStatus
from .auth import get_current_user

router = APIRouter()

# MongoDB connection
MONGODB_URL = config("MONGODB_URL")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.caterpillar_db

def get_score_category(score: int) -> str:
    """Convert numeric score to category"""
    if score >= 750:
        return "Excellent"
    elif score >= 650:
        return "Good"
    elif score >= 550:
        return "Fair"
    else:
        return "Poor"

def get_score_color(score: int) -> str:
    """Get color code for score display"""
    if score >= 750:
        return "green"
    elif score >= 650:
        return "blue"
    elif score >= 550:
        return "yellow"
    else:
        return "red"

@router.post("/", response_model=APIResponse)
async def create_request(
    request_data: RequestCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        request_id = str(uuid.uuid4())
        
        request_doc = {
            "requestID": request_id,
            "machineID": request_data.machine_id,
            "requestType": request_data.request_type,
            "requestDate": datetime.utcnow(),
            "userID": current_user["userID"],
            "status": RequestStatus.IN_PROGRESS,
            "comments": request_data.comments,
            "date": request_data.date,
            "adminComments": None,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        result = await db.requests.insert_one(request_doc)
        
        if result.inserted_id:
            return APIResponse(
                success=True,
                message="Request created successfully",
                data={"request_id": request_id}
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to create request")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/", response_model=APIResponse)
async def get_requests_and_orders(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = Query(None),
    request_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """
    Enhanced endpoint to get all requests and pending orders with user health scores
    """
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        dealership_id = current_user["dealershipID"]
        
        # Build query for requests
        requests_query = {}
        
        # Get requests associated with this dealership's machines
        dealership_machines = await db.machines.find(
            {"dealerID": dealership_id},
            {"machineID": 1}
        ).to_list(length=None)
        dealership_machine_ids = [m["machineID"] for m in dealership_machines]
        
        requests_query["machineID"] = {"$in": dealership_machine_ids}
        
        # Apply status filter for requests
        if status and status in ["IN_PROGRESS", "APPROVED", "DENIED"]:
            requests_query["status"] = status.replace("_", "-")
        
        # Orders query - only fetch pending orders unless specific status requested
        orders_query = None
        if not status or status == "PENDING":
            orders_query = {"status": "Pending"}
        else:
            if status in ["APPROVED", "COMPLETED", "CANCELLED", "IN_PROGRESS"]:
                orders_query = None
        
        # Apply type filter for requests only
        if request_type and request_type != 'all':
            requests_query["requestType"] = {"$regex": request_type, "$options": "i"}
        
        # Fetch requests from requests table
        requests_cursor = db.requests.find(requests_query).sort("requestDate", -1)
        requests_list = await requests_cursor.to_list(length=100)
        
        # Fetch pending orders from newOrders table
        orders_list = []
        if orders_query is not None:
            orders_cursor = db.neworders.find(orders_query).sort("orderDate", -1)
            orders_list = await orders_cursor.to_list(length=100)
        
        # Enhanced: Enrich requests with user health scores and details
        for request in requests_list:
            request["_id"] = str(request["_id"])
            request["source"] = "requests"
            
            # Get user details including health score
            user = await db.users.find_one({"userID": request["userID"]})
            if user:
                health_score = user.get("health_score", 700) or 700
                request["user_details"] = {
                    "userID": user["userID"],
                    "name": user["name"],
                    "email": user.get("emailID", user.get("email", "")),
                    "health_score": health_score,
                    "score_category": get_score_category(health_score),
                    "score_color": get_score_color(health_score),
                    "score_last_updated": user.get("score_last_updated"),
                    "dealership_name": user.get("dealershipName", "")
                }
            else:
                request["user_details"] = {
                    "userID": request["userID"],
                    "name": "Unknown User",
                    "email": "",
                    "health_score": 700,
                    "score_category": "Unknown",
                    "score_color": "gray"
                }
        
        # Enhanced: Enrich orders with user health scores and availability info
        enriched_orders = []
        for order in orders_list:
            order["_id"] = str(order["_id"])
            
            # Get user details including health score
            user = await db.users.find_one({"userID": order["userID"]})
            if user:
                health_score = user.get("health_score", 700)
                order["user_details"] = {
                    "userID": user["userID"],
                    "name": user["name"],
                    "email": user.get("emailID", user.get("email", "")),
                    "health_score": health_score,
                    "score_category": get_score_category(health_score),
                    "score_color": get_score_color(health_score),
                    "score_last_updated": user.get("score_last_updated"),
                    "dealership_name": user.get("dealershipName", "")
                }
            else:
                order["user_details"] = {
                    "userID": order["userID"],
                    "name": "Unknown User", 
                    "email": "",
                    "health_score": 700,
                    "score_category": "Unknown",
                    "score_color": "gray"
                }
            
            # Check machine availability
            availability_query = {
                "machineType": {"$regex": order["machineType"], "$options": "i"},
                "dealerID": dealership_id,
                "status": {"$in": ["Ready"]},
                "$or": [
                    {"checkOutDate": None},
                    {"checkInDate": None},
                    {
                        "$and": [
                            {"checkInDate": {"$lte": order["checkInDate"]}},
                            {"checkOutDate": {"$gte": order["checkOutDate"]}}
                        ]
                    }
                ]
            }
            
            available_machines = await db.machines.find(availability_query).to_list(length=None)
            
            # Add availability information
            order["isAvailable"] = len(available_machines) > 0
            order["availableCount"] = len(available_machines)
            order["availableMachines"] = [
                {
                    "machineID": machine["machineID"],
                    "machineType": machine["machineType"],
                    "location": machine["location"],
                    "status": machine["status"]
                } for machine in available_machines
            ]
            
            # Add request-like fields for unified handling
            order["requestID"] = order.get("orderID", str(order["_id"]))
            order["requestType"] = "NEW_ORDER"
            order["requestDate"] = order.get("orderDate", order.get("createdAt"))
            order["machineID"] = "N/A"
            order["source"] = "newOrders"
            
            enriched_orders.append(order)
        
        # Combine both lists
        combined_list = requests_list + enriched_orders
        
        # Sort combined list by date (newest first)
        combined_list.sort(
            key=lambda x: x.get("requestDate", x.get("orderDate", datetime.min)), 
            reverse=True
        )
        
        # Get summary statistics
        total_items = len(combined_list)
        pending_orders = sum(1 for item in enriched_orders if item["isAvailable"])
        unavailable_orders = sum(1 for item in enriched_orders if not item["isAvailable"])
        
        # Health score statistics
        users_with_excellent_scores = sum(
            1 for item in combined_list 
            if item.get("user_details", {}).get("health_score", 700) >= 750
        )
        users_with_poor_scores = sum(
            1 for item in combined_list 
            if item.get("user_details", {}).get("health_score", 700) < 550
        )
        
        return APIResponse(
            success=True,
            message=f"Found {total_items} items ({len(requests_list)} requests, {len(enriched_orders)} pending orders)",
            data={
                "requests": combined_list,
                "summary": {
                    "total_items": total_items,
                    "requests_count": len(requests_list),
                    "orders_count": len(enriched_orders),
                    "available_orders": pending_orders,
                    "unavailable_orders": unavailable_orders,
                    "users_excellent_score": users_with_excellent_scores,
                    "users_poor_score": users_with_poor_scores
                },
                "filters": {
                    "status": status,
                    "request_type": request_type
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/", response_model=APIResponse)
async def get_requests_and_orders(
    status: Optional[str] = None,
    request_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    try:
        # Only admins can view all requests
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        dealership_id = current_user["dealershipID"]
        
        # Build queries for both collections
        requests_query = {}
        orders_query = {"status": "Pending"}  # Only pending orders
        
        # Apply status filter
        if status and status != 'all':
            requests_query["status"] = status
            if status == "PENDING":
                orders_query["status"] = "Pending"
            elif status in ["COMPLETED", "CANCELLED", "IN_PROGRESS"]:
                # Only include orders if we're filtering for specific statuses
                if status != "PENDING":
                    orders_query = None  # Don't fetch orders for non-pending status filters
        
        # Apply type filter for requests only (orders don't have requestType)
        if request_type and request_type != 'all':
            requests_query["requestType"] = {"$regex": request_type, "$options": "i"}
        
        # Fetch requests from requests table
        requests_cursor = db.requests.find(requests_query).sort("requestDate", -1)
        requests_list = await requests_cursor.to_list(length=100)
        
        # Fetch pending orders from newOrders table (only if orders_query is not None)
        orders_list = []
        if orders_query is not None:
            orders_cursor = db.neworders.find(orders_query).sort("orderDate", -1)
            orders_list = await orders_cursor.to_list(length=100)
        
        # Check machine availability for each order
        enriched_orders = []
        for order in orders_list:
            # Convert ObjectId to string
            order["_id"] = str(order["_id"])
            
            # Check if machine type is available during the specified time period
            availability_query = {
                "machineType": {"$regex": order["machineType"], "$options": "i"},
                "dealerID": dealership_id,
                "status": {"$in": ["Ready"]},  # Available statuses
                "$or": [
                    {"checkOutDate": None},  # Never been checked out
                    {"checkInDate": None},   # Currently checked out but could be available
                    {
                        "$and": [
                            {"checkInDate": {"$lte": order["checkInDate"]}},
                            {"checkOutDate": {"$gte": order["checkOutDate"]}}
                        ]
                    }
                ]
            }
            
            available_machines = await db.machines.find(availability_query).to_list(length=None)
            
            # Add availability information
            order["isAvailable"] = len(available_machines) > 0
            order["availableCount"] = len(available_machines)
            order["availableMachines"] = [machine["machineID"] for machine in available_machines]
            
            # Add request-like fields for unified handling in frontend
            order["requestID"] = order.get("orderID", str(order["_id"]))
            order["requestType"] = "NEW_ORDER"
            order["requestDate"] = order.get("orderDate", order.get("createdAt"))
            order["machineID"] = "N/A"  # New orders don't have specific machine assigned yet
            order["source"] = "newOrders"
            
            enriched_orders.append(order)
        
        # Convert requests ObjectId to string and add source
        for request in requests_list:
            request["_id"] = str(request["_id"])
            request["source"] = "requests"
            request["isAvailable"] = True  # Existing requests are always considered "available" for processing
        
        # Combine both lists
        combined_list = requests_list + enriched_orders
        
        # Sort combined list by date (newest first)
        combined_list.sort(key=lambda x: x.get("requestDate", x.get("orderDate", datetime.min)), reverse=True)
        
        # Get unique request types for frontend filtering
        request_types = set()
        for item in combined_list:
            if item.get("requestType"):
                request_types.add(item["requestType"])
        
        return APIResponse(
            success=True,
            message=f"Found {len(combined_list)} items ({len(requests_list)} requests, {len(enriched_orders)} pending orders)",
            data={
                "requests": combined_list,
                "summary": {
                    "total_items": len(combined_list),
                    "requests_count": len(requests_list),
                    "orders_count": len(enriched_orders),
                    "available_orders": sum(1 for order in enriched_orders if order["isAvailable"]),
                    "unavailable_orders": sum(1 for order in enriched_orders if not order["isAvailable"])
                },
                "available_types": sorted(list(request_types))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/requests/{request_id}/approve", response_model=APIResponse)
async def approve_request_with_score_check(
    request_id: str,
    approval_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Enhanced request approval with health score consideration"""
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        dealership_id = current_user["dealershipID"]
        current_time = datetime.utcnow()
        
        # Find the request
        request_doc = await db.requests.find_one({"requestID": request_id})
        order_doc = None
        
        if not request_doc:
            # Try to find in newOrders table
            try:
                order_doc = await db.neworders.find_one({"_id": ObjectId(request_id)})
                if not order_doc:
                    raise HTTPException(status_code=404, detail="Request not found")
            except:
                raise HTTPException(status_code=404, detail="Request not found")
        
        # Get user details and health score
        user_id = request_doc["userID"] if request_doc else order_doc["userID"]
        user = await db.users.find_one({"userID": user_id})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        health_score = user.get("health_score", 700)
        
        # Health score warnings for admin consideration
        score_warnings = []
        if health_score < 400:
            score_warnings.append("CRITICAL: User has very poor health score - consider extra monitoring")
        elif health_score < 550:
            score_warnings.append("WARNING: User has poor health score - consider additional terms")
        elif health_score >= 750:
            score_warnings.append("EXCELLENT: User has excellent score - eligible for premium terms")
        
        # Handle different types of requests
        if request_doc:
            # Regular request approval
            result = await handle_request_approval(request_doc, approval_data, dealership_id, current_time)
        else:
            # New order approval
            result = await handle_order_approval(order_doc, approval_data, dealership_id, current_time)
        
        # Add health score info to response
        result.data = result.data or {}
        result.data.update({
            "user_health_score": health_score,
            "score_category": get_score_category(health_score),
            "score_warnings": score_warnings
        })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

async def handle_request_approval(request_doc, approval_data, dealership_id, current_time):
    """Handle approval of regular requests"""
    
    # Verify machine belongs to this dealership
    machine = await db.machines.find_one({
        "machineID": request_doc["machineID"],
        "dealerID": dealership_id
    })
    
    if not machine:
        raise HTTPException(status_code=403, detail="Machine not under your dealership")
    
    # Update request status
    update_data = {
        "status": "Approved",
        "adminComments": approval_data.get("notes", "Request approved"),
        "updatedAt": current_time
    }
    
    # Handle different request types
    request_type = request_doc.get("requestType", "")
    
    if request_type == "Extension":
        # Handle extension request
        new_checkout_date = approval_data.get("new_checkout_date")
        if new_checkout_date:
            await db.machines.update_one(
                {"machineID": request_doc["machineID"]},
                {"$set": {"checkOutDate": new_checkout_date, "updatedAt": current_time}}
            )
            update_data["newCheckoutDate"] = new_checkout_date
    
    await db.requests.update_one(
        {"requestID": request_doc["requestID"]},
        {"$set": update_data}
    )
    
    return APIResponse(
        success=True,
        message=f"{request_type} request approved successfully",
        data={
            "request_id": request_doc["requestID"],
            "type": "request",
            "request_type": request_type
        }
    )

async def handle_order_approval(order_doc, approval_data, dealership_id, current_time):
    """Handle approval of new orders"""
    
    machine_id = approval_data.get("assigned_machine_id")
    if not machine_id:
        raise HTTPException(status_code=400, detail="Machine ID is required for order approval")
    
    # Verify machine exists and is available
    machine = await db.machines.find_one({
        "machineID": machine_id,
        "dealerID": dealership_id,
        "status": {"$in": ["Ready"]}
    })
    
    if not machine:
        raise HTTPException(status_code=400, detail="Machine not available for assignment")
    
    # Assign machine to user
    await db.machines.update_one(
        {"machineID": machine_id, "dealerID": dealership_id},
        {"$set": {
            "userID": order_doc.get("userID"),
            "siteID": order_doc.get("siteID"),
            "checkOutDate": order_doc.get("checkOutDate"),
            "checkInDate": order_doc.get("checkInDate"),
            "status": "Occupied",
            "updatedAt": current_time
        }}
    )
    
    # Update order status
    await db.neworders.update_one(
        {"_id": order_doc["_id"]},
        {"$set": {
            "status": "Approved",
            "assignedMachineID": machine_id,
            "adminComments": approval_data.get("notes", f"Order approved, machine {machine_id} assigned"),
            "updatedAt": current_time
        }}
    )
    
    return APIResponse(
        success=True,
        message=f"Order approved and machine {machine_id} assigned",
        data={
            "order_id": order_doc.get("orderID", str(order_doc["_id"])),
            "type": "new_order",
            "assigned_machine": machine_id
        }
    )


@router.post("/requests/{request_id}/reject", response_model=APIResponse)
async def reject_request(
    request_id: str,
    rejection_data: dict,
    current_user: dict = Depends(get_current_user)
):
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        current_time = datetime.utcnow()
        rejection_reason = rejection_data.get("reason", "Request rejected by admin")
        
        # Check if this is a request from requests table or newOrders table
        request_doc = None
        order_doc = None
        source_type = None
        
        # Try to find in requests table first
        request_doc = await db.requests.find_one({"requestID": request_id})
        if request_doc:
            source_type = "request"
        else:
            # Try to find in newOrders table
            order_doc = await db.neworders.find_one({"orderID": request_id})
            if order_doc:
                source_type = "order"
        
        if not request_doc and not order_doc:
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Handle rejection based on source type
        if source_type == "request":
            # Update request status to CANCELLED
            await db.requests.update_one(
                {"_id": request_doc["_id"]},
                {"$set": {
                    "status": "CANCELLED",
                    "adminComments": rejection_reason,
                    "updatedAt": current_time
                }}
            )
            
            return APIResponse(
                success=True,
                message="Request rejected successfully",
                data={
                    "request_id": request_doc["requestID"],
                    "reason": rejection_reason,
                    "type": "request"
                }
            )
        
        else:
            # Update order status to Denied
            await db.neworders.update_one(
                {"_id": order_doc["_id"]},
                {"$set": {
                    "status": "Denied",
                    "adminComments": rejection_reason,
                    "updatedAt": current_time
                }}
            )
            
            return APIResponse(
                success=True,
                message="Order rejected successfully",
                data={
                    "order_id": order_doc.get("orderID", str(order_doc["_id"])),
                    "reason": rejection_reason,
                    "type": "order"
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/requests/{request_id}/reject", response_model=APIResponse)
async def reject_request(
    request_id: str,
    rejection_data: dict,
    current_user: dict = Depends(get_current_user)
):
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        current_time = datetime.utcnow()
        rejection_reason = rejection_data.get("reason", "Request rejected by admin")
        
        # Check if this is a request from requests table or newOrders table
        request_doc = None
        order_doc = None
        source_type = None
        
        # Try to find in requests table first
        request_doc = await db.requests.find_one({"requestID": request_id})
        if request_doc:
            source_type = "request"
        else:
            # Try to find in newOrders table
            order_doc = await db.neworders.find_one({"orderID": request_id})
            if order_doc:
                source_type = "order"
        
        if not request_doc and not order_doc:
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Handle rejection based on source type
        if source_type == "request":
            # Update request status to CANCELLED
            await db.requests.update_one(
                {"_id": request_doc["_id"]},
                {"$set": {
                    "status": "CANCELLED",
                    "adminComments": rejection_reason,
                    "updatedAt": current_time
                }}
            )
            
            return APIResponse(
                success=True,
                message="Request rejected successfully",
                data={
                    "request_id": request_doc["requestID"],
                    "reason": rejection_reason,
                    "type": "request"
                }
            )
        
        else:
            # Update order status to Denied
            await db.neworders.update_one(
                {"_id": order_doc["_id"]},
                {"$set": {
                    "status": "Denied",
                    "adminComments": rejection_reason,
                    "updatedAt": current_time
                }}
            )
            
            return APIResponse(
                success=True,
                message="Order rejected successfully",
                data={
                    "order_id": order_doc.get("orderID", str(order_doc["_id"])),
                    "reason": rejection_reason,
                    "type": "order"
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

async def handle_order_approval(order_doc, approval_data, dealership_id, current_time):
    """Handle approval of new orders from newOrders table"""
    machine_id = approval_data.get("assigned_machine_id")
    if not machine_id:
        raise HTTPException(status_code=400, detail="Machine ID is required for order approval")
    
    # Verify the machine exists and is available
    machine = await db.machines.find_one({
        "machineID": machine_id,
        "dealerID": dealership_id,
        "status": {"$in": ["Ready",]}
    })
    
    if not machine:
        raise HTTPException(status_code=400, detail="Machine not available for assignment")
    
    # Check if machine is available during the requested time period
    check_out_date = order_doc.get("checkOutDate")
    check_in_date = order_doc.get("checkInDate")
    
    if not check_out_date or not check_in_date:
        raise HTTPException(status_code=400, detail="Order missing check-out or check-in dates")
    
    # Assign machine to user
    await db.machines.update_one(
        {"machineID": machine_id, "dealerID": dealership_id},
        {"$set": {
            "userID": order_doc.get("userID"),
            "siteID": order_doc.get("siteID"),
            "checkOutDate": check_out_date,
            "checkInDate": check_in_date,
            "status": "OCCUPIED",
            "updatedAt": current_time
        }}
    )
    
    # Update order status
    await db.neworders.update_one(
        {"_id": order_doc["_id"]},
        {"$set": {
            "status": "Approved",
            "assignedMachineID": machine_id,
            "adminComments": approval_data.get("notes", f"Order approved, machine {machine_id} assigned"),
            "updatedAt": current_time
        }}
    )
    
    return APIResponse(
        success=True,
        message=f"Order approved and machine {machine_id} assigned",
        data={
            "order_id": order_doc.get("orderID", str(order_doc["_id"])),
            "type": "new_order",
            "assigned_machine": machine_id,
            "check_out_date": check_out_date.isoformat() if isinstance(check_out_date, datetime) else check_out_date,
            "check_in_date": check_in_date.isoformat() if isinstance(check_in_date, datetime) else check_in_date
        }
    )


@router.post("/requests/{request_id}/reject", response_model=APIResponse)
async def reject_request(
    request_id: str,
    rejection_data: dict,
    current_user: dict = Depends(get_current_user)
):
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        current_time = datetime.utcnow()
        rejection_reason = rejection_data.get("reason", "Request rejected by admin")
        
        # Check if this is a request from requests table or newOrders table
        request_doc = None
        order_doc = None
        source_type = None
        
        # Try to find in requests table first
        request_doc = await db.requests.find_one({"requestID": request_id})
        if request_doc:
            source_type = "request"
        else:
            # Try to find in newOrders table
            order_doc = await db.neworders.find_one({"orderID": request_id})
            if order_doc:
                source_type = "order"
        
        if not request_doc and not order_doc:
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Handle rejection based on source type
        if source_type == "request":
            # Update request status to CANCELLED
            await db.requests.update_one(
                {"_id": request_doc["_id"]},
                {"$set": {
                    "status": "CANCELLED",
                    "adminComments": rejection_reason,
                    "updatedAt": current_time
                }}
            )
            
            return APIResponse(
                success=True,
                message="Request rejected successfully",
                data={
                    "request_id": request_doc["requestID"],
                    "reason": rejection_reason,
                    "type": "request"
                }
            )
        
        else:
            # Update order status to Denied
            await db.neworders.update_one(
                {"_id": order_doc["_id"]},
                {"$set": {
                    "status": "Denied",
                    "adminComments": rejection_reason,
                    "updatedAt": current_time
                }}
            )
            
            return APIResponse(
                success=True,
                message="Order rejected successfully",
                data={
                    "order_id": order_doc.get("orderID", str(order_doc["_id"])),
                    "reason": rejection_reason,
                    "type": "order"
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/available-machines", response_model=APIResponse)
async def get_available_machines_for_assignment(
    machine_type: Optional[str] = None,
    check_out_date: Optional[str] = None,
    check_in_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get available machines for assignment to new orders"""
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        dealership_id = current_user["dealershipID"]
        
        # Base query for available machines
        query = {
            "dealerID": dealership_id,
            "status": {"$in": ["Ready"]}
        }
        
        # Filter by machine type if provided
        if machine_type:
            query["machineType"] = {"$regex": machine_type, "$options": "i"}
        
        # If dates are provided, check for conflicts
        if check_out_date and check_in_date:
            try:
                checkout_dt = datetime.fromisoformat(check_out_date.replace('Z', '+00:00'))
                checkin_dt = datetime.fromisoformat(check_in_date.replace('Z', '+00:00'))
                
                # Add date conflict check to query
                query["$or"] = [
                    {"checkOutDate": None},  # Never been assigned
                    {"checkInDate": None},   # Currently assigned but could be available
                    {
                        "$and": [
                            {"checkInDate": {"$lte": checkout_dt}},  # Returns before new checkout
                        ]
                    }
                ]
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format")
        
        # Fetch available machines
        cursor = db.machines.find(query)
        machines = await cursor.to_list(length=100)
        
        # Convert ObjectId to string
        for machine in machines:
            machine["_id"] = str(machine["_id"])
        
        return APIResponse(
            success=True,
            message=f"Found {len(machines)} available machines",
            data={
                "machines": machines,
                "count": len(machines),
                "filters": {
                    "machine_type": machine_type,
                    "check_out_date": check_out_date,
                    "check_in_date": check_in_date
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")