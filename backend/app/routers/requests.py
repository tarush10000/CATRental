from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import motor.motor_asyncio
from decouple import config
from datetime import datetime
import uuid

from ..models.database import RequestCreate, RequestUpdate, APIResponse, RequestStatus
from .auth import get_current_user

router = APIRouter()

# MongoDB connection
MONGODB_URL = config("MONGODB_URL")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.caterpillar_db

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
async def get_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    try:
        query = {}
        
        # Filter by role
        if current_user["role"] == "customer":
            query["userID"] = current_user["userID"]
        elif current_user["role"] == "admin":
            # Admin can see requests for machines from their dealership
            dealer_machines = await db.machines.find(
                {"dealerID": current_user["dealershipID"]},
                {"machineID": 1}
            ).to_list(length=None)
            machine_ids = [m["machineID"] for m in dealer_machines]
            query["machineID"] = {"$in": machine_ids}
        
        if status:
            query["status"] = status
        
        cursor = db.requests.find(query).sort("requestDate", -1)
        requests = await cursor.to_list(length=100)
        
        # Convert ObjectId to string
        requests_data = []
        for request in requests:
            request["_id"] = str(request["_id"])
            requests_data.append(request)
        
        return APIResponse(
            success=True,
            message=f"Found {len(requests_data)} requests",
            data={"requests": requests_data}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
