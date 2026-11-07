# Sky3D Weather Forecasting

A responsive weather website with a Three.js animated atmosphere, Flask backend, and live Open-Meteo weather data.

## Features
- Live current weather, humidity, wind, precipitation and cloud cover
- Animated 3D particle atmosphere for rain, snow, storm, fog, clouds and clear conditions
- City search and browser geolocation
- Hourly forecast and 5-day forecast
- Celsius / Fahrenheit toggle
- Responsive layout for phones and desktops

## Requirements
- Python 3.9+
- Internet connection (weather API and Three.js CDN)

## Run on Windows
1. Extract the ZIP file.
2. Open the extracted `sky3d_weather` folder.
3. Click the address bar in File Explorer, type `cmd`, and press Enter.
4. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
5. Activate it:
   ```bash
   venv\Scripts\activate
   ```
6. Install packages:
   ```bash
   pip install -r requirements.txt
   ```
7. Start the website:
   ```bash
   python app.py
   ```
8. Open this address in Chrome:
   `http://127.0.0.1:5000`

## Weather data
Uses Open-Meteo forecast and geocoding APIs. No API key is required for normal non-commercial use. Review Open-Meteo's current terms and attribution requirements before public/commercial deployment.

## Important notes
- The 3D rain/snow/cloud particles are visual simulations driven by real forecast codes. They are not a live camera feed or a photorealistic digital twin of the user's street.
- Browser location access generally requires HTTPS after deployment (localhost works for development).
- `debug=True` is for local development only. Disable debug mode in production.
- For deployment, use a production WSGI server such as Gunicorn (Linux hosting) or Waitress (Windows), set a secure configuration, and deploy behind HTTPS.
