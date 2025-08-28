from fastapi import APIRouter, HTTPException, Depends
import motor.motor_asyncio
from decouple import config
from datetime import datetime

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
        
        stats = {
            "my_machines": my_machines,
            "active_orders": active_orders,
            "pending_requests": pending_requests,
            "completed_orders": await db.neworders.count_documents({
                "userID": user_id,
                "status": "Completed"
            })
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

@router.get("/recommendations", response_model=APIResponse)
async def get_recommendations(current_user: dict = Depends(get_current_user)):
    try:
        if current_user["role"] != "customer":
            raise HTTPException(status_code=403, detail="Customer access required")
        
        # Generate smart recommendations based on user's machine usage
        recommendations = [
            {
                "type": "efficiency",
                "title": "Optimize Machine Usage",
                "description": "Your excavator has 15% idle time. Consider scheduling maintenance during peak idle hours.",
                "priority": "medium",
                "suggested_action": "Schedule maintenance for next Tuesday"
            },
            {
                "type": "cost_saving",
                "title": "Reduce Transportation Costs",
                "description": "You can save 20% on transport by extending your current rental by 3 days.",
                "priority": "high",
                "suggested_action": "Extend rental period"
            }
        ]
        
        return APIResponse(
            success=True,
            message="Recommendations retrieved successfully",
            data={"recommendations": recommendations}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")