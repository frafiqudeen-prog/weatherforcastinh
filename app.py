from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)
BASE = "https://api.open-meteo.com/v1"

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/search")
def search_city():
    city = request.args.get("city", "").strip()
    if not city:
        return jsonify({"error": "Enter a city name"}), 400
    try:
        r = requests.get("https://geocoding-api.open-meteo.com/v1/search",
                         params={"name": city, "count": 1, "language": "en", "format": "json"},
                         timeout=12)
        r.raise_for_status()
        results = r.json().get("results", [])
        if not results:
            return jsonify({"error": "City not found. Try another name."}), 404
        place = results[0]
        return jsonify({"name": place["name"], "country": place.get("country", ""),
                        "latitude": place["latitude"], "longitude": place["longitude"]})
    except requests.RequestException:
        return jsonify({"error": "Weather service is temporarily unavailable."}), 502

@app.route("/api/weather")
def weather():
    try:
        lat = float(request.args["lat"])
        lon = float(request.args["lon"])
    except (KeyError, ValueError):
        return jsonify({"error": "Valid latitude and longitude are required"}), 400

    params = {
        "latitude": lat, "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m",
        "hourly": "temperature_2m,precipitation_probability,weather_code",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max",
        "forecast_days": 5, "timezone": "auto"
    }
    try:
        r = requests.get(f"{BASE}/forecast", params=params, timeout=15)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.RequestException:
        return jsonify({"error": "Could not fetch weather data. Please try again."}), 502

if __name__ == "__main__":
    app.run(debug=True)
