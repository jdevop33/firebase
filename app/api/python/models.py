from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

# Existing models...

class ComplianceReportCreate(BaseModel):
    reportType: str
    content: Dict
    status: str = "PENDING"
    dueDate: Optional[datetime] = None
    submissionDate: Optional[datetime] = None
    findings: Optional[str] = None
    recommendations: Optional[str] = None
    assetId: str