from fastapi import APIRouter, HTTPException, Depends
import motor.motor_asyncio
from decouple import config
from datetime import datetime
from typing import List
from ..models.database import APIResponse, HealthScoreUpdate, HealthScoreResponse
from .auth import get_current_user

router = APIRouter()

# MongoDB connection
MONGODB_URL = config("MONGODB_URL")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.caterpillar_db

# Scoring parameters
BASE_SCORE = 700
MAX_SCORE = 850
MIN_SCORE = 300

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

def get_score_recommendations(score: int, utilization: float) -> List[str]:
    """Get recommendations based on score and utilization"""
    recommendations = []
    
    if score < 550:
        recommendations.append("Improve machine utilization to increase your score")
        recommendations.append("Avoid overusing equipment to prevent damage")
    
    if utilization < 10:
        recommendations.append("Consider reducing the number of machines or increasing usage")
    elif utilization > 80:
        recommendations.append("Consider requesting additional machines to avoid overutilization")
    
    if score >= 750:
        recommendations.append("Excellent score! You're eligible for premium equipment and priority support")
    
    return recommendations

@router.post("/calculate/{user_id}", response_model=APIResponse)
async def calculate_user_health_score(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Calculates and updates the health score for a specific user based on
    the utilization of their currently occupied machines.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Step 1: Find all machines currently occupied by the user
    user_machines_cursor = db.machines.find({
        "userID": user_id,
        "status": "Occupied"
    })
    user_machines = await user_machines_cursor.to_list(length=None)
    
    if not user_machines:
        raise HTTPException(status_code=404, detail="No occupied machines found for this user to calculate a score.")
    
    # Step 2: Calculate the utilization for each machine and find the average
    utilization_percentages = []
    machine_ids = []
    
    for machine in user_machines:
        machine_ids.append(machine["machineID"])
        engine_hours = machine.get("engineHoursPerDay", 0.0)
        idle_hours = machine.get("idleHours", 0.0)
        total_hours = engine_hours + idle_hours
        
        if total_hours > 0:
            utilization = (engine_hours / total_hours) * 100
            utilization_percentages.append(utilization)
    
    if not utilization_percentages:
        return APIResponse(
            success=False,
            message="Could not calculate score: no usage data on occupied machines."
        )
    
    average_utilization = sum(utilization_percentages) / len(utilization_percentages)
    
    # Step 3: Find the user to get their current score
    user = await db.users.find_one({"userID": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_score = user.get("health_score", BASE_SCORE)
    
    # Step 4: Calculate the new score based on the average utilization
    delta = 0
    reason = ""
    
    if 10 <= average_utilization <= 80:
        delta = 5
        reason = f"Good utilization ({average_utilization:.1f}%) - score increased"
    elif average_utilization < 10:
        delta = -2
        reason = f"Low utilization ({average_utilization:.1f}%) - score decreased slightly"
    else:  # average_utilization > 80
        delta = -8
        reason = f"High utilization ({average_utilization:.1f}%) - risk of overuse, score decreased"
    
    new_score = max(MIN_SCORE, min(MAX_SCORE, current_score + delta))
    
    # Step 5: Update the user's document in the database
    result = await db.users.update_one(
        {"userID": user_id},
        {
            "$set": {
                "health_score": new_score,
                "score_last_updated": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to update user score.")
    
    # Step 6: Log the score change
    score_update_log = {
        "user_id": user_id,
        "old_score": current_score,
        "new_score": new_score,
        "delta": delta,
        "reason": reason,
        "average_utilization": average_utilization,
        "affected_machines": machine_ids,
        "updated_by": current_user["userID"],
        "timestamp": datetime.utcnow()
    }
    
    await db.health_score_logs.insert_one(score_update_log)
    
    return APIResponse(
        success=True,
        message=f"User score updated successfully based on average utilization of {average_utilization:.2f}%.",
        data={
            "user_id": user_id,
            "old_score": current_score,
            "new_score": new_score,
            "delta": delta,
            "reason": reason,
            "category": get_score_category(new_score),
            "recommendations": get_score_recommendations(new_score, average_utilization)
        }
    )

@router.get("/{user_id}", response_model=APIResponse)
async def get_user_health_score(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get health score for a specific user"""
    
    # Admins can see any user's score, customers can only see their own
    if current_user.get("role") != "admin" and current_user.get("userID") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    user = await db.users.find_one({"userID": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Handle missing or None health_score - set default to 700
    current_score = user.get("health_score", 700) or 700
    last_updated = user.get("score_last_updated") or user.get("createdAt")
    
    # Get recent utilization for recommendations
    user_machines = await db.machines.find({
        "userID": user_id,
        "status": "Occupied"
    }).to_list(length=None)
    
    avg_utilization = 0.0
    if user_machines:
        utilizations = []
        for machine in user_machines:
            engine_hours = machine.get("engineHoursPerDay", 0.0)
            idle_hours = machine.get("idleHours", 0.0)
            total_hours = engine_hours + idle_hours
            if total_hours > 0:
                utilizations.append((engine_hours / total_hours) * 100)
        
        if utilizations:
            avg_utilization = sum(utilizations) / len(utilizations)
    
    return APIResponse(
        success=True,
        message="Health score retrieved successfully",
        data={
            "user_id": user_id,
            "user_name": user.get("name", "Unknown"),
            "current_score": current_score,
            "category": get_score_category(current_score),
            "last_updated": last_updated,
            "current_utilization": round(avg_utilization, 2),
            "active_machines": len(user_machines),
            "recommendations": get_score_recommendations(current_score, avg_utilization)
        }
    )

@router.get("/logs/{user_id}", response_model=APIResponse)
async def get_score_history(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    limit: int = 10
):
    """Get health score change history for a user"""
    
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    logs = await db.health_score_logs.find(
        {"user_id": user_id}
    ).sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    # Convert ObjectId to string
    for log in logs:
        log["_id"] = str(log["_id"])
    
    return APIResponse(
        success=True,
        message=f"Found {len(logs)} score history entries",
        data={"logs": logs, "user_id": user_id}
    )