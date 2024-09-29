# test_file.py

import pytest
from file import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_index_route(client):
    """Test if the root URL (/) returns status code 200 and renders 'index.html'."""
    response = client.get('/')
    assert response.status_code == 200
    assert b'<!DOCTYPE html>' in response.data  # Check if HTML content is returned
