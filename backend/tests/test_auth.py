import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://manrique-beauty.preview.emergentagent.com').rstrip('/')


def test_health_check():
    """Backend health check returns healthy"""
    response = requests.get(f"{BASE_URL}/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data


def test_login_success(api_client):
    """Admin login returns token and user info"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "user_code": "admin",
        "password": "admin123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["user_code"] == "admin"
    assert data["user"]["role"] == "admin"
    assert "id" in data["user"]


def test_login_invalid_credentials(api_client):
    """Login with wrong password returns 401"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "user_code": "admin",
        "password": "wrongpassword"
    })
    assert response.status_code == 401


def test_login_nonexistent_user(api_client):
    """Login with non-existent user returns 401"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "user_code": "nonexistent_user_xyz",
        "password": "somepassword"
    })
    assert response.status_code == 401


def test_get_me(authenticated_client):
    """Authenticated user can fetch own profile"""
    response = authenticated_client.get(f"{BASE_URL}/api/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["user_code"] == "admin"
    assert data["role"] == "admin"


def test_get_me_without_token(api_client):
    """Unauthenticated request returns 403 or 401"""
    response = api_client.get(f"{BASE_URL}/api/auth/me")
    assert response.status_code in [401, 403]
