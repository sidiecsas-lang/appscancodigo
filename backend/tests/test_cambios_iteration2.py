"""
Backend tests for 4 cambios:
- CAMBIO 1: New fields client_id_number + client_city in quotes
- CAMBIO 3: PUT /api/quotes/{id}/items endpoint
- CAMBIO 4: Manual price logic (price_was_manual)
- Backward compat: GET /api/products/scan/{code} still returns price_1/2/3
- Login: admin/admin123
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ==================== FIXTURES ====================

@pytest.fixture(scope="module")
def auth_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "user_code": "admin",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}

@pytest.fixture(scope="module")
def sample_product(auth_headers):
    """Get a sample product for testing"""
    response = requests.get(f"{BASE_URL}/api/products", headers=auth_headers)
    assert response.status_code == 200
    products = response.json()
    assert len(products) > 0, "No products available for testing"
    return products[0]

@pytest.fixture(scope="module")
def created_quote_id(auth_headers, sample_product):
    """Create a test quote and return its ID, clean up after module"""
    response = requests.post(f"{BASE_URL}/api/quotes", json={
        "client_name": "TEST_Cliente Prueba",
        "client_id_number": "1234567890",
        "client_city": "Quito",
        "client_phone": "0999123456",
        "items": [
            {
                "product_id": sample_product["id"],
                "quantity": 2,
                "is_bulk": False,
                "manual_price": None
            }
        ]
    }, headers=auth_headers)
    assert response.status_code == 200, f"Quote creation failed: {response.text}"
    quote_id = response.json()["id"]
    yield quote_id
    # Teardown: nothing to clean (quotes don't have delete endpoint exposed)

# ==================== CAMBIO 1 TESTS ====================

class TestCambio1NewFields:
    """CAMBIO 1: client_id_number and client_city in quotes"""

    def test_login_admin(self):
        """Login with admin/admin123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "user_code": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["user_code"] == "admin"
        assert data["user"]["role"] == "admin"
        print("PASS: admin login successful")

    def test_create_quote_with_client_id_number_and_city(self, auth_headers, sample_product):
        """CAMBIO 1: POST /api/quotes accepts client_id_number and client_city"""
        payload = {
            "client_name": "TEST_Juan Perez",
            "client_id_number": "1234567890",
            "client_city": "Guayaquil",
            "client_phone": "0999111222",
            "items": [
                {
                    "product_id": sample_product["id"],
                    "quantity": 1,
                    "is_bulk": False,
                    "manual_price": None
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/quotes", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()

        # Verify new fields are in response
        assert data.get("client_id_number") == "1234567890", f"client_id_number not returned: {data}"
        assert data.get("client_city") == "Guayaquil", f"client_city not returned: {data}"
        assert data.get("client_name") == "TEST_Juan Perez"
        print(f"PASS: Quote created with client_id_number and client_city. ID: {data['id']}")

    def test_create_quote_with_ruc_13digits(self, auth_headers, sample_product):
        """CAMBIO 1: client_id_number accepts 13-digit RUC"""
        payload = {
            "client_name": "TEST_Empresa ABC",
            "client_id_number": "1234567890001",
            "client_city": "Cuenca",
            "items": [
                {
                    "product_id": sample_product["id"],
                    "quantity": 1,
                    "is_bulk": False
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/quotes", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("client_id_number") == "1234567890001"
        assert data.get("client_city") == "Cuenca"
        print("PASS: 13-digit RUC accepted")

    def test_create_quote_without_new_fields(self, auth_headers, sample_product):
        """CAMBIO 1: Backward compat - quote creation still works without new fields"""
        payload = {
            "client_name": "TEST_Cliente Sin ID",
            "items": [
                {
                    "product_id": sample_product["id"],
                    "quantity": 1,
                    "is_bulk": False
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/quotes", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # These should be None when not provided
        assert data.get("client_id_number") is None
        assert data.get("client_city") is None
        print("PASS: Quote without new fields works (backward compat)")

    def test_get_quote_returns_new_fields(self, auth_headers, sample_product):
        """CAMBIO 1: GET /api/quotes returns client_id_number and client_city"""
        # Create quote with new fields
        create_resp = requests.post(f"{BASE_URL}/api/quotes", json={
            "client_name": "TEST_FieldCheck",
            "client_id_number": "9876543210",
            "client_city": "Manta",
            "items": [{"product_id": sample_product["id"], "quantity": 1, "is_bulk": False}]
        }, headers=auth_headers)
        assert create_resp.status_code == 200
        quote_id = create_resp.json()["id"]

        # Fetch by ID
        get_resp = requests.get(f"{BASE_URL}/api/quotes/{quote_id}", headers=auth_headers)
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert data.get("client_id_number") == "9876543210"
        assert data.get("client_city") == "Manta"
        print("PASS: GET quote returns client_id_number and client_city")


# ==================== CAMBIO 3 TESTS ====================

class TestCambio3EditQuote:
    """CAMBIO 3: PUT /api/quotes/{id}/items"""

    def test_edit_quote_items_endpoint_exists(self, auth_headers, created_quote_id, sample_product):
        """CAMBIO 3: PUT /api/quotes/{id}/items returns 200"""
        payload = {
            "client_name": "TEST_Updated Client",
            "client_id_number": "0987654321",
            "client_city": "Ambato",
            "items": [
                {
                    "product_id": sample_product["id"],
                    "quantity": 3,
                    "is_bulk": False,
                    "manual_price": None
                }
            ]
        }
        response = requests.put(
            f"{BASE_URL}/api/quotes/{created_quote_id}/items",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Verify client data was updated
        assert data.get("client_name") == "TEST_Updated Client"
        assert data.get("client_id_number") == "0987654321"
        assert data.get("client_city") == "Ambato"
        print(f"PASS: PUT /api/quotes/{created_quote_id}/items succeeded")

    def test_edit_quote_recalculates_total(self, auth_headers, created_quote_id, sample_product):
        """CAMBIO 3: PUT recalculates total based on new items"""
        # Update with known quantity
        qty = 5
        payload = {
            "items": [
                {
                    "product_id": sample_product["id"],
                    "quantity": qty,
                    "is_bulk": False,
                    "manual_price": None
                }
            ]
        }
        response = requests.put(
            f"{BASE_URL}/api/quotes/{created_quote_id}/items",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        expected_unit_price = sample_product["price_1"]
        expected_total = expected_unit_price * qty
        assert abs(data["total_amount"] - expected_total) < 0.01, \
            f"Total mismatch: expected {expected_total}, got {data['total_amount']}"
        print(f"PASS: Total recalculated correctly: {data['total_amount']}")

    def test_edit_quote_returns_400_if_pagado(self, auth_headers, sample_product):
        """CAMBIO 3: PUT returns 400 if proforma status is 'pagado'"""
        # Create a quote and mark it as paid
        create_resp = requests.post(f"{BASE_URL}/api/quotes", json={
            "client_name": "TEST_PaidClient",
            "items": [{"product_id": sample_product["id"], "quantity": 1, "is_bulk": False}]
        }, headers=auth_headers)
        assert create_resp.status_code == 200
        quote_id = create_resp.json()["id"]

        # Pay it in full
        pay_resp = requests.post(
            f"{BASE_URL}/api/quotes/{quote_id}/payments",
            json={"amount": 0, "payment_type": "total"},
            headers=auth_headers
        )
        assert pay_resp.status_code == 200
        assert pay_resp.json()["status"] == "pagado"

        # Now try to edit – should return 400
        edit_resp = requests.put(
            f"{BASE_URL}/api/quotes/{quote_id}/items",
            json={
                "items": [{"product_id": sample_product["id"], "quantity": 2, "is_bulk": False}]
            },
            headers=auth_headers
        )
        assert edit_resp.status_code == 400, f"Expected 400, got {edit_resp.status_code}: {edit_resp.text}"
        assert "pagada" in edit_resp.json()["detail"].lower() or "pagado" in edit_resp.json()["detail"].lower()
        print("PASS: PUT returns 400 when proforma is 'pagado'")

    def test_edit_quote_updates_client_data(self, auth_headers, created_quote_id):
        """CAMBIO 3: PUT updates client fields"""
        payload = {
            "client_name": "TEST_New Name",
            "client_email": "test@example.com",
            "client_phone": "0991234567",
            "client_city": "Loja",
            "client_id_number": "1122334455",
            "items": []
        }
        # Will fail if items is empty - need at least one item
        # Let's get a product first
        products_resp = requests.get(f"{BASE_URL}/api/products", headers=auth_headers)
        product = products_resp.json()[0]
        payload["items"] = [{"product_id": product["id"], "quantity": 1, "is_bulk": False}]

        response = requests.put(
            f"{BASE_URL}/api/quotes/{created_quote_id}/items",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["client_name"] == "TEST_New Name"
        assert data["client_email"] == "test@example.com"
        assert data["client_city"] == "Loja"
        assert data["client_id_number"] == "1122334455"
        print("PASS: PUT updates all client fields correctly")


# ==================== CAMBIO 4 TESTS ====================

class TestCambio4ManualPrice:
    """CAMBIO 4: Only price_1 + optional manual price per item"""

    def test_create_quote_uses_price_1_by_default(self, auth_headers, sample_product):
        """CAMBIO 4: POST /api/quotes uses price_1 when no manual_price given"""
        payload = {
            "client_name": "TEST_DefaultPrice",
            "items": [
                {
                    "product_id": sample_product["id"],
                    "quantity": 1,
                    "is_bulk": False,
                    "manual_price": None
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/quotes", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        item = data["items"][0]
        assert item["unit_price_applied"] == sample_product["price_1"], \
            f"Expected price_1={sample_product['price_1']}, got {item['unit_price_applied']}"
        assert item["price_was_manual"] == False
        assert item.get("manual_price") is None
        print(f"PASS: Default price is price_1={sample_product['price_1']}")

    def test_create_quote_with_manual_price(self, auth_headers, sample_product):
        """CAMBIO 4: POST /api/quotes with manual_price uses that price, price_was_manual=True"""
        manual_price = 99.99
        payload = {
            "client_name": "TEST_ManualPrice",
            "items": [
                {
                    "product_id": sample_product["id"],
                    "quantity": 2,
                    "is_bulk": False,
                    "manual_price": manual_price
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/quotes", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        item = data["items"][0]
        assert item["unit_price_applied"] == manual_price, \
            f"Expected manual price {manual_price}, got {item['unit_price_applied']}"
        assert item["price_was_manual"] == True
        assert item.get("manual_price") == manual_price
        # Verify subtotal
        assert abs(item["subtotal"] - manual_price * 2) < 0.01
        print(f"PASS: manual_price={manual_price} used, price_was_manual=True, subtotal={item['subtotal']}")

    def test_large_quantity_still_uses_price_1(self, auth_headers, sample_product):
        """CAMBIO 4: qty >= 12 still uses price_1, not price_2 (old logic removed)"""
        payload = {
            "client_name": "TEST_LargeQty",
            "items": [
                {
                    "product_id": sample_product["id"],
                    "quantity": 12,
                    "is_bulk": False,
                    "manual_price": None
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/quotes", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        item = data["items"][0]
        assert item["unit_price_applied"] == sample_product["price_1"], \
            f"FAIL: qty=12 should use price_1={sample_product['price_1']}, got {item['unit_price_applied']}"
        assert item["price_was_manual"] == False
        print(f"PASS: qty=12 uses price_1={sample_product['price_1']} (old price_2 logic removed)")


# ==================== BACKWARD COMPAT TESTS ====================

class TestBackwardCompat:
    """Backward compatibility tests"""

    def test_scan_product_returns_all_three_prices(self, auth_headers, sample_product):
        """Backward compat: GET /api/products/scan/{code} returns price_1, price_2, price_3"""
        code = sample_product["internal_code"]
        response = requests.get(f"{BASE_URL}/api/products/scan/{code}", headers=auth_headers)
        assert response.status_code == 200, f"Scan endpoint failed: {response.text}"
        data = response.json()
        assert "price_1" in data, "price_1 missing from scan response"
        assert "price_2" in data, "price_2 missing from scan response"
        assert "price_3" in data, "price_3 missing from scan response"
        assert isinstance(data["price_1"], (int, float))
        assert isinstance(data["price_2"], (int, float))
        assert isinstance(data["price_3"], (int, float))
        print(f"PASS: Scan returns price_1={data['price_1']}, price_2={data['price_2']}, price_3={data['price_3']}")

    def test_get_products_returns_all_prices(self, auth_headers, sample_product):
        """Backward compat: GET /api/products still returns price_1, price_2, price_3"""
        response = requests.get(f"{BASE_URL}/api/products", headers=auth_headers)
        assert response.status_code == 200
        products = response.json()
        for p in products[:3]:
            assert "price_1" in p
            assert "price_2" in p
            assert "price_3" in p
        print(f"PASS: GET /api/products returns all price fields")

    def test_login_empleado(self):
        """Login with empleado1/emp123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "user_code": "empleado1",
            "password": "emp123"
        })
        assert response.status_code == 200, f"Empleado login failed: {response.text}"
        data = response.json()
        assert data["user"]["user_code"] == "empleado1"
        assert data["user"]["role"] == "empleado"
        print("PASS: empleado1 login successful")
