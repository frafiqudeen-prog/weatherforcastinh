import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const $ = id => document.getElementById(id);
let currentUnit = 'C', lastWeather = null, currentPlace = {name:'Madurai', country:'India', latitude:9.9252, longitude:78.1198};
const descriptions = {0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Foggy',48:'Rime fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',56:'Freezing drizzle',57:'Freezing drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Heavy freezing rain',71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Rain showers',81:'Rain showers',82:'Heavy rain showers',85:'Snow showers',86:'Heavy snow showers',95:'Thunderstorm',96:'Thunderstorm with hail',99:'Thunderstorm with hail'};
const emoji = code => code===0?'☀️':[1,2,3].includes(code)?'⛅':[45,48].includes(code)?'🌫️':[51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)?'🌧️':[71,73,75,77,85,86].includes(code)?'❄️':code>=95?'⛈️':'☁️';
const label = code => descriptions[code] || 'Variable conditions';
const temp = n => currentUnit==='C' ? Math.round(n) : Math.round(n*9/5+32);
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2600)}
function timeLabel(iso){return new Date(iso).toLocaleTimeString([], {hour:'numeric'});}
function dateLabel(iso){return new Date(iso+'T12:00:00').toLocaleDateString([], {weekday:'short'});}
async function getWeather(place){
  $('condition').textContent='Fetching conditions...';
  try{
    const r=await fetch(`/api/weather?lat=${place.latitude}&lon=${place.longitude}`);
    const data=await r.json(); if(!r.ok) throw new Error(data.error||'Weather unavailable');
    lastWeather=data;currentPlace=place;render(data,place);setAtmosphere(data.current.weather_code,data.current.is_day);
  }catch(e){toast(e.message)}
}
function render(data,place){
  const c=data.current, d=data.daily;
  $('placeName').textContent=[place.name,place.country].filter(Boolean).join(', ');
  $('localTime').textContent='Local time · '+new Date().toLocaleString([], {weekday:'long',hour:'numeric',minute:'2-digit'});
  $('temperature').textContent=temp(c.temperature_2m);$('degree').textContent='°'+currentUnit;
  $('condition').textContent=label(c.weather_code);$('feels').textContent=temp(c.apparent_temperature)+'°';
  $('humidity').textContent=c.relative_humidity_2m+'%';$('wind').textContent=Math.round(c.wind_speed_10m)+' km/h';
  $('rain').textContent=(c.precipitation??0).toFixed(1)+' mm';$('cloud').textContent=c.cloud_cover+'%';
  $('updated').textContent='Updated just now · '+(data.timezone||'Local timezone');
  $('sceneCondition').textContent=label(c.weather_code).toUpperCase();$('weatherEmoji').textContent=emoji(c.weather_code);
  $('sceneTitle').textContent=label(c.weather_code);$('sceneSubtitle').textContent=`${temp(c.temperature_2m)}° · ${c.relative_humidity_2m}% humidity`;
  const now=new Date();let start=data.hourly.time.findIndex(t=>new Date(t)>=now);if(start<0)start=0;
  $('hourlyList').innerHTML=data.hourly.time.slice(start,start+12).map((t,i)=>{let k=start+i;return `<div class="hour-card"><small>${i===0?'Now':timeLabel(t)}</small><div class="hour-icon">${emoji(data.hourly.weather_code[k])}</div><strong>${temp(data.hourly.temperature_2m[k])}°</strong><div class="rain-chance">${data.hourly.precipitation_probability[k]??0}% rain</div></div>`}).join('');
  $('dailyGrid').innerHTML=d.time.map((day,i)=>`<div class="day-card"><small>${i===0?'Today':dateLabel(day)}</small><div class="day-icon">${emoji(d.weather_code[i])}</div><strong>${label(d.weather_code[i])}</strong><div class="range">${temp(d.temperature_2m_max[i])}° / ${temp(d.temperature_2m_min[i])}°</div><small>${d.precipitation_probability_max[i]??0}% rain</small></div>`).join('');
}
$('searchBtn').addEventListener('click',async()=>{
  const city=$('cityInput').value.trim();if(!city)return toast('Enter a city name');
  $('searchBtn').textContent='Searching...';
  try{const r=await fetch('/api/search?city='+encodeURIComponent(city));const p=await r.json();if(!r.ok)throw new Error(p.error);await getWeather(p)}
  catch(e){toast(e.message)}finally{$('searchBtn').innerHTML='Explore <span>↗</span>'}
});
$('cityInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('searchBtn').click()});
$('locationBtn').addEventListener('click',()=>{
  if(!navigator.geolocation)return toast('Location is not supported by this browser');
  navigator.geolocation.getCurrentPosition(async pos=>{const p={latitude:pos.coords.latitude,longitude:pos.coords.longitude,name:'Your location',country:''};await getWeather(p)},()=>toast('Please allow location access in your browser'),{enableHighAccuracy:true,timeout:10000});
});
$('unitToggle').addEventListener('click',()=>{currentUnit=currentUnit==='C'?'F':'C';$('unitToggle').innerHTML=currentUnit==='C'?'°C <span>/ °F</span>':'°F <span>/ °C</span>';if(lastWeather)render(lastWeather,currentPlace)});

// Three.js particle atmosphere: animated particles are a visual representation of the forecast.
// ADVANCED 3D WEATHER SCENE
// Rain, Snow, Clouds, Lightning, Sun Rays and Wet Ground

let scene, camera, renderer, clock;
let clouds = [];
let rainField, snowField;
let rainGeometry, snowGeometry;
let splashRings = [];
let sunGroup, lightningLight, ground;
let weatherType = "cloud";
let nextLightning = 0;

function createCloud(x, y, z, scale) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.userData.originalX = x;

    const material = new THREE.MeshStandardMaterial({
        color: 0xc8ddeb,
        roughness: 1,
        transparent: true,
        opacity: 0.9
    });

    const parts = [
        [0, 0, 0, 0.7],
        [0.55, 0.1, 0, 0.55],
        [-0.55, 0.05, 0, 0.55],
        [0.1, 0.35, 0, 0.55]
    ];

    parts.forEach(([x, y, z, size]) => {
        const puff = new THREE.Mesh(
            new THREE.SphereGeometry(size, 20, 16),
            material
        );

        puff.position.set(x, y, z);
        puff.scale.y = 0.65;
        group.add(puff);
    });

    group.scale.setScalar(scale);
    scene.add(group);
    clouds.push(group);
}

