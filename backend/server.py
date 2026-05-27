from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from jose import JWTError, jwt
import pandas as pd
from io import BytesIO
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
SECRET_KEY = os.environ.get('JWT_SECRET', 'manrique-importadora-secret-key-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 365

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Manrique Importadora API")
api_router = APIRouter(prefix="/api")

# ============ MODELS ============

class UserBase(BaseModel):
    user_code: str
    role: str = "empleado"

class UserCreate(BaseModel):
    user_code: str
    password: str
    name: str = ""  # Nombre completo del usuario
    role: str = "empleado"

class UserUpdate(BaseModel):
    password: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_code: str
    name: str = ""
    role: str
    created_at: str

class LoginRequest(BaseModel):
    user_code: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ProductBase(BaseModel):
    internal_code: str
    barcode: str
    name: str
    price_1: float  # Bulto
    price_2: float  # Mayor a 12
    price_3: float  # 1 a 11 unidades

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    internal_code: Optional[str] = None
    barcode: Optional[str] = None
    name: Optional[str] = None
    price_1: Optional[float] = None
    price_2: Optional[float] = None
    price_3: Optional[float] = None

class ProductResponse(ProductBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: str

class QuoteItemCreate(BaseModel):
    product_id: str
    quantity: int
    is_bulk: bool = False
    manual_price: Optional[float] = None

class QuoteItemResponse(BaseModel):
    product_id: str
    product_name: str
    product_code: str
    quantity: int
    is_bulk: bool
    unit_price_applied: float
    subtotal: float
    manual_price: Optional[float] = None
    price_was_manual: bool = False

class QuoteCreate(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    client_id_number: Optional[str] = None
    client_city: Optional[str] = None
    items: List[QuoteItemCreate]

class QuoteResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    user_code: str
    user_name: str = ""
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    client_id_number: Optional[str] = None
    client_city: Optional[str] = None
    items: List[QuoteItemResponse]
    total_amount: float
    balance_paid: float = 0.0
    balance_pending: float = 0.0
    status: str = "pendiente"  # pendiente, parcial, pagado
    due_date: Optional[str] = None
    is_overdue: bool = False
    created_at: str

class PaymentCreate(BaseModel):
    amount: float
    payment_type: str = "abono"  # abono, total

class PaymentResponse(BaseModel):
    id: str
    quote_id: str
    amount: float
    payment_type: str
    created_at: str
    created_by: str

class QuoteEditRequest(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    client_id_number: Optional[str] = None
    client_city: Optional[str] = None
    items: List[QuoteItemCreate]

class SettingsResponse(BaseModel):
    days_until_due: int = 30

class SettingsUpdate(BaseModel):
    days_until_due: int

class ScanLogCreate(BaseModel):
    product_id: str

class ScanLogResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    product_id: str
    scanned_at: str

# ============ HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_admin_user(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def parse_price(price_str):
    """Parse price from Excel format like '$ 10,50' to float 10.50"""
    if isinstance(price_str, (int, float)):
        return float(price_str)
    if isinstance(price_str, str):
        cleaned = re.sub(r'[^\d,.]', '', price_str)
        cleaned = cleaned.replace(',', '.')
        try:
            return float(cleaned)
        except:
            return 0.0
    return 0.0

def calculate_price(quantity: int, is_bulk: bool, price_1: float, price_2: float, price_3: float) -> float:
    """Calculate unit price based on quantity and bulk flag"""
    if is_bulk:
        return price_1
    elif quantity >= 12:
        return price_2
    else:
        return price_3

async def get_settings():
    """Get global settings, create default if not exists"""
    settings = await db.settings.find_one({"id": "global"}, {"_id": 0})
    if not settings:
        settings = {"id": "global", "days_until_due": 30}
        await db.settings.insert_one(settings)
    return settings

def calculate_quote_status(total_amount: float, balance_paid: float) -> str:
    """Calculate status based on payments"""
    if balance_paid >= total_amount:
        return "pagado"
    elif balance_paid > 0:
        return "parcial"
    return "pendiente"

def is_quote_overdue(created_at: str, days_until_due: int, status: str) -> bool:
    """Check if quote is overdue"""
    if status == "pagado":
        return False
    try:
        created = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        due_date = created + timedelta(days=days_until_due)
        return datetime.now(timezone.utc) > due_date
    except:
        return False

def get_due_date(created_at: str, days_until_due: int) -> str:
    """Calculate due date from created_at"""
    try:
        created = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        due_date = created + timedelta(days=days_until_due)
        return due_date.isoformat()
    except:
        return ""

async def enrich_quote(quote: dict) -> dict:
    """Add calculated fields to quote"""
    settings = await get_settings()
    days = settings.get("days_until_due", 30)
    
    quote.setdefault("balance_paid", 0.0)
    quote.setdefault("status", "pendiente")
    quote.setdefault("user_name", "")
    quote.setdefault("client_email", None)
    quote.setdefault("client_phone", None)
    quote.setdefault("client_address", None)
    quote.setdefault("client_id_number", None)
    quote.setdefault("client_city", None)
    
    total = quote.get("total_amount", 0)
    paid = quote.get("balance_paid", 0)
    
    quote["balance_pending"] = max(0, total - paid)
    quote["status"] = calculate_quote_status(total, paid)
    quote["due_date"] = get_due_date(quote.get("created_at", ""), days)
    quote["is_overdue"] = is_quote_overdue(quote.get("created_at", ""), days, quote["status"])
    
    return quote

# ============ AUTH ROUTES ============

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    user = await db.users.find_one({"user_code": request.user_code}, {"_id": 0})
    if not user or not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user["id"]})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            user_code=user["user_code"],
            name=user.get("name", ""),
            role=user["role"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        user_code=user["user_code"],
        name=user.get("name", ""),
        role=user["role"],
        created_at=user["created_at"]
    )

# ============ USER ROUTES (ADMIN) ============

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(admin: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, admin: dict = Depends(get_admin_user)):
    existing = await db.users.find_one({"user_code": user_data.user_code})
    if existing:
        raise HTTPException(status_code=400, detail="User code already exists")
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "user_code": user_data.user_code,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    return UserResponse(
        id=user_doc["id"],
        user_code=user_doc["user_code"],
        name=user_doc["name"],
        role=user_doc["role"],
        created_at=user_doc["created_at"]
    )

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserUpdate, admin: dict = Depends(get_admin_user)):
    update_dict = {}
    if user_data.password:
        update_dict["password"] = hash_password(user_data.password)
    if user_data.name is not None:
        update_dict["name"] = user_data.name
    if user_data.role:
        update_dict["role"] = user_data.role
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.users.update_one({"id": user_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return UserResponse(**{**user, "name": user.get("name", "")})

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

# ============ PRODUCT ROUTES ============

@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(
    search: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"internal_code": {"$regex": search, "$options": "i"}},
            {"barcode": {"$regex": search, "$options": "i"}}
        ]
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    return [ProductResponse(**p) for p in products]

@api_router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductResponse(**product)

@api_router.get("/products/scan/{code}", response_model=ProductResponse)
async def get_product_by_code(code: str, user: dict = Depends(get_current_user)):
    product = await db.products.find_one(
        {"$or": [{"barcode": code}, {"internal_code": code}]},
        {"_id": 0}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductResponse(**product)

@api_router.post("/products", response_model=ProductResponse)
async def create_product(product_data: ProductCreate, admin: dict = Depends(get_admin_user)):
    product_doc = {
        "id": str(uuid.uuid4()),
        **product_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product_doc)
    return ProductResponse(**{k: v for k, v in product_doc.items() if k != "_id"})

@api_router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, product_data: ProductUpdate, admin: dict = Depends(get_admin_user)):
    update_dict = {k: v for k, v in product_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.products.update_one({"id": product_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    return ProductResponse(**product)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

@api_router.post("/products/bulk-upload")
async def bulk_upload_products(file: UploadFile = File(...), admin: dict = Depends(get_admin_user)):
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="File must be Excel or CSV")
    
    content = await file.read()
    
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(content))
        else:
            df = pd.read_excel(BytesIO(content))
        
        # Normalize column names
        df.columns = df.columns.str.strip().str.upper()
        
        column_mapping = {
            'CÓDIGO': 'internal_code',
            'CODIGO': 'internal_code',
            'CODIGO DE BARRAS': 'barcode',
            'CÓDIGO DE BARRAS': 'barcode',
            'NOMBRE': 'name',
            'PRECIO 1': 'price_1',
            'PRECIO 2': 'price_2',
            'PRECIO 3': 'price_3'
        }
        
        df = df.rename(columns=column_mapping)
        
        required_cols = ['internal_code', 'barcode', 'name', 'price_1', 'price_2', 'price_3']
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise HTTPException(status_code=400, detail=f"Missing columns: {missing}")
        
        products_added = 0
        products_updated = 0
        
        for _, row in df.iterrows():
            internal_code = str(row['internal_code']).strip()
            barcode = str(row['barcode']).strip()
            name = str(row['name']).strip()
            
            if not internal_code or internal_code.lower() == 'nan':
                continue
            
            product_data = {
                "internal_code": internal_code,
                "barcode": barcode if barcode.lower() != 'nan' else '',
                "name": name if name.lower() != 'nan' else '',
                "price_1": parse_price(row['price_1']),
                "price_2": parse_price(row['price_2']),
                "price_3": parse_price(row['price_3'])
            }
            
            existing = await db.products.find_one({
                "$or": [
                    {"internal_code": internal_code},
                    {"barcode": barcode}
                ]
            })
            
            if existing:
                await db.products.update_one(
                    {"id": existing["id"]},
                    {"$set": product_data}
                )
                products_updated += 1
            else:
                product_data["id"] = str(uuid.uuid4())
                product_data["created_at"] = datetime.now(timezone.utc).isoformat()
                await db.products.insert_one(product_data)
                products_added += 1
        
        return {
            "message": "Bulk upload completed",
            "products_added": products_added,
            "products_updated": products_updated
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

# ============ QUOTE ROUTES ============

@api_router.post("/quotes", response_model=QuoteResponse)
async def create_quote(quote_data: QuoteCreate, user: dict = Depends(get_current_user)):
    items = []
    total = 0.0
    
    for item in quote_data.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        if item.manual_price and item.manual_price > 0:
            unit_price = item.manual_price
            price_was_manual = True
        else:
            unit_price = product["price_1"]
            price_was_manual = False
        subtotal = unit_price * item.quantity
        total += subtotal
        
        items.append({
            "product_id": item.product_id,
            "product_name": product["name"],
            "product_code": product["internal_code"],
            "quantity": item.quantity,
            "is_bulk": item.is_bulk,
            "unit_price_applied": unit_price,
            "subtotal": subtotal,
            "manual_price": item.manual_price if price_was_manual else None,
            "price_was_manual": price_was_manual
        })
    
    quote_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_code": user["user_code"],
        "user_name": user.get("name", ""),
        "client_name": quote_data.client_name,
        "client_email": quote_data.client_email,
        "client_phone": quote_data.client_phone,
        "client_address": quote_data.client_address,
        "client_id_number": quote_data.client_id_number,
        "client_city": quote_data.client_city,
        "items": items,
        "total_amount": total,
        "balance_paid": 0.0,
        "status": "pendiente",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.quotes.insert_one(quote_doc)
    enriched = await enrich_quote({k: v for k, v in quote_doc.items() if k != "_id"})
    return QuoteResponse(**enriched)

@api_router.get("/quotes", response_model=List[QuoteResponse])
async def get_quotes(
    user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    overdue_only: bool = False
):
    query = {} if user["role"] == "admin" else {"user_id": user["id"]}
    if status:
        query["status"] = status
    
    quotes = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    result = []
    for q in quotes:
        enriched = await enrich_quote(q)
        if overdue_only and not enriched["is_overdue"]:
            continue
        result.append(QuoteResponse(**enriched))
    return result

@api_router.get("/quotes/{quote_id}", response_model=QuoteResponse)
async def get_quote(quote_id: str, user: dict = Depends(get_current_user)):
    query = {"id": quote_id}
    if user["role"] != "admin":
        query["user_id"] = user["id"]
    
    quote = await db.quotes.find_one(query, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    enriched = await enrich_quote(quote)
    return QuoteResponse(**enriched)

# ============ PAYMENT ROUTES ============

@api_router.post("/quotes/{quote_id}/payments", response_model=QuoteResponse)
async def register_payment(quote_id: str, payment: PaymentCreate, user: dict = Depends(get_current_user)):
    query = {"id": quote_id}
    if user["role"] != "admin":
        query["user_id"] = user["id"]
    
    quote = await db.quotes.find_one(query, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    total = quote.get("total_amount", 0)
    current_paid = quote.get("balance_paid", 0)
    pending = total - current_paid
    
    if pending <= 0:
        raise HTTPException(status_code=400, detail="Quote is already fully paid")
    
    # Calculate payment amount
    if payment.payment_type == "total":
        amount = pending  # Pay remaining balance
    else:
        amount = min(payment.amount, pending)  # Don't overpay
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid payment amount")
    
    new_paid = current_paid + amount
    new_status = calculate_quote_status(total, new_paid)
    
    # Update quote
    await db.quotes.update_one(
        {"id": quote_id},
        {"$set": {"balance_paid": new_paid, "status": new_status}}
    )
    
    # Log payment
    payment_doc = {
        "id": str(uuid.uuid4()),
        "quote_id": quote_id,
        "amount": amount,
        "payment_type": payment.payment_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    await db.payments.insert_one(payment_doc)
    
    # Return updated quote
    updated_quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    enriched = await enrich_quote(updated_quote)
    return QuoteResponse(**enriched)

@api_router.get("/quotes/{quote_id}/payments")
async def get_quote_payments(quote_id: str, user: dict = Depends(get_current_user)):
    query = {"id": quote_id}
    if user["role"] != "admin":
        query["user_id"] = user["id"]
    
    quote = await db.quotes.find_one(query)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    payments = await db.payments.find({"quote_id": quote_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return payments

@api_router.put("/quotes/{quote_id}/items", response_model=QuoteResponse)
async def edit_quote(quote_id: str, edit_data: QuoteEditRequest, user: dict = Depends(get_current_user)):
    query = {"id": quote_id}
    if user["role"] != "admin":
        query["user_id"] = user["id"]
    
    quote = await db.quotes.find_one(query, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if quote.get("status") == "pagado":
        raise HTTPException(status_code=400, detail="No se puede editar una proforma pagada")
    
    items = []
    total = 0.0
    
    for item in edit_data.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        if item.manual_price and item.manual_price > 0:
            unit_price = item.manual_price
            price_was_manual = True
        else:
            unit_price = product["price_1"]
            price_was_manual = False
        
        subtotal = unit_price * item.quantity
        total += subtotal
        
        items.append({
            "product_id": item.product_id,
            "product_name": product["name"],
            "product_code": product["internal_code"],
            "quantity": item.quantity,
            "is_bulk": item.is_bulk,
            "unit_price_applied": unit_price,
            "subtotal": subtotal,
            "manual_price": item.manual_price if price_was_manual else None,
            "price_was_manual": price_was_manual
        })
    
    balance_paid = quote.get("balance_paid", 0.0)
    new_status = calculate_quote_status(total, balance_paid)
    
    update_dict = {
        "items": items,
        "total_amount": total,
        "status": new_status,
        "client_name": edit_data.client_name,
        "client_email": edit_data.client_email,
        "client_phone": edit_data.client_phone,
        "client_address": edit_data.client_address,
        "client_id_number": edit_data.client_id_number,
        "client_city": edit_data.client_city,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.quotes.update_one({"id": quote_id}, {"$set": update_dict})
    
    updated_quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    enriched = await enrich_quote(updated_quote)
    return QuoteResponse(**enriched)

# ============ SETTINGS ROUTES ============

@api_router.get("/settings", response_model=SettingsResponse)
async def get_app_settings(user: dict = Depends(get_current_user)):
    settings = await get_settings()
    return SettingsResponse(**settings)

@api_router.put("/settings", response_model=SettingsResponse)
async def update_settings(settings_data: SettingsUpdate, admin: dict = Depends(get_admin_user)):
    await db.settings.update_one(
        {"id": "global"},
        {"$set": {"days_until_due": settings_data.days_until_due}},
        upsert=True
    )
    settings = await get_settings()
    return SettingsResponse(**settings)

# ============ SCAN LOG ROUTES ============

@api_router.post("/scan-logs", response_model=ScanLogResponse)
async def create_scan_log(scan_data: ScanLogCreate, user: dict = Depends(get_current_user)):
    scan_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "product_id": scan_data.product_id,
        "scanned_at": datetime.now(timezone.utc).isoformat()
    }
    await db.scan_logs.insert_one(scan_doc)
    return ScanLogResponse(**{k: v for k, v in scan_doc.items() if k != "_id"})

# ============ METRICS ROUTES (ADMIN) ============

@api_router.get("/metrics/top-scanned")
async def get_top_scanned_products(admin: dict = Depends(get_admin_user)):
    pipeline = [
        {"$group": {"_id": "$product_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    results = await db.scan_logs.aggregate(pipeline).to_list(10)
    
    top_products = []
    for r in results:
        product = await db.products.find_one({"id": r["_id"]}, {"_id": 0})
        if product:
            top_products.append({
                "product_id": r["_id"],
                "product_name": product["name"],
                "product_code": product["internal_code"],
                "scan_count": r["count"]
            })
    
    return top_products

@api_router.get("/metrics/top-users-activity")
async def get_top_users_by_activity(admin: dict = Depends(get_admin_user)):
    pipeline = [
        {"$group": {"_id": "$user_id", "scan_count": {"$sum": 1}}},
        {"$sort": {"scan_count": -1}},
        {"$limit": 10}
    ]
    results = await db.scan_logs.aggregate(pipeline).to_list(10)
    
    top_users = []
    for r in results:
        user = await db.users.find_one({"id": r["_id"]}, {"_id": 0, "password": 0})
        if user:
            top_users.append({
                "user_id": r["_id"],
                "user_code": user["user_code"],
                "scan_count": r["scan_count"]
            })
    
    return top_users

@api_router.get("/metrics/top-users-quotes")
async def get_top_users_by_quotes(admin: dict = Depends(get_admin_user)):
    pipeline = [
        {"$group": {"_id": "$user_id", "quote_count": {"$sum": 1}, "total_value": {"$sum": "$total_amount"}}},
        {"$sort": {"quote_count": -1}},
        {"$limit": 10}
    ]
    results = await db.quotes.aggregate(pipeline).to_list(10)
    
    top_users = []
    for r in results:
        user = await db.users.find_one({"id": r["_id"]}, {"_id": 0, "password": 0})
        if user:
            top_users.append({
                "user_id": r["_id"],
                "user_code": user["user_code"],
                "quote_count": r["quote_count"],
                "total_value": r["total_value"]
            })
    
    return top_users

@api_router.get("/metrics/summary")
async def get_metrics_summary(admin: dict = Depends(get_admin_user)):
    total_products = await db.products.count_documents({})
    total_users = await db.users.count_documents({})
    total_quotes = await db.quotes.count_documents({})
    total_scans = await db.scan_logs.count_documents({})
    
    # Calculate proforma stats
    settings = await get_settings()
    days = settings.get("days_until_due", 30)
    
    all_quotes = await db.quotes.find({}, {"_id": 0}).to_list(1000)
    
    overdue_count = 0
    overdue_amount = 0.0
    pending_amount = 0.0
    paid_count = 0
    
    for q in all_quotes:
        enriched = await enrich_quote(q)
        pending = enriched.get("balance_pending", 0)
        
        if enriched.get("status") == "pagado":
            paid_count += 1
        else:
            pending_amount += pending
            if enriched.get("is_overdue"):
                overdue_count += 1
                overdue_amount += pending
    
    return {
        "total_products": total_products,
        "total_users": total_users,
        "total_quotes": total_quotes,
        "total_scans": total_scans,
        "overdue_quotes": overdue_count,
        "overdue_amount": overdue_amount,
        "total_pending_amount": pending_amount,
        "paid_quotes": paid_count
    }

# ============ INIT ADMIN USER ============

@api_router.post("/init-admin")
async def init_admin():
    """Initialize default admin user if not exists"""
    existing = await db.users.find_one({"user_code": "admin"})
    if existing:
        return {"message": "Admin user already exists"}
    
    admin_doc = {
        "id": str(uuid.uuid4()),
        "user_code": "admin",
        "password": hash_password("admin123"),
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_doc)
    return {"message": "Admin user created", "user_code": "admin", "password": "admin123"}

# ============ HEALTH CHECK ============

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
