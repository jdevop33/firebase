from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from prisma import Prisma
from typing import List, Optional
from datetime import datetime
import os
from .auth import check_roles, get_current_user
from .models import AssetCreate, FinancialPlanCreate, AssetType, AssetStatus
from .ai_reports import router as reports_router

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(reports_router, prefix="/api")

# Database client
prisma = Prisma()

@app.on_event("startup")
async def startup():
    await prisma.connect()

@app.on_event("shutdown")
async def shutdown():
    await prisma.disconnect()

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

# Asset Management Endpoints
@app.get("/api/assets")
async def get_assets(
    skip: int = Query(0, ge=0),
    take: int = Query(10, ge=1, le=100),
    type: Optional[AssetType] = None,
    status: Optional[AssetStatus] = None,
    user: dict = Depends(check_roles(["admin", "finance_director", "public_works"]))
):
    """
    Fetch all assets with optional filtering and pagination.
    """
    where = {}
    if type:
        where["type"] = type
    if status:
        where["status"] = status
    
    try:
        assets = await prisma.asset.find_many(
            where=where,
            skip=skip,
            take=take,
            include={
                "department": True,
                "maintenanceLogs": {
                    "take": 1,
                    "orderBy": {
                        "date": "desc"
                    }
                }
            }
        )
        total = await prisma.asset.count(where=where)
        
        return {
            "items": assets,
            "total": total,
            "page": skip // take + 1,
            "pages": (total + take - 1) // take
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/assets/{asset_id}")
async def get_asset(
    asset_id: str,
    user: dict = Depends(check_roles(["admin", "finance_director", "public_works"]))
):
    """
    Fetch a specific asset by ID.
    """
    asset = await prisma.asset.find_unique(
        where={"id": asset_id},
        include={
            "department": True,
            "maintenanceLogs": True,
            "financialPlans": True,
            "insuranceDetails": True
        }
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@app.post("/api/assets/create")
async def create_asset(
    asset: AssetCreate,
    user: dict = Depends(check_roles(["admin"]))
):
    """
    Create a new asset.
    """
    try:
        new_asset = await prisma.asset.create(
            data={
                **asset.dict(),
                "userId": user["user_id"],
                "riskLevel": "LOW",
                "priority": "MEDIUM"
            },
            include={
                "department": True
            }
        )
        return new_asset
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Financial Planning Endpoints
@app.get("/api/financial-plans")
async def get_financial_plans(
    year: Optional[int] = None,
    status: Optional[str] = None,
    user: dict = Depends(check_roles(["admin", "finance_director"]))
):
    """
    Fetch all financial plans with optional filtering.
    """
    where = {}
    if year:
        where["year"] = year
    if status:
        where["status"] = status

    try:
        plans = await prisma.financialPlan.find_many(
            where=where,
            include={
                "asset": True
            }
        )
        return plans
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/financial-plans/create")
async def create_financial_plan(
    plan: FinancialPlanCreate,
    user: dict = Depends(check_roles(["admin", "finance_director"]))
):
    """
    Create a new financial plan.
    """
    try:
        new_plan = await prisma.financialPlan.create(
            data={
                **plan.dict(),
                "status": "DRAFT"
            },
            include={
                "asset": True
            }
        )
        return new_plan
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/financial-plans/projections")
async def get_budget_projections(
    years: int = Query(5, ge=1, le=20),
    user: dict = Depends(check_roles(["admin", "finance_director"]))
):
    """
    Generate infrastructure budget projections.
    """
    try:
        # Get all assets and their financial plans
        assets = await prisma.asset.find_many(
            include={
                "financialPlans": True
            }
        )
        
        current_year = datetime.now().year
        projections = []
        
        for year in range(current_year, current_year + years):
            yearly_projection = {
                "year": year,
                "total_budget_needed": 0,
                "maintenance_cost": 0,
                "replacement_cost": 0,
                "assets_requiring_attention": []
            }
            
            for asset in assets:
                # Calculate asset age and remaining life
                asset_age = year - asset.purchaseDate.year
                remaining_life = asset.expectedLifespan - asset_age
                
                # Estimate maintenance costs based on asset condition and age
                maintenance_factor = {
                    "EXCELLENT": 0.01,
                    "GOOD": 0.02,
                    "FAIR": 0.04,
                    "POOR": 0.08,
                    "CRITICAL": 0.15
                }
                
                yearly_maintenance = asset.value * maintenance_factor[asset.condition]
                yearly_projection["maintenance_cost"] += yearly_maintenance
                
                # If asset needs replacement in this year
                if remaining_life <= 0:
                    yearly_projection["replacement_cost"] += asset.value * 1.03 ** (year - current_year)
                    yearly_projection["assets_requiring_attention"].append({
                        "id": asset.id,
                        "name": asset.name,
                        "type": "replacement",
                        "estimated_cost": asset.value * 1.03 ** (year - current_year)
                    })
                
            yearly_projection["total_budget_needed"] = (
                yearly_projection["maintenance_cost"] + 
                yearly_projection["replacement_cost"]
            )
            
            projections.append(yearly_projection)
        
        return {
            "projections": projections,
            "total_assets": len(assets),
            "projection_years": years
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))