function createRain() {
    const count = 900;
    const positions = new Float32Array(count * 6);

    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 12;
        const y = Math.random() * 9;
        const z = (Math.random() - 0.5) * 7;

        positions[i * 6] = x;
        positions[i * 6 + 1] = y;
        positions[i * 6 + 2] = z;

        positions[i * 6 + 3] = x + 0.025;
        positions[i * 6 + 4] = y - 0.22;
        positions[i * 6 + 5] = z;
    }

    rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
    );

    rainField = new THREE.LineSegments(
        rainGeometry,
        new THREE.LineBasicMaterial({
            color: 0xa8eaff,
            transparent: true,
            opacity: 0.85
        })
    );

    rainField.visible = false;
    scene.add(rainField);
}

function createSnow() {
    const count = 450;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 12;
        positions[i * 3 + 1] = Math.random() * 9;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 7;
    }

    snowGeometry = new THREE.BufferGeometry();
    snowGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
    );

    snowField = new THREE.Points(
        snowGeometry,
        new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.09,
            transparent: true,
            opacity: 0.9
        })
    );

    snowField.visible = false;
    scene.add(snowField);
}

function createSun() {
    sunGroup = new THREE.Group();
    sunGroup.position.set(2.5, 2.2, -2);
    scene.add(sunGroup);

    const sunBall = new THREE.Mesh(
        new THREE.SphereGeometry(0.65, 32, 24),
        new THREE.MeshBasicMaterial({ color: 0xffd77a })
    );

    sunGroup.add(sunBall);

    const glow = new THREE.Mesh(
        new THREE.SphereGeometry(1.1, 24, 20),
        new THREE.MeshBasicMaterial({
            color: 0xffc66d,
            transparent: true,
            opacity: 0.13
        })
    );

    sunGroup.add(glow);

    // Sun rays
    for (let i = 0; i < 18; i++) {
        const angle = i * Math.PI / 9;

        const ray = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.05, 1, 8),
            new THREE.MeshBasicMaterial({
                color: 0xffd77a,
                transparent: true,
                opacity: 0.5
            })
        );

        ray.position.set(
            Math.cos(angle) * 1.15,
            Math.sin(angle) * 1.15,
            0
        );

        ray.rotation.z = -angle + Math.PI / 2;
        sunGroup.add(ray);
    }
}

function createGround() {
    const geometry = new THREE.CircleGeometry(7, 64);

    const material = new THREE.MeshStandardMaterial({
        color: 0x183b50,
        roughness: 0.2,
        metalness: 0.6
    });

    ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.5;

    scene.add(ground);

    // Water splash rings
    for (let i = 0; i < 20; i++) {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.04, 0.12, 24),
            new THREE.MeshBasicMaterial({
                color: 0x9deaff,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            })
        );

        ring.rotation.x = -Math.PI / 2;
        ring.position.set(
            (Math.random() - 0.5) * 9,
            -1.43,
            (Math.random() - 0.5) * 5
        );

        ring.userData.phase = Math.random();
        ring.visible = false;

        scene.add(ring);
        splashRings.push(ring);
    }
}

