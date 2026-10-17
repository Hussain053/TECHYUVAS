def test_create_and_get_activity(client):
    payload = {
        "date": "2026-10-15",
        "total_screen_time": 7.5,
        "work_study_hours": 4.5,
        "social_media_hours": 1.0,
        "entertainment_hours": 1.0,
        "late_night_usage": 0.5,
        "breaks": 4,
        "average_break_minutes": 15.0,
        "tasks_completed": 5,
        "notes": "Focused coding session",
        "source": "user"
    }
    create_resp = client.post("/api/v1/activities", json=payload)
    assert create_resp.status_code == 201
    created_id = create_resp.json()["id"]

    get_resp = client.get(f"/api/v1/activities/{created_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["total_screen_time"] == 7.5
    assert get_resp.json()["notes"] == "Focused coding session"

def test_activity_validation_error(client):
    payload = {
        "date": "2026-10-15",
        "total_screen_time": 5.0,
        "work_study_hours": 7.0,  # exceeds total_screen_time
        "source": "user"
    }
    resp = client.post("/api/v1/activities", json=payload)
    assert resp.status_code == 422

def test_create_and_list_moods(client):
    payload = {
        "date": "2026-10-15",
        "recorded_at": "2026-10-15T14:30:00Z",
        "mood": 4,
        "stress": 2,
        "energy": 4,
        "fatigue": 2,
        "note": "Feeling productive today.",
        "source": "user"
    }
    create_resp = client.post("/api/v1/moods", json=payload)
    assert create_resp.status_code == 201

    list_resp = client.get("/api/v1/moods?source=user")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1
