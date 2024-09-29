# test_file.py

import pytest
from file import app

# Fixture to initialize the test client
@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


# Test for the index route
def test_index_route(client):
    """Test if the root URL (/) returns status code 200 and renders 'index.html'."""
    response = client.get('/')
    assert response.status_code == 200
    assert b'<!DOCTYPE html>' in response.data  # Check if the HTML structure is present

