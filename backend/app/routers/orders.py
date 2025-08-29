from fastapi import APIRouter, HTTPException, Depends
import motor.motor_asyncio
from decouple import config
from datetime import datetime
from bson import ObjectId
from math import radians, sin, cos, sqrt, atan2
from typing import List
from ..models.database import APIResponse, NewOrderForm, TransferStatus, UserRole
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

@router.post("/new-order", response_model=APIResponse)
async def place_order_and_create_transfers(
    order: NewOrderForm,
    current_user: dict = Depends(get_current_user)
):
    """Enhanced order placement with automatic transfer recommendations"""
    
    if current_user["role"] != UserRole.CUSTOMER.value:
        raise HTTPException(status_code=403, detail="Only customers can place orders")
    
    # Validate dates
    if order.check_in_date >= order.check_out_date:
        raise HTTPException(status_code=400, detail="Check-in date must be before check-out date")
    
    if order.check_in_date <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Check-in date must be in the future")
    
    # Create the main order document first
    order_doc = {
        "userID": current_user["userID"],
        "machineType": order.machine_type,
        "location": f"{order.location_lat}, {order.location_lon}",
        "siteID": f"SITE-{order.location_lat:.4f}-{order.location_lon:.4f}",
        "checkInDate": order.check_in_date,
        "checkOutDate": order.check_out_date,
        "status": "Pending",
        "comments": f"Quantity requested: {order.quantity}",
        "orderDate": datetime.utcnow(),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    inserted_order = await db.neworders.insert_one(order_doc)
    order_id = inserted_order.inserted_id
    
    # Find available machines
    available_machines = await db.machines.find({
        "machineType": {"$regex": order.machine_type, "$options": "i"},
        "status": {"$in": ["Ready"]},
        "$or": [
            {"checkOutDate": None},
            {"checkInDate": {"$lte": order.check_in_date}},
        ]
    }).to_list(length=None)
    
    if len(available_machines) < order.quantity:
        await db.neworders.delete_one({"_id": order_id})
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient machines available. Found {len(available_machines)}, need {order.quantity}"
        )
    
    # Sort machines by proximity to requested location
    machines_with_distance = []
    for machine in available_machines[:order.quantity]:
        machine_coords = machine["location"].split(", ")
        if len(machine_coords) == 2:
            try:
                machine_lat, machine_lon = float(machine_coords[0]), float(machine_coords[1])
                distance = calculate_distance(
                    machine_lat, machine_lon, 
                    order.location_lat, order.location_lon
                )
                machines_with_distance.append((machine, distance))
            except (ValueError, IndexError):
                # Skip machines with invalid coordinates
                continue
    
    # Sort by distance and select closest machines
    machines_with_distance.sort(key=lambda x: x[1])
    selected_machines = [m[0] for m in machines_with_distance[:order.quantity]]
    
    if len(selected_machines) < order.quantity:
        await db.neworders.delete_one({"_id": order_id})
        raise HTTPException(
            status_code=400, 
            detail="Could not find enough machines with valid locations"
        )
    
    # Create transfer documents
    created_transfers = 0
    for machine in selected_machines:
        machine_coords = machine["location"].split(", ")
        machine_lat, machine_lon = float(machine_coords[0]), float(machine_coords[1])
        
        transfer_doc = {
            "orderID": str(order_id),
            "machineID": machine["machineID"],
            "dealerID": machine["dealerID"],
            "userID1": machine["dealerID"],  # Current custodian (dealer)
            "userID2": current_user["userID"],  # Requesting user
            "location1": {"lat": machine_lat, "lon": machine_lon},
            "location2": {"lat": order.location_lat, "lon": order.location_lon},
            "status": TransferStatus.PENDING.value,
            "transferID": str(ObjectId()),
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        }
        
        await db.transfers.insert_one(transfer_doc)
        created_transfers += 1
    
    return APIResponse(
        success=True,
        message=f"Order placed successfully. {created_transfers} transfer requests created.",
        data={
            "order_id": str(order_id),
            "transfers_created": created_transfers,
            "machines_requested": order.quantity
        }
    )

@router.patch("/transfers/{transfer_id}/approve", response_model=APIResponse)
async def approve_transfer_request(
    transfer_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Approve a transfer request and assign machine"""
    
    if current_user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Only admins can approve transfers")
    
    # Find the transfer request
    transfer = await db.transfers.find_one({"transferID": transfer_id})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer request not found")
    
    if transfer["dealerID"] != current_user["dealershipID"]:
        raise HTTPException(status_code=403, detail="Not authorized to approve this request")
    
    if transfer["status"] != TransferStatus.PENDING.value:
        raise HTTPException(status_code=400, detail=f"Request is already {transfer['status']}")
    
    # Find the original order to get dates
    order = await db.neworders.find_one({"_id": ObjectId(transfer["orderID"])})
    if not order:
        raise HTTPException(status_code=404, detail="Original order not found")
    
    # Atomically update the machine if it's still "Ready"
    result = await db.machines.update_one(
        {"machineID": transfer["machineID"], "status": "Ready"},
        {"$set": {
            "status": "In-transit",
            "userID": transfer["userID2"],
            "checkInDate": order["checkInDate"],
            "checkOutDate": order["checkOutDate"],
            "location": f"{transfer['location2']['lat']}, {transfer['location2']['lon']}",
            "engineHoursPerDay": 0.0,
            "idleHours": 0.0,
            "operatingDays": 0,
            "updatedAt": datetime.utcnow()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=409, 
            detail="Machine is no longer available. It may have been allocated to another order."
        )
    
    # Update the transfer request status to "approved"
    await db.transfers.update_one(
        {"transferID": transfer_id},
        {"$set": {
            "status": TransferStatus.APPROVED.value,
            "adminComments": f"Approved by {current_user.get('name', 'Admin')}",
            "updatedAt": datetime.utcnow()
        }}
    )
    
    return APIResponse(
        success=True, 
        message="Transfer approved and machine assigned successfully.",
        data={
            "transfer_id": transfer_id,
            "machine_id": transfer["machineID"],
            "assigned_to": transfer["userID2"]
        }
    )

@router.patch("/transfers/{transfer_id}/decline", response_model=APIResponse)
async def decline_transfer_request(
    transfer_id: str,
    reason: str,
    current_user: dict = Depends(get_current_user)
):
    """Decline a transfer request"""
    
    if current_user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Only admins can decline transfers")
    
    transfer = await db.transfers.find_one({"transferID": transfer_id})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer request not found")
    
    if transfer["dealerID"] != current_user["dealershipID"]:
        raise HTTPException(status_code=403, detail="Not authorized to decline this request")
    
    if transfer["status"] != TransferStatus.PENDING.value:
        raise HTTPException(status_code=400, detail=f"Request is already {transfer['status']}")
    
    # Update the transfer request status to "declined"
    await db.transfers.update_one(
        {"transferID": transfer_id},
        {"$set": {
            "status": TransferStatus.DECLINED.value,
            "adminComments": reason,
            "updatedAt": datetime.utcnow()
        }}
    )
    
    return APIResponse(
        success=True,
        message="Transfer request declined.",
        data={"transfer_id": transfer_id, "reason": reason}
    )