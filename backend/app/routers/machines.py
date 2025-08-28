from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
import motor.motor_asyncio
from decouple import config
from datetime import datetime
import uuid
import os

from ..models.database import (
    MachineCreate, MachineUpdate, Machine, APIResponse, 
    BarcodeData, MachineStatus
)
from .auth import get_current_user

router = APIRouter()

# MongoDB connection
MONGODB_URL = config("MONGODB_URL")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.caterpillar_db

@router.post("/", response_model=APIResponse)
async def create_machine(
    machine_data: MachineCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        # Only admins can create machines
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only admins can create machines")
        
        # Check if machine already exists
        existing_machine = await db.machines.find_one({"machineID": machine_data.machine_id})
        if existing_machine:
            raise HTTPException(status_code=400, detail="Machine ID already exists")
        
        machine_doc = {
            "machineID": machine_data.machine_id,
            "machineType": machine_data.machine_type,
            "location": machine_data.location,
            "siteID": machine_data.site_id,
            "checkOutDate": None,
            "checkInDate": None,
            "engineHoursPerDay": 0.0,
            "idleHours": 0.0,
            "operatingDays": 0,
            "lastOperatingID": None,
            "userID": None,
            "status": MachineStatus.READY,
            "dealerID": current_user["dealershipID"],
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        result = await db.machines.insert_one(machine_doc)
        
        if result.inserted_id:
            return APIResponse(
                success=True,
                message="Machine created successfully",
                data={"machine_id": machine_data.machine_id}
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to create machine")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/scan-barcode", response_model=APIResponse)
async def scan_barcode(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        # Only admins can scan barcodes
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only admins can scan barcodes")
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # For now, return a placeholder response until we fix the OpenCV issue
        # TODO: Implement barcode scanning once dependencies are resolved
        
        # Mock barcode data for testing
        barcode_info = {
            "machine_id": f"CAT-MOCK-{uuid.uuid4().hex[:8].upper()}",
            "machine_type": "Caterpillar Excavator",
            "manufacturer": "CAT",
            "model": "320",
            "year": "2024"
        }
        
        return APIResponse(
            success=True,
            message="Barcode scanning temporarily disabled - using mock data",
            data={"barcodes": [barcode_info]}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/", response_model=APIResponse)
async def get_machines(
    status: Optional[str] = None,
    machine_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    try:
        query = {}
        
        # Filter by dealership for admins, by user for customers
        if current_user["role"] == "admin":
            query["dealerID"] = current_user["dealershipID"]
        elif current_user["role"] == "customer":
            query["userID"] = current_user["userID"]
        
        # Apply additional filters
        if status:
            query["status"] = status
        if machine_type:
            query["machineType"] = {"$regex": machine_type, "$options": "i"}
        
        cursor = db.machines.find(query).sort("updatedAt", -1)
        machines = await cursor.to_list(length=100)
        
        # Convert ObjectId to string and format response
        machines_data = []
        for machine in machines:
            machine["_id"] = str(machine["_id"])
            machines_data.append(machine)
        
        return APIResponse(
            success=True,
            message=f"Found {len(machines_data)} machines",
            data={"machines": machines_data}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{machine_id}", response_model=APIResponse)
async def get_machine(
    machine_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        query = {"machineID": machine_id}
        
        # Additional access control
        if current_user["role"] == "admin":
            query["dealerID"] = current_user["dealershipID"]
        elif current_user["role"] == "customer":
            query["userID"] = current_user["userID"]
        
        machine = await db.machines.find_one(query)
        
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        machine["_id"] = str(machine["_id"])
        
        return APIResponse(
            success=True,
            message="Machine retrieved successfully",
            data={"machine": machine}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/{machine_id}", response_model=APIResponse)
async def update_machine(
    machine_id: str,
    machine_update: MachineUpdate,
    current_user: dict = Depends(get_current_user)
):
    try:
        # Only admins can update machines
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only admins can update machines")
        
        query = {
            "machineID": machine_id,
            "dealerID": current_user["dealershipID"]
        }
        
        machine = await db.machines.find_one(query)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        # Prepare update data
        update_data = {}
        for field, value in machine_update.dict(exclude_unset=True).items():
            if value is not None:
                # Convert field names to match database schema
                db_field = {
                    "machine_type": "machineType",
                    "check_out_date": "checkOutDate",
                    "check_in_date": "checkInDate",
                    "engine_hours_per_day": "engineHoursPerDay",
                    "idle_hours": "idleHours",
                    "operating_days": "operatingDays"
                }.get(field, field)
                
                update_data[db_field] = value
        
        update_data["updatedAt"] = datetime.utcnow()
        
        result = await db.machines.update_one(
            query,
            {"$set": update_data}
        )
        
        if result.modified_count:
            return APIResponse(
                success=True,
                message="Machine updated successfully"
            )
        else:
            return APIResponse(
                success=False,
                message="No changes made to machine"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/{machine_id}", response_model=APIResponse)
async def delete_machine(
    machine_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        # Only admins can delete machines
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only admins can delete machines")
        
        query = {
            "machineID": machine_id,
            "dealerID": current_user["dealershipID"]
        }
        
        machine = await db.machines.find_one(query)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        # Check if machine is currently in use
        if machine["status"] == MachineStatus.OCCUPIED:
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete machine that is currently in use"
            )
        
        result = await db.machines.delete_one(query)
        
        if result.deleted_count:
            return APIResponse(
                success=True,
                message="Machine deleted successfully"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to delete machine")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/{machine_id}/assign", response_model=APIResponse)
async def assign_machine(
    machine_id: str,
    user_id: str,
    site_id: str,
    check_out_date: datetime,
    check_in_date: datetime,
    current_user: dict = Depends(get_current_user)
):
    try:
        # Only admins can assign machines
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only admins can assign machines")
        
        query = {
            "machineID": machine_id,
            "dealerID": current_user["dealershipID"]
        }
        
        machine = await db.machines.find_one(query)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        if machine["status"] != MachineStatus.READY:
            raise HTTPException(
                status_code=400, 
                detail="Machine is not available for assignment"
            )
        
        # Update machine assignment
        update_data = {
            "userID": user_id,
            "siteID": site_id,
            "checkOutDate": check_out_date,
            "checkInDate": check_in_date,
            "status": MachineStatus.OCCUPIED,
            "updatedAt": datetime.utcnow()
        }
        
        result = await db.machines.update_one(query, {"$set": update_data})
        
        if result.modified_count:
            return APIResponse(
                success=True,
                message="Machine assigned successfully"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to assign machine")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")