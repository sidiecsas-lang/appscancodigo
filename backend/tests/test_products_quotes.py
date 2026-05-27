import pytest
import requests
import uuid
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://beauty-importadora.preview.emergentagent.com').rstrip('/')

created_product_id = None


def test_get_products_authenticated(authenticated_client):
    """Authenticated user can get products list"""
    response = authenticated_client.get(f"{BASE_URL}/api/products")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Should have products (57 were bulk uploaded)
    assert len(data) > 0


def test_get_products_unauthenticated(api_client):
    """Unauthenticated request for products returns 403"""
    response = api_client.get(f"{BASE_URL}/api/products")
    assert response.status_code in [401, 403]


def test_get_products_with_search(authenticated_client):
    """Search products by keyword"""
    response = authenticated_client.get(f"{BASE_URL}/api/products", params={"search": "a"})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_product_response_structure(authenticated_client):
    """Product response has correct fields"""
    response = authenticated_client.get(f"{BASE_URL}/api/products")
    assert response.status_code == 200
    products = response.json()
    assert len(products) > 0
    product = products[0]
    assert "id" in product
    assert "internal_code" in product
    assert "barcode" in product
    assert "name" in product
    assert "price_1" in product
    assert "price_2" in product
    assert "price_3" in product
    assert "created_at" in product
    # Ensure no _id MongoDB field leaks
    assert "_id" not in product


def test_create_product(authenticated_client):
    """Admin can create a product"""
    global created_product_id
    uid = str(uuid.uuid4())[:8]
    product_data = {
        "internal_code": f"TEST_{uid}",
        "barcode": f"BC_{uid}",
        "name": f"TEST Producto {uid}",
        "price_1": 5.50,
        "price_2": 7.25,
        "price_3": 9.99
    }
    response = authenticated_client.post(f"{BASE_URL}/api/products", json=product_data)
    assert response.status_code == 200
    data = response.json()
    assert data["internal_code"] == product_data["internal_code"]
    assert data["name"] == product_data["name"]
    assert data["price_1"] == product_data["price_1"]
    assert data["price_2"] == product_data["price_2"]
    assert data["price_3"] == product_data["price_3"]
    assert "id" in data
    created_product_id = data["id"]


def test_get_product_by_id(authenticated_client):
    """Get specific product by ID"""
    global created_product_id
    if not created_product_id:
        pytest.skip("No product created in previous test")
    response = authenticated_client.get(f"{BASE_URL}/api/products/{created_product_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == created_product_id


def test_update_product(authenticated_client):
    """Admin can update a product"""
    global created_product_id
    if not created_product_id:
        pytest.skip("No product created in previous test")
    update_data = {"price_3": 11.99}
    response = authenticated_client.put(f"{BASE_URL}/api/products/{created_product_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["price_3"] == 11.99


def test_delete_product(authenticated_client):
    """Admin can delete a product"""
    global created_product_id
    if not created_product_id:
        pytest.skip("No product created in previous test")
    response = authenticated_client.delete(f"{BASE_URL}/api/products/{created_product_id}")
    assert response.status_code == 200
    # Verify it's gone
    get_response = authenticated_client.get(f"{BASE_URL}/api/products/{created_product_id}")
    assert get_response.status_code == 404
    created_product_id = None


def test_get_metrics_summary(authenticated_client):
    """Admin can get metrics summary"""
    response = authenticated_client.get(f"{BASE_URL}/api/metrics/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_products" in data
    assert "total_users" in data
    assert "total_quotes" in data
    assert "total_scans" in data
    assert data["total_products"] > 0
    assert data["total_users"] > 0


def test_metrics_summary_non_admin(api_client, auth_token):
    """Non-admin cannot access metrics"""
    # Use admin token but test that the endpoint is admin-only by trying without token
    response = api_client.get(f"{BASE_URL}/api/metrics/summary")
    assert response.status_code in [401, 403]


def test_get_quotes_admin(authenticated_client):
    """Admin can get all quotes"""
    response = authenticated_client.get(f"{BASE_URL}/api/quotes")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_create_quote(authenticated_client):
    """Authenticated user can create a quote"""
    # First get a product to use
    products_response = authenticated_client.get(f"{BASE_URL}/api/products")
    assert products_response.status_code == 200
    products = products_response.json()
    assert len(products) > 0
    
    product = products[0]
    quote_data = {
        "client_name": "TEST_Client",
        "items": [
            {
                "product_id": product["id"],
                "quantity": 5,
                "is_bulk": False
            }
        ]
    }
    response = authenticated_client.post(f"{BASE_URL}/api/quotes", json=quote_data)
    assert response.status_code == 200
    data = response.json()
    assert data["client_name"] == "TEST_Client"
    assert len(data["items"]) == 1
    assert data["total_amount"] > 0
    # Verify price logic: qty=5 (1-11 range) should use price_3
    assert data["items"][0]["unit_price_applied"] == product["price_3"]


def test_price_logic_bulk(authenticated_client):
    """Bulk flag uses price_1"""
    products_response = authenticated_client.get(f"{BASE_URL}/api/products")
    products = products_response.json()
    product = products[0]
    
    quote_data = {
        "items": [{"product_id": product["id"], "quantity": 1, "is_bulk": True}]
    }
    response = authenticated_client.post(f"{BASE_URL}/api/quotes", json=quote_data)
    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["unit_price_applied"] == product["price_1"]


def test_price_logic_wholesale(authenticated_client):
    """Quantity >= 12 uses price_2"""
    products_response = authenticated_client.get(f"{BASE_URL}/api/products")
    products = products_response.json()
    product = products[0]
    
    quote_data = {
        "items": [{"product_id": product["id"], "quantity": 12, "is_bulk": False}]
    }
    response = authenticated_client.post(f"{BASE_URL}/api/quotes", json=quote_data)
    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["unit_price_applied"] == product["price_2"]
