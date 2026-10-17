def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["ml_models"]["regression_pipeline"] == "loaded"
    assert data["ml_models"]["clustering_pipeline"] == "loaded"

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "MindTrace" in data["name"]
