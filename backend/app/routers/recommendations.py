from fastapi import APIRouter, HTTPException, Depends, Query
import motor.motor_asyncio
from decouple import config
from datetime import datetime, timedelta
from typing import Optional, List
import uuid
import json
from math import radians, sin, cos, sqrt, atan2
from ..models.database import (
    APIResponse, Transfer, TransferCreate, TransferUpdate, TransferStatus,
    RecommendationModel, RecommendationCreate, RecommendationType, RecommendationSeverity,
    MachineLocation, TransferRecommendation
)
from .auth import get_current_user
import google.generativeai as genai

router = APIRouter()

GEMINI_API_KEY = config("GEMINI_API_KEY", default="")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
# MongoDB connection
MONGODB_URL = config("MONGODB_URL")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.caterpillar_db

async def generate_ai_recommendation(machine_data, utilization_stats, recommendation_type="usage"):
    """Generate AI-powered recommendations using Gemini"""
    if not GEMINI_API_KEY:
        return "AI recommendations unavailable - API key not configured"
    
    try:
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        
        if recommendation_type == "usage":
            prompt = f"""
            As an expert in construction equipment management, analyze this machine usage data and provide actionable optimization recommendations:

            Machine Data:
            - Total Machines: {machine_data.get('total_machines', 0)}
            - Active Machines: {machine_data.get('active_machines', 0)}
            - Average Utilization: {utilization_stats.get('avg_utilization', 0):.1f}%
            - Machine Types: {', '.join(machine_data.get('machine_types', []))}
            - Idle Hours: {utilization_stats.get('total_idle_hours', 0)} hours/week
            - Operating Days: {utilization_stats.get('avg_operating_days', 0)} days/week

            Performance Metrics:
            - Machines over 80% utilization: {utilization_stats.get('overutilized_count', 0)}
            - Machines under 30% utilization: {utilization_stats.get('underutilized_count', 0)}
            - Total engine hours: {utilization_stats.get('total_engine_hours', 0)} hours

            Provide specific, actionable recommendations for:
            1. Optimizing machine utilization
            2. Reducing idle time and costs
            3. Preventing equipment overuse
            4. Improving operational efficiency

            Keep recommendations concise, practical, and focused on ROI. Format as a JSON object with 'recommendation', 'priority', 'potential_savings', and 'action_steps' fields.
            """
        
        elif recommendation_type == "transfer":
            prompt = f"""
            Analyze this construction fleet data to identify transfer optimization opportunities:

            Fleet Overview:
            - Total Machines: {machine_data.get('total_machines', 0)}
            - Geographic Distribution: {machine_data.get('locations', [])}
            - Machine Utilization Variance: {utilization_stats.get('utilization_variance', 0):.2f}
            - Average Transport Cost: ${utilization_stats.get('avg_transport_cost', 50)}/km

            Identify opportunities to:
            1. Reduce transportation costs
            2. Balance machine utilization across sites
            3. Minimize idle time through strategic transfers
            4. Optimize equipment placement
            5. Mention as specific details like equipment condition, maintenance history, and usage patterns along with the machine name / type they are referring to

            Provide specific transfer recommendations with estimated cost savings. Format as JSON with 'recommendation', 'estimated_savings', 'affected_machines', and 'implementation_steps'.
            """
        
        response = model.generate_content(prompt)
        
        # Try to parse as JSON, fall back to plain text
        try:
            return json.loads(response.text)
        except:
            return {"recommendation": response.text, "priority": "medium", "ai_generated": True}
            
    except Exception as e:
        return f"AI recommendation generation failed: {str(e)}"
    
