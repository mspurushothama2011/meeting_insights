import requests
import sys

def test_summary():
    text = "Team Meeting. Date: 2023-10-27. Attendees: Alice, Bob. Alice: Let's discuss the roadmap. Bob: I think we should delay the release by one week to fix the critical bugs. Alice: Agreed. Action item: Bob to fix bugs by Friday."
    
    try:
        response = requests.post(
            "http://localhost:8000/summarize",
            data={"text": text}
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_summary()
