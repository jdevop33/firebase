import pytest
from httpx import AsyncClient
from ..main import app
from ..models import ComplianceReportCreate
from datetime import datetime

@pytest.mark.asyncio
async def test_generate_report():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Mock authentication
        headers = {"Authorization": "Bearer test_token"}
        
        # Test data
        asset_id = "test_asset_id"
        report_type = "POLICY"
        
        response = await client.post(
            f"/api/reports/generate/{asset_id}?report_type={report_type}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "content" in data
        assert data["status"] == "COMPLETED"

@pytest.mark.asyncio
async def test_get_reports():
    async with AsyncClient(app=app, base_url="http://test") as client:
        headers = {"Authorization": "Bearer test_token"}
        
        response = await client.get("/api/reports", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

@pytest.mark.asyncio
async def test_get_report():
    async with AsyncClient(app=app, base_url="http://test") as client:
        headers = {"Authorization": "Bearer test_token"}
        
        # First create a report
        asset_id = "test_asset_id"
        report_type = "POLICY"
        create_response = await client.post(
            f"/api/reports/generate/{asset_id}?report_type={report_type}",
            headers=headers
        )
        report_id = create_response.json()["id"]
        
        # Then fetch it
        response = await client.get(f"/api/reports/{report_id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == report_id