@router.post("/generate-recommendations", response_model=APIResponse)
async def generate_all_recommendations(current_user: dict = Depends(get_current_user)):
    """Generate both transfer and usage optimization recommendations using existing logic"""
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        dealer_id = current_user["dealershipID"]
        
        # === EXISTING TRANSFER LOGIC INTEGRATION ===
        
        # Get all pending orders that need machines
        pending_orders = await db.neworders.find({
            "status": "Pending"
        }).to_list(length=None)
        
        # Get all occupied machines from this dealership
        occupied_machines = await db.machines.find({
            "dealerID": dealer_id,
            "status": "Occupied",
            "userID": {"$ne": None}
        }).to_list(length=None)
        
        # Get ready machines for additional transfer opportunities
        ready_machines = await db.machines.find({
            "dealerID": dealer_id,
            "status": "Ready"
        }).to_list(length=None)
        
        all_machines = occupied_machines + ready_machines
        transfer_opportunities = []
        max_distance = 100000.0  # km
        
        # === DISTANCE-BASED TRANSFER OPTIMIZATION ===
        
        for order in pending_orders:
            if not order.get("location"):
                continue
                
            order_coords = order["location"].split(", ")
            if len(order_coords) != 2:
                continue
                
            try:
                order_lat, order_lon = float(order_coords[0]), float(order_coords[1])
            except (ValueError, TypeError):
                continue
            
            # Find machines of the same type that could be transferred
            suitable_machines = [
                m for m in occupied_machines 
                if order["machineType"].lower() in m.get("machineType", "").lower()
            ]
            
            for machine in suitable_machines:
                if not machine.get("location"):
                    continue
                    
                machine_coords = machine["location"].split(", ")
                if len(machine_coords) != 2:
                    continue
                    
                try:
                    machine_lat, machine_lon = float(machine_coords[0]), float(machine_coords[1])
                except (ValueError, TypeError):
                    continue
                
                # Calculate distance from machine to order location
                machine_to_order_distance = calculate_distance(
                    machine_lat, machine_lon, order_lat, order_lon
                )
                
                # Only consider if within reasonable distance
                if machine_to_order_distance <= max_distance:
                    # Calculate potential savings
                    cost_per_km = 2.5  # Updated cost per km
                    estimated_dealer_distance = machine_to_order_distance * 1.5  # Rough estimate
                    
                    current_cost = estimated_dealer_distance * cost_per_km
                    transfer_cost = machine_to_order_distance * cost_per_km
                    estimated_savings = max(0, current_cost - transfer_cost)
                    
                    if estimated_savings > 10:  # Only if savings > $10
                        # Check if machine will be free soon
                        machine_free_date = machine.get("checkInDate")
                        order_needed_date = order.get("checkInDate")
                        
                        time_compatibility = True
                        if machine_free_date and order_needed_date:
                            try:
                                if isinstance(machine_free_date, str):
                                    machine_free = datetime.fromisoformat(machine_free_date.replace('Z', '+00:00'))
                                else:
                                    machine_free = machine_free_date
                                    
                                if isinstance(order_needed_date, str):
                                    order_needed = datetime.fromisoformat(order_needed_date.replace('Z', '+00:00'))
                                else:
                                    order_needed = order_needed_date
                                
                                # Machine should be free before or close to when order needs it
                                time_compatibility = machine_free <= order_needed + timedelta(days=2)
                            except:
                                time_compatibility = True  # If dates are unclear, assume compatible
                        
                        if time_compatibility:
                            # Get user details
                            current_user_doc = await db.users.find_one({"userID": machine["userID"]})
                            requesting_user_doc = await db.users.find_one({"userID": order["userID"]})
                            
                            # Create transfer recommendation
                            transfer_doc = {
                                "transferID": str(uuid.uuid4()),
                                "machineID": machine["machineID"],
                                "dealerID": dealer_id,
                                "userID1": machine["userID"],
                                "userID2": order["userID"],
                                "location1": {"lat": machine_lat, "lon": machine_lon},
                                "location2": {"lat": order_lat, "lon": order_lon},
                                "status": "pending",
                                "transferType": "distance_optimized",
                                "recommendationReason": f"Transfer {machine['machineType']} from {current_user_doc['name'] if current_user_doc else 'Unknown'} to {requesting_user_doc['name'] if requesting_user_doc else 'Unknown'} - Save ${estimated_savings:.2f} in transport costs",
                                "estimatedSavings": round(estimated_savings, 2),
                                "distanceSaved": round(estimated_dealer_distance - machine_to_order_distance, 2),
                                "machineAvailableDate": machine_free_date,
                                "orderRequiredDate": order_needed_date,
                                "createdBy": current_user["userID"],
                                "createdAt": datetime.utcnow(),
                                "updatedAt": datetime.utcnow()
                            }
                            
                            result = await db.transfers.insert_one(transfer_doc)
                            if result.inserted_id:
                                transfer_opportunities.append(transfer_doc)
        
        # === UTILIZATION-BASED TRANSFER OPPORTUNITIES ===
        
        # Find underutilized and overutilized machines for additional transfers
        for machine1 in occupied_machines:
            utilization1 = (machine1.get("engineHoursPerDay", 0) / 8.0) * 100
            
            if utilization1 > 80:  # Overutilized
                for machine2 in all_machines:
                    if machine2["machineID"] == machine1["machineID"]:
                        continue
                    
                    utilization2 = (machine2.get("engineHoursPerDay", 0) / 8.0) * 100
                    
                    if (machine2.get("status") == "Ready" or utilization2 < 30) and machine1.get("machineType") == machine2.get("machineType"):
                        
                        # Avoid duplicates
                        existing_transfer = next((
                            t for t in transfer_opportunities 
                            if t["machineID"] == machine1["machineID"]
                        ), None)
                        
                        if not existing_transfer:
                            transfer_doc = {
                                "transferID": str(uuid.uuid4()),
                                "machineID": machine1["machineID"],
                                "dealerID": dealer_id,
                                "userID1": machine1["userID"],
                                "userID2": machine2.get("userID", "unassigned"),
                                "location1": {"lat": 0.0, "lon": 0.0},
                                "location2": {"lat": 0.0, "lon": 0.0},
                                "status": "pending",
                                "transferType": "utilization_optimized",
                                "recommendationReason": f"Transfer overutilized {machine1['machineType']} ({utilization1:.1f}% utilization) to balance fleet usage",
                                "estimatedSavings": 200,  # Estimated maintenance savings
                                "utilizationImprovement": abs(utilization1 - utilization2),
                                "createdBy": current_user["userID"],
                                "createdAt": datetime.utcnow(),
                                "updatedAt": datetime.utcnow()
                            }
                            
                            result = await db.transfers.insert_one(transfer_doc)
                            if result.inserted_id:
                                transfer_opportunities.append(transfer_doc)
                            break  # Only one transfer per overutilized machine
        
        # === AI USAGE RECOMMENDATIONS ===
        
        # Calculate comprehensive statistics
        total_machines = len(all_machines)
        active_machines = len(occupied_machines)
        machine_types = list(set(m.get("machineType", "Unknown") for m in all_machines))
        locations = list(set(m.get("location", "Unknown") for m in all_machines if m.get("location")))
        
        utilizations = []
        total_idle_hours = 0
        total_engine_hours = 0
        operating_days = []
        
        for machine in all_machines:
            if machine.get("engineHoursPerDay") is not None and machine.get("operatingDays") is not None:
                util = (machine.get("engineHoursPerDay", 0) / 8.0) * 100
                utilizations.append(util)
                total_idle_hours += machine.get("idleHours", 0)
                total_engine_hours += machine.get("engineHoursPerDay", 0) * machine.get("operatingDays", 0)
                operating_days.append(machine.get("operatingDays", 0))
        
        avg_utilization = sum(utilizations) / len(utilizations) if utilizations else 0
        overutilized_count = sum(1 for u in utilizations if u > 80)
        underutilized_count = sum(1 for u in utilizations if u < 30)
        avg_operating_days = sum(operating_days) / len(operating_days) if operating_days else 0
        
        machine_data = {
            "total_machines": total_machines,
            "active_machines": active_machines,
            "machine_types": machine_types,
            "locations": locations
        }
        
        utilization_stats = {
            "avg_utilization": avg_utilization,
            "total_idle_hours": total_idle_hours,
            "total_engine_hours": total_engine_hours,
            "avg_operating_days": avg_operating_days,
            "overutilized_count": overutilized_count,
            "underutilized_count": underutilized_count,
            "utilization_variance": max(utilizations) - min(utilizations) if utilizations else 0,
            "avg_transport_cost": 75
        }
        
        # Generate AI recommendations
        usage_recommendation = await generate_ai_recommendation(machine_data, utilization_stats, "usage")
        
        # Store usage recommendation in database
        usage_rec_doc = {
            "recommendationID": str(uuid.uuid4()),
            "type": "usage_optimization",
            "dealerID": dealer_id,
            "recommendation": usage_recommendation.get("recommendation", "Optimize machine usage based on current patterns") if isinstance(usage_recommendation, dict) else str(usage_recommendation),
            "priority": usage_recommendation.get("priority", "medium") if isinstance(usage_recommendation, dict) else "medium",
            "potential_savings": usage_recommendation.get("potential_savings", "Not specified") if isinstance(usage_recommendation, dict) else "Not specified",
            "action_steps": usage_recommendation.get("action_steps", []) if isinstance(usage_recommendation, dict) else [],
            "ai_generated": True,
            "status": "active",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        usage_result = await db.recommendations.insert_one(usage_rec_doc)
        usage_generated = 1 if usage_result.inserted_id else 0
        
        return APIResponse(
            success=True,
            message=f"Generated {len(transfer_opportunities)} transfer opportunities and {usage_generated} AI usage recommendation",
            data={
                "usage_recommendations_generated": usage_generated,
                "transfer_opportunities_generated": len(transfer_opportunities),
                "machine_analysis": {
                    "total_analyzed": total_machines,
                    "avg_utilization": round(avg_utilization, 2),
                    "optimization_opportunities": overutilized_count + underutilized_count,
                    "pending_orders_analyzed": len(pending_orders),
                    "distance_based_transfers": len([t for t in transfer_opportunities if t["transferType"] == "distance_optimized"]),
                    "utilization_based_transfers": len([t for t in transfer_opportunities if t["transferType"] == "utilization_optimized"])
                },
                "transfer_breakdown": {
                    "distance_optimized": len([t for t in transfer_opportunities if t["transferType"] == "distance_optimized"]),
                    "utilization_optimized": len([t for t in transfer_opportunities if t["transferType"] == "utilization_optimized"]),
                    "total_potential_savings": sum(t.get("estimatedSavings", 0) for t in transfer_opportunities)
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in kilometers"""
    R = 6371.0  # Earth radius in kilometers
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

@router.get("/transfers", response_model=APIResponse)
async def get_transfers(
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get transfer recommendations for admins"""
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        query = {"dealerID": current_user["dealershipID"]}
        if status:
            query["status"] = status
            
        transfers = await db.transfers.find(query).sort("createdAt", -1).to_list(length=None)
        
        # Convert ObjectId to string and enrich with user/machine data
        for transfer in transfers:
            transfer["_id"] = str(transfer["_id"])
            
            # Get user names
            user1 = await db.users.find_one({"userID": transfer["userID1"]})
            user2 = await db.users.find_one({"userID": transfer["userID2"]})
            machine = await db.machines.find_one({"machineID": transfer["machineID"]})
            
            transfer["user1_name"] = user1["name"] if user1 else "Unknown"
            transfer["user2_name"] = user2["name"] if user2 else "Unknown"
            transfer["machine_type"] = machine["machineType"] if machine else "Unknown"
        
        return APIResponse(
            success=True,
            message=f"Found {len(transfers)} transfer recommendations",
            data={"transfers": transfers}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/transfers/{transfer_id}", response_model=APIResponse)
async def update_transfer_status(
    transfer_id: str,
    transfer_update: TransferUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update transfer recommendation status"""
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        transfer = await db.transfers.find_one({
            "transferID": transfer_id,
            "dealerID": current_user["dealershipID"]
        })
        
        if not transfer:
            raise HTTPException(status_code=404, detail="Transfer recommendation not found")
        
        update_data = {
            "status": transfer_update.status.value,
            "adminComments": transfer_update.admin_comments,
            "updatedAt": datetime.utcnow()
        }
        
        # If approved, update machine details
        if transfer_update.status == TransferStatus.APPROVED:
            machine_update = {
                "status": "In-transit",
                "userID": transfer["userID2"],
                "location": f"{transfer['location2']['lat']}, {transfer['location2']['lon']}",
                "updatedAt": datetime.utcnow()
            }
            
            await db.machines.update_one(
                {"machineID": transfer["machineID"]},
                {"$set": machine_update}
            )
        
        await db.transfers.update_one(
            {"transferID": transfer_id},
            {"$set": update_data}
        )
        
        return APIResponse(
            success=True,
            message="Transfer recommendation updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/recommendations", response_model=APIResponse)  
async def get_text_recommendations(
    user_type: Optional[str] = Query(None, regex="^(admin|customer)$"),
    current_user: dict = Depends(get_current_user)
):
    """Get text-based recommendations for users"""
    try:
        query = {"status": "active"}
        
        if current_user["role"] == "admin":
            query["dealerID"] = current_user["dealershipID"]
            if user_type:
                query["type"] = f"{user_type}_recommendations"
        else:
            query["userID"] = current_user["userID"]
            query["type"] = "customer_recommendations"
        
        recommendations = await db.recommendations.find(query).sort(
            "createdAt", -1
        ).limit(50).to_list(length=50)
        
        # Convert ObjectId to string
        for rec in recommendations:
            rec["_id"] = str(rec["_id"])
            if "createdAt" in rec and isinstance(rec["createdAt"], datetime):
                rec["createdAt"] = rec["createdAt"].isoformat()
        
        return APIResponse(
            success=True,
            message=f"Found {len(recommendations)} recommendations",
            data={"recommendations": recommendations}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/transfer-optimization", response_model=APIResponse)
async def get_transfer_recommendations(
    current_user: dict = Depends(get_current_user),
    max_distance: float = 100.0  # km
):
    """Generate transfer recommendations to optimize machine allocation"""
    
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    dealer_id = current_user["dealershipID"]
    
    # Get all pending orders that need machines
    pending_orders = await db.neworders.find({
        "status": "Pending"
    }).to_list(length=None)
    
    # Get all occupied machines from this dealership
    occupied_machines = await db.machines.find({
        "dealerID": dealer_id,
        "status": "Occupied",
        "userID": {"$ne": None}
    }).to_list(length=None)
    
    transfer_recommendations = []
    
    for order in pending_orders:
        order_coords = order["location"].split(", ")
        if len(order_coords) != 2:
            continue
            
        try:
            order_lat, order_lon = float(order_coords[0]), float(order_coords[1])
        except ValueError:
            continue
        
        # Find machines of the same type that could be transferred
        suitable_machines = [
            m for m in occupied_machines 
            if order["machineType"].lower() in m["machineType"].lower()
        ]
        
        for machine in suitable_machines:
            machine_coords = machine["location"].split(", ")
            if len(machine_coords) != 2:
                continue
                
            try:
                machine_lat, machine_lon = float(machine_coords[0]), float(machine_coords[1])
            except ValueError:
                continue
            
            # Calculate distance from machine to order location
            machine_to_order_distance = calculate_distance(
                machine_lat, machine_lon, order_lat, order_lon
            )
            
            # Only consider if within reasonable distance
            if machine_to_order_distance <= max_distance:
                # Calculate potential savings (simplified calculation)
                # Assume cost per km is $2 for transportation
                cost_per_km = 2.0
                
                # Distance from dealer to order location
                # (This would need dealer coordinates - using approximation)
                estimated_dealer_distance = machine_to_order_distance * 1.5  # Rough estimate
                
                current_cost = estimated_dealer_distance * cost_per_km
                transfer_cost = machine_to_order_distance * cost_per_km
                estimated_savings = max(0, current_cost - transfer_cost)
                
                if estimated_savings > 0:
                    # Get user names
                    current_user_doc = await db.users.find_one({"userID": machine["userID"]})
                    requesting_user_doc = await db.users.find_one({"userID": order["userID"]})
                    
                    recommendation = {
                        "recommendation_id": str(uuid.uuid4()),
                        "from_user_id": machine["userID"],
                        "from_user_name": current_user_doc["name"] if current_user_doc else "Unknown",
                        "to_user_id": order["userID"],
                        "to_user_name": requesting_user_doc["name"] if requesting_user_doc else "Unknown",
                        "machine_id": machine["machineID"],
                        "machine_type": machine["machineType"],
                        "order_id": str(order["_id"]),
                        "estimated_savings": round(estimated_savings, 2),
                        "distance_saved": round(estimated_dealer_distance - machine_to_order_distance, 2),
                        "current_location": f"{machine_lat}, {machine_lon}",
                        "target_location": f"{order_lat}, {order_lon}",
                        "reason": f"Machine can be transferred directly, saving ${estimated_savings:.2f} in transport costs",
                        "priority": "high" if estimated_savings > 100 else "medium" if estimated_savings > 50 else "low",
                        "created_at": datetime.utcnow()
                    }
                    
                    transfer_recommendations.append(recommendation)
    
    # Sort by estimated savings (highest first)
    transfer_recommendations.sort(key=lambda x: x["estimated_savings"], reverse=True)
    
    # Store recommendations in database for future reference
    if transfer_recommendations:
        for rec in transfer_recommendations:
            rec_doc = {
                "recommendationID": rec["recommendation_id"],
                "type": "transfer_optimization",
                "dealerID": dealer_id,
                "data": rec,
                "status": "active",
                "createdAt": datetime.utcnow()
            }
            await db.recommendations.insert_one(rec_doc)
    
    return APIResponse(
        success=True,
        message=f"Found {len(transfer_recommendations)} transfer optimization opportunities",
        data={
            "recommendations": transfer_recommendations,
            "total_potential_savings": sum(r["estimated_savings"] for r in transfer_recommendations)
        }
    )

@router.get("/usage-optimization", response_model=APIResponse)
async def get_usage_recommendations(
    current_user: dict = Depends(get_current_user),
    user_id: Optional[str] = None
):
    """Generate usage optimization recommendations"""
    
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    dealer_id = current_user["dealershipID"]
    
    # Get all users with machines from this dealership
    users_query = {"dealershipID": dealer_id} if not user_id else {"userID": user_id}
    users = await db.users.find(users_query).to_list(length=None)
    
    usage_recommendations = []
    
    for user in users:
        if user["role"] != "customer":
            continue
            
        # Get user's occupied machines
        user_machines = await db.machines.find({
            "userID": user["userID"],
            "status": "Occupied"
        }).to_list(length=None)
        
        if not user_machines:
            continue
        
        # Calculate overall utilization
        total_utilization = []
        underutilized_machines = []
        overutilized_machines = []
        
        for machine in user_machines:
            engine_hours = machine.get("engineHoursPerDay", 0.0)
            idle_hours = machine.get("idleHours", 0.0)
            total_hours = engine_hours + idle_hours
            
            if total_hours > 0:
                utilization = (engine_hours / total_hours) * 100
                total_utilization.append(utilization)
                
                if utilization < 20:  # Less than 20% utilization
                    underutilized_machines.append({
                        "machine_id": machine["machineID"],
                        "machine_type": machine["machineType"],
                        "utilization": round(utilization, 2)
                    })
                elif utilization > 85:  # More than 85% utilization
                    overutilized_machines.append({
                        "machine_id": machine["machineID"],
                        "machine_type": machine["machineType"],
                        "utilization": round(utilization, 2)
                    })
        
        if not total_utilization:
            continue
        
        avg_utilization = sum(total_utilization) / len(total_utilization)
        
        # Generate recommendations based on utilization patterns
        if len(underutilized_machines) >= 2:  # Multiple underutilized machines
            recommendation = {
                "recommendation_id": str(uuid.uuid4()),
                "user_id": user["userID"],
                "user_name": user["name"],
                "recommendation_type": "reduce_machines",
                "current_utilization": round(avg_utilization, 2),
                "recommended_action": f"Consider returning {len(underutilized_machines)} underutilized machines",
                "potential_savings": len(underutilized_machines) * 500,  # Estimated daily savings per machine
                "affected_machines": [m["machine_id"] for m in underutilized_machines],
                "details": underutilized_machines,
                "priority": "medium",
                "reason": f"Average utilization is {avg_utilization:.1f}% with {len(underutilized_machines)} machines under 20% usage",
                "created_at": datetime.utcnow()
            }
            usage_recommendations.append(recommendation)
        
        elif len(overutilized_machines) >= 1:  # Any overutilized machines
            recommendation = {
                "recommendation_id": str(uuid.uuid4()),
                "user_id": user["userID"],
                "user_name": user["name"],
                "recommendation_type": "increase_machines",
                "current_utilization": round(avg_utilization, 2),
                "recommended_action": f"Consider requesting additional machines to reduce overutilization",
                "potential_savings": None,
                "affected_machines": [m["machine_id"] for m in overutilized_machines],
                "details": overutilized_machines,
                "priority": "high",
                "reason": f"Average utilization is {avg_utilization:.1f}% with {len(overutilized_machines)} machines over 85% usage",
                "created_at": datetime.utcnow()
            }
            usage_recommendations.append(recommendation)
        
        elif 40 <= avg_utilization <= 60:  # Optimal range
            recommendation = {
                "recommendation_id": str(uuid.uuid4()),
                "user_id": user["userID"],
                "user_name": user["name"],
                "recommendation_type": "optimize_usage",
                "current_utilization": round(avg_utilization, 2),
                "recommended_action": "Great job! Your machine utilization is optimal",
                "potential_savings": None,
                "affected_machines": [m["machineID"] for m in user_machines],
                "details": [],
                "priority": "low",
                "reason": f"Excellent utilization rate of {avg_utilization:.1f}%",
                "created_at": datetime.utcnow()
            }
            usage_recommendations.append(recommendation)
    
    # Store recommendations in database
    if usage_recommendations:
        for rec in usage_recommendations:
            rec_doc = {
                "recommendationID": rec["recommendation_id"],
                "type": "usage_optimization",
                "dealerID": dealer_id,
                "userID": rec["user_id"],
                "data": rec,
                "status": "active",
                "createdAt": datetime.utcnow()
            }
            await db.recommendations.insert_one(rec_doc)
    
    return APIResponse(
        success=True,
        message=f"Generated {len(usage_recommendations)} usage optimization recommendations",
        data={
            "recommendations": usage_recommendations,
            "total_users_analyzed": len(users)
        }
    )

@router.post("/create-transfer", response_model=APIResponse)
async def create_direct_transfer(
    from_user_id: str,
    to_user_id: str,
    machine_id: str,
    target_location_lat: float,
    target_location_lon: float,
    current_user: dict = Depends(get_current_user)
):
    """Create a direct transfer between users based on recommendations"""
    
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Validate the machine exists and is occupied by from_user
    machine = await db.machines.find_one({
        "machineID": machine_id,
        "userID": from_user_id,
        "status": "Occupied",
        "dealerID": current_user["dealershipID"]
    })
    
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found or not available for transfer")
    
    # Validate users exist
    from_user = await db.users.find_one({"userID": from_user_id})
    to_user = await db.users.find_one({"userID": to_user_id})
    
    if not from_user or not to_user:
        raise HTTPException(status_code=404, detail="One or both users not found")
    
    # Create transfer record
    machine_coords = machine["location"].split(", ")
    if len(machine_coords) == 2:
        machine_lat, machine_lon = float(machine_coords[0]), float(machine_coords[1])
    else:
        machine_lat, machine_lon = 0.0, 0.0
    
    transfer_doc = {
        "transferID": str(uuid.uuid4()),
        "machineID": machine_id,
        "dealerID": current_user["dealershipID"],
        "userID1": from_user_id,  # Current user
        "userID2": to_user_id,    # Target user
        "location1": {"lat": machine_lat, "lon": machine_lon},
        "location2": {"lat": target_location_lat, "lon": target_location_lon},
        "status": TransferStatus.PENDING.value,
        "transferType": "direct_recommendation",
        "createdBy": current_user["userID"],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    result = await db.transfers.insert_one(transfer_doc)
    
    return APIResponse(
        success=True,
        message="Direct transfer created successfully",
        data={
            "transfer_id": transfer_doc["transferID"],
            "from_user": from_user["name"],
            "to_user": to_user["name"],
            "machine_id": machine_id
        }
    )

@router.get("/", response_model=APIResponse)
async def get_all_recommendations(
    current_user: dict = Depends(get_current_user),
    recommendation_type: Optional[str] = Query(None),
    status: str = Query("active"),
    limit: int = Query(50, le=100)
):
    """Get all recommendations for the dealership"""
    
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {
        "dealerID": current_user["dealershipID"],
        "status": status
    }
    
    if recommendation_type:
        query["type"] = recommendation_type
    
    recommendations = await db.recommendations.find(query).sort(
        "createdAt", -1
    ).limit(limit).to_list(length=limit)
    
    # Convert ObjectId to string
    for rec in recommendations:
        rec["_id"] = str(rec["_id"])
    
    return APIResponse(
        success=True,
        message=f"Found {len(recommendations)} recommendations",
        data={
            "recommendations": recommendations,
            "filters": {
                "type": recommendation_type,
                "status": status,
                "limit": limit
            }
        }
    )

@router.patch("/{recommendation_id}/dismiss", response_model=APIResponse)
async def dismiss_recommendation(
    recommendation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Dismiss a recommendation"""
    
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.recommendations.update_one(
        {
            "recommendationID": recommendation_id,
            "dealerID": current_user["dealershipID"]
        },
        {
            "$set": {
                "status": "dismissed",
                "dismissedBy": current_user["userID"],
                "dismissedAt": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    
    return APIResponse(
        success=True,
        message="Recommendation dismissed successfully"
    )

@router.get("/machine-locations", response_model=APIResponse)
async def get_machine_locations(
    current_user: dict = Depends(get_current_user)
):
    """Get machine locations for map display"""
    try:
        if current_user["role"] == "admin":
            # Admin sees all their dealership's machines
            machines = await db.machines.find({
                "dealerID": current_user["dealershipID"]
            }).to_list(length=None)
        else:
            # Customer sees only their rented machines
            machines = await db.machines.find({
                "userID": current_user["userID"]
            }).to_list(length=None)
        
        locations = []
        
        for machine in machines:
            try:
                # Parse latitude and longitude from the location field
                latitude = None
                longitude = None
                address = "Unknown Location"
                
                if machine.get("location"):
                    location_parts = machine["location"].split(",")
                    
                    if len(location_parts) >= 2:
                        try:
                            # Try to parse coordinates from the last two parts
                            longitude = float(location_parts[-1].strip())
                            latitude = float(location_parts[-2].strip())
                            
                            # If there are more than 2 parts, the first parts are the address
                            if len(location_parts) > 2:
                                address = ",".join(location_parts[:-2]).strip()
                            else:
                                address = machine.get("siteID", "Machine Location")
                                
                        except (ValueError, IndexError):
                            # If parsing fails, use default coordinates (Bangalore center)
                            latitude = 12.9716
                            longitude = 77.5946
                            address = machine.get("location", "Unknown Location")
                    else:
                        # If no coordinates, use default location
                        latitude = 12.9716
                        longitude = 77.5946  
                        address = machine.get("location", "Unknown Location")
                else:
                    # Default coordinates if no location data
                    latitude = 12.9716
                    longitude = 77.5946
                    address = machine.get("siteID", "Unknown Location")
                
                # Get user information if machine is assigned
                user_info = None
                machine_user_id = machine.get("userID")
                
                if machine_user_id:
                    try:
                        user = await db.users.find_one({"userID": machine_user_id})
                        if user:
                            user_info = {
                                "userID": machine_user_id,
                                "userName": user.get("name", "Unknown User"),
                                "userEmail": user.get("emailID", user.get("email"))
                            }
                        else:
                            user_info = {
                                "userID": machine_user_id,
                                "userName": "Unknown User",
                                "userEmail": None
                            }
                    except Exception:
                        user_info = {
                            "userID": machine_user_id,
                            "userName": "Unknown User", 
                            "userEmail": None
                        }
                
                location = {
                    "machineID": machine.get("machineID", "Unknown"),
                    "machineType": machine.get("machineType", "Unknown"),
                    "status": machine.get("status", "Unknown"),
                    "latitude": latitude,
                    "longitude": longitude,
                    "address": address,
                    "siteID": machine.get("siteID"),
                    "userInfo": user_info,
                    "dealerID": machine.get("dealerID"),
                    "engineHoursPerDay": machine.get("engineHoursPerDay", 0),
                    "idleHours": machine.get("idleHours", 0),
                    "operatingDays": machine.get("operatingDays", 0),
                    "checkOutDate": machine.get("checkOutDate"),
                    "checkInDate": machine.get("checkInDate"),
                    "lastUpdated": machine.get("updatedAt", machine.get("createdAt"))
                }
                locations.append(location)
                
            except Exception:
                # Continue with next machine instead of failing completely
                continue
        
        return APIResponse(
            success=True,
            message=f"Found {len(locations)} machine locations",
            data={"locations": locations}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/recommendations", response_model=APIResponse)
async def get_recommendations(
    user_type: Optional[str] = Query(None, regex="^(admin|customer)$"),
    severity: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get text recommendations for user"""
    try:
        query = {}
        
        if current_user["role"] == "admin":
            query["targetUserType"] = "admin"
            query["$or"] = [
                {"userID": current_user["userID"]},
                {"dealerID": current_user["dealershipID"]}
            ]
        else:
            query["targetUserType"] = "customer"
            query["userID"] = current_user["userID"]
        
        if severity:
            query["severity"] = severity
        
        recommendations = await db.recommendations.find(query).sort("dateTime", -1).to_list(length=50)
        
        for rec in recommendations:
            rec["_id"] = str(rec["_id"])
        
        return APIResponse(
            success=True,
            message=f"Found {len(recommendations)} recommendations",
            data={"recommendations": recommendations}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/recommendations", response_model=APIResponse)
async def create_recommendation(
    recommendation: RecommendationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new recommendation (usually called by system)"""
    try:
        rec_data = {
            "recommendationID": str(uuid.uuid4()),
            "userID": recommendation.user_id,
            "recommendation": recommendation.recommendation,
            "recommendationType": recommendation.recommendation_type.value,
            "severity": recommendation.severity.value,
            "targetUserType": recommendation.target_user_type.value,
            "dateTime": datetime.utcnow(),
            "isRead": False,
            "isDismissed": False,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        await db.recommendations.insert_one(rec_data)
        
        return APIResponse(
            success=True,
            message="Recommendation created successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/generate-customer-recommendations", response_model=APIResponse)
async def generate_customer_recommendations(current_user: dict = Depends(get_current_user)):
    """Generate AI-powered recommendations specifically for customer users"""
    try:
        if current_user["role"] != "customer":
            raise HTTPException(status_code=403, detail="Customer access required")
        
        user_id = current_user["userID"]
        
        # Get customer's machines
        user_machines = await db.machines.find({
            "userID": user_id
        }).to_list(length=None)
        
        if not user_machines:
            raise HTTPException(status_code=404, detail="No machines found for analysis")
        
        # Calculate customer-specific metrics
        total_machines = len(user_machines)
        active_machines = [m for m in user_machines if m.get("status") == "Occupied"]
        ready_machines = [m for m in user_machines if m.get("status") == "Ready"]
        maintenance_machines = [m for m in user_machines if m.get("status") == "Maintenance"]
        
        # Utilization analysis
        utilizations = []
        total_idle_hours = 0
        total_engine_hours = 0
        operating_days = []
        monthly_costs = 0
        
        for machine in active_machines:
            if machine.get("engineHoursPerDay") and machine.get("operatingDays"):
                daily_util = machine.get("engineHoursPerDay", 0) / 8.0  # 8-hour workday
                utilizations.append(daily_util * 100)
                total_idle_hours += machine.get("idleHours", 0)
                total_engine_hours += machine.get("engineHoursPerDay", 0) * machine.get("operatingDays", 0)
                operating_days.append(machine.get("operatingDays", 0))
                
                # Estimate monthly costs (simplified)
                monthly_costs += (machine.get("engineHoursPerDay", 0) * 30 * 25)  # $25/hour estimate
        
        avg_utilization = sum(utilizations) / len(utilizations) if utilizations else 0
        overutilized_count = sum(1 for u in utilizations if u > 80)
        underutilized_count = sum(1 for u in utilizations if u < 30)
        avg_operating_days = sum(operating_days) / len(operating_days) if operating_days else 0
        
        # Get user's current health score
        user = await db.users.find_one({"userID": user_id})
        current_health_score = user.get("health_score", 700) if user else 700
        
        # Prepare data for AI
        customer_data = {
            "total_machines": total_machines,
            "active_machines": len(active_machines),
            "ready_machines": len(ready_machines),
            "maintenance_machines": len(maintenance_machines),
            "machine_types": list(set(m.get("machineType", "Unknown") for m in user_machines)),
            "avg_utilization": avg_utilization,
            "overutilized_machines": overutilized_count,
            "underutilized_machines": underutilized_count,
            "current_health_score": current_health_score,
            "estimated_monthly_costs": monthly_costs,
            "avg_operating_days": avg_operating_days,
            "total_idle_hours": total_idle_hours
        }
        
        utilization_stats = {
            "avg_utilization": avg_utilization,
            "total_idle_hours": total_idle_hours,
            "total_engine_hours": total_engine_hours,
            "avg_operating_days": avg_operating_days,
            "overutilized_count": overutilized_count,
            "underutilized_count": underutilized_count,
            "monthly_cost_estimate": monthly_costs
        }
        
        # Generate AI recommendation using Gemini
        ai_recommendation = await generate_customer_ai_recommendation(customer_data, utilization_stats)
        
        # Store customer recommendation in database
        customer_rec_doc = {
            "recommendationID": str(uuid.uuid4()),
            "type": "customer_optimization",
            "userID": user_id,
            "targetUserType": "customer",
            "recommendation": ai_recommendation.get("recommendation", "Optimize your machine usage based on current patterns") if isinstance(ai_recommendation, dict) else str(ai_recommendation),
            "priority": ai_recommendation.get("priority", "medium") if isinstance(ai_recommendation, dict) else "medium",
            "potential_savings": ai_recommendation.get("potential_savings", "Monitor usage patterns for cost optimization") if isinstance(ai_recommendation, dict) else "Monitor usage patterns",
            "action_steps": ai_recommendation.get("action_steps", []) if isinstance(ai_recommendation, dict) else [],
            "ai_generated": True,
            "status": "active",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        result = await db.recommendations.insert_one(customer_rec_doc)
        recommendations_generated = 1 if result.inserted_id else 0
        
        return APIResponse(
            success=True,
            message=f"Generated {recommendations_generated} personalized AI recommendation for customer",
            data={
                "recommendations_generated": recommendations_generated,
                "customer_analysis": {
                    "total_machines_analyzed": total_machines,
                    "avg_utilization": round(avg_utilization, 2),
                    "current_health_score": current_health_score,
                    "optimization_opportunities": overutilized_count + underutilized_count,
                    "estimated_monthly_costs": round(monthly_costs, 2)
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate customer recommendations: {str(e)}")

async def generate_customer_ai_recommendation(customer_data, utilization_stats):
    """Generate customer-specific AI recommendations using Gemini"""
    if not GEMINI_API_KEY:
        return "AI recommendations unavailable - API key not configured"
    
    try:
        model = genai.GenerativeModel('gemini-pro')
        
        prompt = f"""
        As a construction equipment optimization expert, analyze this customer's machine usage and provide personalized recommendations:

        Customer Fleet Analysis:
        - Total Machines: {customer_data.get('total_machines', 0)}
        - Active Machines: {customer_data.get('active_machines', 0)}
        - Ready Machines: {customer_data.get('ready_machines', 0)}
        - In Maintenance: {customer_data.get('maintenance_machines', 0)}
        - Machine Types: {', '.join(customer_data.get('machine_types', []))}
        
        Usage Metrics:
        - Average Utilization: {customer_data.get('avg_utilization', 0):.1f}%
        - Overutilized Machines (>80%): {customer_data.get('overutilized_machines', 0)}
        - Underutilized Machines (<30%): {customer_data.get('underutilized_machines', 0)}
        - Average Operating Days: {customer_data.get('avg_operating_days', 0)} days/week
        - Total Idle Hours: {utilization_stats.get('total_idle_hours', 0)} hours/month
        
        Performance & Costs:
        - Current Health Score: {customer_data.get('current_health_score', 700)}/850
        - Estimated Monthly Costs: ${customer_data.get('estimated_monthly_costs', 0):,.2f}

        Provide specific, actionable recommendations to help this customer:
        1. Optimize machine utilization and reduce costs
        2. Improve their health score
        3. Prevent equipment overuse or underuse
        4. Maximize ROI on their equipment investment

        Focus on practical steps they can take immediately. Consider both operational efficiency and cost savings.
        
        Format as JSON with:
        - "recommendation": Main recommendation title
        - "priority": "High", "Medium", or "Low" 
        - "potential_savings": Specific savings description
        - "action_steps": Array of 3-5 specific actionable steps
        """
        
        response = model.generate_content(prompt)
        
        # Try to parse as JSON, fall back to structured response
        try:
            return json.loads(response.text)
        except:
            # Create structured response from text
            return {
                "recommendation": "Optimize Your Machine Fleet Performance",
                "priority": "Medium",
                "potential_savings": "Reduce operational costs through better utilization",
                "action_steps": [
                    "Review machine utilization reports weekly",
                    "Minimize idle time during operations", 
                    "Schedule preventive maintenance during low-demand periods",
                    "Consider consolidating underutilized machines",
                    "Contact your dealer for optimization consultation"
                ],
                "ai_generated": True,
                "full_ai_response": response.text
            }
            
    except Exception as e:
        return f"AI recommendation generation failed: {str(e)}"