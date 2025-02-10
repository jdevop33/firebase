from fastapi import APIRouter, HTTPException, Depends, Response
from typing import Dict, List
import httpx
import json
import os
from .auth import check_roles
from .models import ComplianceReportCreate
from prisma import Prisma
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from io import BytesIO
from datetime import datetime

router = APIRouter()
prisma = Prisma()

AI_API_KEY = os.getenv("AI_API_KEY")
AI_ENDPOINT = "https://api.anthropic.com/v1/messages"

REPORT_TEMPLATES = {
    "POLICY": {
        "system_prompt": """You are an expert municipal asset management policy analyst. 
        Generate a detailed policy report with the following structure:
        {
          "title": "Asset Management Policy Report",
          "sections": [
            {
              "heading": "Executive Summary",
              "content": "Brief overview of key findings and recommendations"
            },
            {
              "heading": "Purpose and Scope",
              "content": "Detailed explanation of policy objectives and coverage"
            },
            {
              "heading": "Policy Framework",
              "content": "Key policy components and guidelines"
            },
            {
              "heading": "Roles and Responsibilities",
              "content": "Detailed breakdown of stakeholder responsibilities"
            },
            {
              "heading": "Risk Management",
              "content": "Risk assessment and mitigation strategies"
            },
            {
              "heading": "Compliance Requirements",
              "content": "Regulatory and internal compliance guidelines"
            },
            {
              "heading": "Recommendations",
              "content": "Specific actionable recommendations"
            }
          ]
        }"""
    },
    "STRATEGY": {
        "system_prompt": """You are an expert municipal asset management strategist.
        Generate a detailed strategy report with the following structure:
        {
          "title": "Asset Management Strategy Report",
          "sections": [
            {
              "heading": "Executive Summary",
              "content": "Overview of strategic objectives and key initiatives"
            },
            {
              "heading": "Current State Analysis",
              "content": "Detailed assessment of current asset management practices"
            },
            {
              "heading": "Strategic Objectives",
              "content": "Key goals and desired outcomes"
            },
            {
              "heading": "Implementation Plan",
              "content": "Detailed roadmap for strategy execution"
            },
            {
              "heading": "Resource Requirements",
              "content": "Required resources and capabilities"
            },
            {
              "heading": "Performance Metrics",
              "content": "KPIs and success measures"
            },
            {
              "heading": "Risk Analysis",
              "content": "Strategic risks and mitigation plans"
            }
          ]
        }"""
    },
    "FINANCIAL": {
        "system_prompt": """You are an expert municipal asset financial analyst.
        Generate a detailed financial planning report with the following structure:
        {
          "title": "Asset Financial Planning Report",
          "sections": [
            {
              "heading": "Executive Summary",
              "content": "Overview of financial analysis and key recommendations"
            },
            {
              "heading": "Financial Analysis",
              "content": "Detailed cost analysis and financial metrics"
            },
            {
              "heading": "Budget Forecast",
              "content": "Multi-year budget projections"
            },
            {
              "heading": "Funding Strategy",
              "content": "Recommended funding sources and allocation"
            },
            {
              "heading": "Cost Optimization",
              "content": "Opportunities for cost reduction"
            },
            {
              "heading": "Risk Assessment",
              "content": "Financial risks and mitigation strategies"
            },
            {
              "heading": "Recommendations",
              "content": "Actionable financial recommendations"
            }
          ]
        }"""
    }
}