function initScene() {
    const canvas = $("weatherCanvas");

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        50, 1, 0.1, 100
    );

    camera.position.set(0, 1.5, 9);

    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
    });

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

    clock = new THREE.Clock();

    scene.add(
        new THREE.HemisphereLight(0xc6eaff, 0x1b2d40, 1.5)
    );

    const sunlight = new THREE.DirectionalLight(0xe0f4ff, 2);
    sunlight.position.set(-4, 7, 5);
    scene.add(sunlight);

    lightningLight = new THREE.PointLight(0xb9d8ff, 0, 20);
    lightningLight.position.set(1, 5, 0);
    scene.add(lightningLight);

    createGround();
    createCloud(-3, 2, -2, 0.8);
    createCloud(0, 1.8, -1.5, 1.1);
    createCloud(3, 2.2, -2, 0.8);
    createRain();
    createSnow();
    createSun();

    resizeScene();
    window.addEventListener("resize", resizeScene);

    animate();
}

function setAtmosphere(code, isDay) {
    if (!scene) return;

    if ([95, 96, 99].includes(code)) {
        weatherType = "storm";
    } else if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) {
        weatherType = "rain";
    } else if ([71,73,75,77,85,86].includes(code)) {
        weatherType = "snow";
    } else if ([45,48].includes(code)) {
        weatherType = "fog";
    } else if ([0,1].includes(code)) {
        weatherType = "sun";
    } else {
        weatherType = "cloud";
    }

    rainField.visible =
        weatherType === "rain" || weatherType === "storm";

    snowField.visible = weatherType === "snow";

    clouds.forEach((cloud, index) => {
        cloud.visible = weatherType !== "sun" || index === 0;

        cloud.children.forEach(part => {
            part.material.color.set(
                weatherType === "storm" ? 0x53677f :
                weatherType === "rain" ? 0x8da7bb :
                0xd0e2ef
            );
        });
    });

    sunGroup.visible = weatherType === "sun" || weatherType === "cloud";

    ground.material.roughness =
        weatherType === "rain" || weatherType === "storm" ? 0.12 : 0.55;

    ground.material.metalness =
        weatherType === "rain" || weatherType === "storm" ? 0.75 : 0.25;

    ground.material.color.set(
        weatherType === "rain" || weatherType === "storm" ? 0x123c56 :
        weatherType === "snow" ? 0x829eaf :
        0x253b52
    );

    splashRings.forEach(ring => {
        ring.visible =
            weatherType === "rain" || weatherType === "storm";
    });

    $("scene").style.background =
        weatherType === "storm"
        ? "linear-gradient(#111d35,#344b65,#15283a)"
        : weatherType === "rain"
        ? "linear-gradient(#203e59,#648697,#17384c)"
        : weatherType === "snow"
        ? "linear-gradient(#7898ad,#c1d5df,#526e80)"
        : "linear-gradient(#183c5d,#386d8c,#18364c)";
}

function updateRain(delta) {
    const positions = rainGeometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 6) {
        positions[i + 1] -= 13 * delta;
        positions[i + 4] -= 13 * delta;

        if (positions[i + 1] < -1.5) {
            const x = (Math.random() - 0.5) * 12;
            positions[i] = x;
            positions[i + 1] = 7;
            positions[i + 3] = x + 0.025;
            positions[i + 4] = 6.78;
        }
    }

    rainGeometry.attributes.position.needsUpdate = true;
}

function updateSnow(delta) {
    const positions = snowGeometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 1.2 * delta;
        positions[i] += Math.sin(clock.elapsedTime + i) * 0.002;

        if (positions[i + 1] < -1.5) {
            positions[i + 1] = 7;
        }
    }

    snowGeometry.attributes.position.needsUpdate = true;
}

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.04);
    const time = clock.elapsedTime;

    // Moving clouds
    clouds.forEach((cloud, i) => {
        cloud.position.x =
            cloud.userData.originalX + Math.sin(time * 0.18 + i) * 0.3;
    });

    // Sun movement
    sunGroup.rotation.z = time * 0.06;

    if (rainField.visible) updateRain(delta);
    if (snowField.visible) updateSnow(delta);

    // Expanding water splash rings
    splashRings.forEach((ring, i) => {
        if (!ring.visible) return;

        ring.userData.phase += delta;
        const phase = ring.userData.phase % 1;

        ring.scale.setScalar(0.4 + phase * 2);
        ring.material.opacity = (1 - phase) * 0.6;

        if (phase < 0.02) {
            ring.position.x = (Math.random() - 0.5) * 9;
            ring.position.z = (Math.random() - 0.5) * 5;
        }
    });

    // Random lightning flashes
    if (weatherType === "storm") {
        if (time > nextLightning) {
            lightningLight.intensity = 12;
            nextLightning = time + 3 + Math.random() * 4;

            setTimeout(() => {
                if (lightningLight) lightningLight.intensity = 0;
            }, 120);
        }
    } else {
        lightningLight.intensity = 0;
    }

    camera.lookAt(0, 0.4, 0);
    renderer.render(scene, camera);
}

function resizeScene() {
    if (!renderer) return;

    const canvas = $("weatherCanvas");
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

// Start the 3D weather scene
initScene();
getWeather(currentPlace);
