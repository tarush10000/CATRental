from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    CUSTOMER = "customer"

class MachineStatus(str, Enum):
    READY = "Ready"
    IN_TRANSIT = "In-transit"
    OCCUPIED = "Occupied"
    MAINTENANCE = "Maintenance"

class RequestType(str, Enum):
    CANCELLATION = "Cancellation"
    EXTENSION = "Extension"
    SUPPORT = "Support"
    NEW_ORDER = "NewOrder"

class RequestStatus(str, Enum):
    IN_PROGRESS = "In-Progress"
    APPROVED = "Approved"
    DENIED = "Denied"

class OrderStatus(str, Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    IN_PROGRESS = "InProgress"
    COMPLETED = "Completed"

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole

class UserCreate(UserBase):
    password: str
    dealership_id: Optional[str] = None
    dealership_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    user_id: str
    dealership_id: Optional[str] = None
    dealership_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Machine Models
class MachineBase(BaseModel):
    machine_type: str
    location: str
    site_id: str

class MachineCreate(MachineBase):
    machine_id: str

class MachineUpdate(BaseModel):
    machine_type: Optional[str] = None
    check_out_date: Optional[datetime] = None
    check_in_date: Optional[datetime] = None
    engine_hours_per_day: Optional[float] = None
    idle_hours: Optional[float] = None
    operating_days: Optional[int] = None
    location: Optional[str] = None
    status: Optional[MachineStatus] = None

class Machine(MachineBase):
    machine_id: str
    check_out_date: Optional[datetime] = None
    check_in_date: Optional[datetime] = None
    engine_hours_per_day: Optional[float] = 0.0
    idle_hours: Optional[float] = 0.0
    operating_days: Optional[int] = 0
    last_operating_id: Optional[str] = None
    user_id: Optional[str] = None
    status: MachineStatus = MachineStatus.READY
    dealer_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Request Models
class RequestBase(BaseModel):
    machine_id: str
    request_type: RequestType
    comments: Optional[str] = None
    date: Optional[datetime] = None

class RequestCreate(RequestBase):
    pass

class RequestUpdate(BaseModel):
    status: RequestStatus
    admin_comments: Optional[str] = None

class Request(RequestBase):
    request_id: str
    request_date: datetime
    user_id: str
    status: RequestStatus = RequestStatus.IN_PROGRESS
    admin_comments: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Dealership Models
class DealershipBase(BaseModel):
    site_id: str
    location: str
    onsite: bool = True

class DealershipCreate(DealershipBase):
    dealer_id: str

class Dealership(DealershipBase):
    dealer_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# New Order Models
class NewOrderBase(BaseModel):
    machine_type: str
    location: str
    site_id: str
    check_in_date: datetime
    check_out_date: datetime
    comments: Optional[str] = None

class NewOrderCreate(NewOrderBase):
    pass

class NewOrder(NewOrderBase):
    order_id: str
    user_id: str
    transit_time: Optional[int] = None
    status: OrderStatus = OrderStatus.PENDING
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Response Models
class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

# Barcode Scanning Models
class BarcodeData(BaseModel):
    machine_id: str
    machine_type: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    year: Optional[str] = None

# Dashboard Models
class DashboardStats(BaseModel):
    total_machines: int
    active_machines: int
    maintenance_machines: int
    pending_requests: int

class MachineUsageStats(BaseModel):
    machine_id: str
    total_hours: float
    idle_percentage: float
    efficiency_score: float

# Recommendation Models
class Recommendation(BaseModel):
    type: str
    title: str
    description: str
    priority: str
    suggested_action: str

class TransferStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved" 
    DECLINED = "declined"

class RecommendationType(str, Enum):
    TRANSFER_OPTIMIZATION = "transfer_optimization"
    MAINTENANCE = "maintenance"
    EFFICIENCY = "efficiency"
    COST_SAVING = "cost_saving"
    USAGE_PATTERN = "usage_pattern"

class RecommendationSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

# Transfer Models
class TransferBase(BaseModel):
    user_id_1: str  # Current user
    user_id_2: str  # Requesting user
    dealer_id: str
    location_1: str  # Current location
    location_2: str  # Requested location
    machine_id: str
    estimated_savings: Optional[float] = None
    recommendation_reason: Optional[str] = None

class TransferCreate(TransferBase):
    pass

class TransferUpdate(BaseModel):
    status: TransferStatus
    admin_comments: Optional[str] = None

class Transfer(TransferBase):
    transfer_id: str
    status: TransferStatus = TransferStatus.PENDING
    admin_comments: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Recommendation Models  
class RecommendationBase(BaseModel):
    user_id: str
    recommendation: str
    recommendation_type: RecommendationType
    severity: RecommendationSeverity
    target_user_type: UserRole  # admin or customer
    
class RecommendationCreate(RecommendationBase):
    pass

class RecommendationModel(RecommendationBase):
    recommendation_id: str
    date_time: datetime
    is_read: bool = False
    is_dismissed: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Enhanced Machine Location Model (using existing machine data)
class MachineLocation(BaseModel):
    machine_id: str
    machine_type: str
    status: str
    latitude: float
    longitude: float
    address: str
    site_id: Optional[str] = None
    user_info: Optional[dict] = None  # Contains userID, userName, userEmail if assigned
    dealer_id: str
    engine_hours_per_day: Optional[float] = 0
    idle_hours: Optional[float] = 0
    operating_days: Optional[int] = 0
    check_out_date: Optional[datetime] = None
    check_in_date: Optional[datetime] = None
    last_updated: datetime