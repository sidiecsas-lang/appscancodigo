import pytest
import requests
import uuid
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://beauty-importadora.preview.emergentagent.com').rstrip('/')

created_user_id = None


def test_get_users_admin(authenticated_client):
    """Admin can get all users"""
    response = authenticated_client.get(f"{BASE_URL}/api/users")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    # Admin user should be in the list
    admin_users = [u for u in data if u["user_code"] == "admin"]
    assert len(admin_users) == 1


def test_get_users_unauthenticated(api_client):
    """Unauthenticated cannot access users"""
    response = api_client.get(f"{BASE_URL}/api/users")
    assert response.status_code in [401, 403]


def test_user_response_no_password(authenticated_client):
    """User response does not expose password field"""
    response = authenticated_client.get(f"{BASE_URL}/api/users")
    assert response.status_code == 200
    data = response.json()
    for user in data:
        assert "password" not in user
        assert "_id" not in user


def test_create_user(authenticated_client):
    """Admin can create a new user"""
    global created_user_id
    uid = str(uuid.uuid4())[:8]
    user_data = {
        "user_code": f"TEST_{uid}",
        "password": "testpass123",
        "role": "empleado"
    }
    response = authenticated_client.post(f"{BASE_URL}/api/users", json=user_data)
    assert response.status_code == 200
    data = response.json()
    assert data["user_code"] == user_data["user_code"]
    assert data["role"] == "empleado"
    assert "id" in data
    assert "password" not in data
    created_user_id = data["id"]


def test_create_duplicate_user(authenticated_client):
    """Cannot create user with duplicate user_code"""
    response = authenticated_client.post(f"{BASE_URL}/api/users", json={
        "user_code": "admin",
        "password": "somepass",
        "role": "empleado"
    })
    assert response.status_code == 400


def test_update_user_role(authenticated_client):
    """Admin can update user role"""
    global created_user_id
    if not created_user_id:
        pytest.skip("No user created in previous test")
    response = authenticated_client.put(f"{BASE_URL}/api/users/{created_user_id}", 
                                         json={"role": "admin"})
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "admin"


def test_delete_user(authenticated_client):
    """Admin can delete a user"""
    global created_user_id
    if not created_user_id:
        pytest.skip("No user created in previous test")
    response = authenticated_client.delete(f"{BASE_URL}/api/users/{created_user_id}")
    assert response.status_code == 200
    created_user_id = None


def test_new_user_can_login(api_client):
    """Newly created employee can login"""
    uid = str(uuid.uuid4())[:8]
    user_code = f"TEST_EMP_{uid}"
    
    # Create user via admin
    admin_resp = api_client.post(f"{BASE_URL}/api/auth/login", 
                                  json={"user_code": "admin", "password": "admin123"})
    assert admin_resp.status_code == 200
    token = admin_resp.json()["access_token"]
    
    api_client.headers.update({"Authorization": f"Bearer {token}"})
    create_resp = api_client.post(f"{BASE_URL}/api/users", 
                                   json={"user_code": user_code, "password": "emppass123", "role": "empleado"})
    assert create_resp.status_code == 200
    new_user_id = create_resp.json()["id"]
    
    # Login as new user
    api_client.headers.pop("Authorization", None)
    api_client.headers.pop("Content-Type", None)
    api_client.headers.update({"Content-Type": "application/json"})
    
    login_resp = api_client.post(f"{BASE_URL}/api/auth/login",
                                  json={"user_code": user_code, "password": "emppass123"})
    assert login_resp.status_code == 200
    assert login_resp.json()["user"]["role"] == "empleado"
    
    # Cleanup
    api_client.headers.update({"Authorization": f"Bearer {token}"})
    api_client.delete(f"{BASE_URL}/api/users/{new_user_id}")
