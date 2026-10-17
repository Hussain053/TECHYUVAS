def test_routine_simulation_valid(client):
    payload = {
        "total_screen_time": 8.0,
        "active_work": 5.5,
        "social_media": 1.0,
        "entertainment": 1.0,
        "late_night": 0.5,
        "break_count": 6,
        "avg_break_duration": 15,
        "age_group": "25-34",
        "occupation": "Software Engineer"
    }
    response = client.post("/api/v1/ml/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "predicted_productivity_score" in data
    assert 0.0 <= data["predicted_productivity_score"] <= 100.0
    assert "confidence_band" in data
    assert data["confidence_band"]["lower"] <= data["predicted_productivity_score"] <= data["confidence_band"]["upper"]
    assert "archetype" in data
    assert "archetype_name" in data["archetype"]

def test_routine_simulation_inconsistent_input(client):
    payload = {
        "total_screen_time": 4.0,
        "active_work": 6.0,  # exceeds total_screen_time
        "social_media": 0.0,
        "entertainment": 0.0,
        "late_night": 0.0,
        "break_count": 2,
        "avg_break_duration": 10
    }
    response = client.post("/api/v1/ml/simulate", json=payload)
    assert response.status_code == 422

def test_habit_profile_endpoint(client):
    payload = {
        "total_screen_time": 9.5,
        "active_work": 6.5,
        "social_media": 1.5,
        "entertainment": 1.0,
        "late_night": 0.5,
        "break_count": 6,
        "avg_break_duration": 20
    }
    response = client.post("/api/v1/ml/profile", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "cluster_id" in data
    assert "archetype_name" in data
    assert "distance_to_center" in data
    assert isinstance(data["is_routine_drift"], bool)

def test_ml_metrics_endpoint(client):
    response = client.get("/api/v1/ml/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "selected_model" in data
    assert "selected_metrics" in data
    assert data["selected_metrics"]["r2"] > 0.5
