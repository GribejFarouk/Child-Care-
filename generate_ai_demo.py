import requests
import uuid

# Base URLs for local dev
AUTH_URL = "http://localhost:8001"
PROFILES_URL = "http://localhost:8002"
MEASUREMENTS_URL = "http://localhost:8003"
ANALYTICS_URL = "http://localhost:8004"

def main():
    print("Log in as demo parent...")
    resp = requests.post(f"{AUTH_URL}/api/auth/login/", json={
        "email": "parent.demo@childcare.test",
        "password": "Demo1234!"
    })
    
    if resp.status_code != 200:
        print("Login failed!", resp.text)
        return
    
    token = resp.json()['tokens']['access']
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Fetching children...")
    resp = requests.get(f"{PROFILES_URL}/api/profiles/children/", headers=headers)
    children = resp.json()
    if not children:
        print("No children found. Please run profile seeding first.")
        return
        
    child_id = children[0]['id']
    sex = children[0].get('sex', 'M')
    print(f"Using child {child_id} ({sex})")
    
    print("Generating Normal Measurement (Recommendation will be normal)...")
    # Normal 12 months male: 9.6 kg, 75 cm, 46 cm
    normal_m = {
        "child_id": child_id,
        "date_recorded": "2024-05-01",
        "weight_kg": 9.6,
        "height_cm": 75.0,
        "head_circumference_cm": 46.0
    }
    resp = requests.post(f"{MEASUREMENTS_URL}/api/measurements/", json=normal_m, headers=headers)
    if resp.status_code != 201:
        print("Failed to create normal measurement", resp.text)
        return
    m1 = resp.json()
    
    print("Triggering Analytics for Normal Measurement...")
    analyze_payload_1 = {
        "child_id": child_id,
        "measurement_id": m1['id'],
        "weight_kg": m1['weight_kg'],
        "height_cm": m1['height_cm'],
        "bmi": m1.get('bmi'),
        "head_circumference_cm": m1['head_circumference_cm'],
        "age_at_recording_months": 12,
        "sex": sex
    }
    requests.post(f"{ANALYTICS_URL}/api/analytics/measurements/analyze/", json=analyze_payload_1, headers=headers)
    
    print("Generating Abnormal Measurement (BMI high -> Elevated Risk Recommendation)...")
    # Abnormal 18 months male: 15.0 kg (high), 80 cm, 48 cm -> BMI high
    abnormal_m = {
        "child_id": child_id,
        "date_recorded": "2024-11-01",
        "weight_kg": 15.0,
        "height_cm": 80.0,
        "head_circumference_cm": 48.0
    }
    resp = requests.post(f"{MEASUREMENTS_URL}/api/measurements/", json=abnormal_m, headers=headers)
    if resp.status_code != 201:
        print("Failed to create abnormal measurement", resp.text)
        return
    m2 = resp.json()
    
    print("Triggering Analytics for Abnormal Measurement...")
    analyze_payload_2 = {
        "child_id": child_id,
        "measurement_id": m2['id'],
        "weight_kg": m2['weight_kg'],
        "height_cm": m2['height_cm'],
        "bmi": m2.get('bmi'),
        "head_circumference_cm": m2['head_circumference_cm'],
        "age_at_recording_months": 18,
        "sex": sex
    }
    requests.post(f"{ANALYTICS_URL}/api/analytics/measurements/analyze/", json=analyze_payload_2, headers=headers)
    
    print("Demo recommendations generated successfully!")

if __name__ == "__main__":
    main()