async def generate_report_content(asset_data: Dict, report_type: str) -> Dict:
    headers = {
        "Content-Type": "application/json",
        "x-api-key": AI_API_KEY,
        "anthropic-version": "2023-06-01"
    }
    
    template = REPORT_TEMPLATES.get(report_type)
    if not template:
        raise HTTPException(status_code=400, detail="Invalid report type")
    
    message = {
        "messages": [{
            "role": "user",
            "content": f"{template['system_prompt']}\n\nAsset details: {json.dumps(asset_data, indent=2)}"
        }],
        "model": "claude-3-opus-20240229",
        "max_tokens": 4000,
        "response_format": { "type": "json" }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(AI_ENDPOINT, json=message, headers=headers)
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Error generating report")
            
            report_content = response.json()["content"][0]["text"]
            return json.loads(report_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reports/generate/{asset_id}")
async def generate_compliance_report(
    asset_id: str,
    report_type: str,
    user: dict = Depends(check_roles(["admin", "finance_director"]))
):
    try:
        # Fetch asset data
        asset = await prisma.asset.find_unique(
            where={"id": asset_id},
            include={
                "department": True,
                "maintenanceLogs": True,
                "financialPlans": True
            }
        )
        
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        # Generate report content using AI
        report_content = await generate_report_content(asset, report_type)
        
        # Create report record in database
        report = await prisma.complianceReport.create(
            data={
                "reportType": report_type,
                "content": report_content,
                "status": "COMPLETED",
                "assetId": asset_id,
                "dueDate": datetime.now(),
                "submissionDate": datetime.now()
            }
        )
        
        return {
            "id": report.id,
            "content": report_content,
            "status": "COMPLETED",
            "generated_at": report.createdAt
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/{report_id}/pdf")
async def export_report_pdf(
    report_id: str,
    user: dict = Depends(check_roles(["admin", "finance_director"]))
):
    """Export a report as PDF and store in Firebase Storage."""
    report = await prisma.complianceReport.find_unique(
        where={"id": report_id},
        include={
            "asset": True
        }
    )
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    
    # Custom styles
    styles.add(ParagraphStyle(
        name='CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30
    ))
    
    styles.add(ParagraphStyle(
        name='SectionHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=12
    ))
    
    story = []
    
    # Title
    content = report.content
    title = Paragraph(content["title"], styles['CustomTitle'])
    story.append(title)
    
    # Metadata
    metadata = [
        ["Asset", report.asset.name],
        ["Report Type", report.reportType],
        ["Generated", report.createdAt.strftime("%Y-%m-%d %H:%M:%S")],
        ["Status", report.status]
    ]
    
    meta_table = Table(metadata, colWidths=[100, 400])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.grey),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('BACKGROUND', (1, 0), (-1, -1), colors.white),
        ('TEXTCOLOR', (1, 0), (-1, -1), colors.black),
        ('FONTNAME', (1, 0), (-1, -1), 'Helvetica'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(meta_table)
    story.append(Spacer(1, 20))
    
    # Sections
    for section in content["sections"]:
        heading = Paragraph(section["heading"], styles['SectionHeading'])
        story.append(heading)
        
        content_para = Paragraph(section["content"], styles['Normal'])
        story.append(content_para)
        story.append(Spacer(1, 12))
    
    # Build PDF
    doc.build(story)
    
    # Get PDF content
    pdf_content = buffer.getvalue()
    buffer.close()

    # Update report with PDF URL if it doesn't exist
    if not report.pdfUrl:
        try:
            # Store PDF content and get URL
            pdf_blob = pdf_content
            
            # Update report with PDF URL
            await prisma.complianceReport.update(
                where={"id": report_id},
                data={
                    "pdfUrl": f"/api/reports/{report_id}/pdf",  # Store API endpoint as URL
                    "updatedAt": datetime.now()
                }
            )
        except Exception as e:
            print(f"Error storing PDF: {str(e)}")
            # Continue to serve PDF even if storage fails
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=report-{report_id}.pdf"
        }
    )

@router.get("/reports")
async def get_reports(user: dict = Depends(check_roles(["admin", "finance_director"]))):
    """Fetch all reports."""
    try:
        reports = await prisma.complianceReport.find_many(
            order_by={
                "createdAt": "desc"
            }
        )
        return reports
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/{report_id}")
async def get_report(
    report_id: str,
    user: dict = Depends(check_roles(["admin", "finance_director"]))
):
    """Fetch a specific report."""
    report = await prisma.complianceReport.find_unique(
        where={"id": report_id}
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report