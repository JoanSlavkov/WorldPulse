document.getElementById("date").innerText =
  new Date().toDateString();

/* -----------------------------
   NEWS SOURCES
------------------------------*/
const FEEDS = {
  bbc: "https://feeds.bbci.co.uk/news/world/rss.xml",
  aljazeera: "https://www.aljazeera.com/xml/rss/all.xml",
  france24: "https://www.france24.com/en/rss",
  dw: "https://rss.dw.com/rdf/rss-en-world"
};

/* -----------------------------
   FETCH RSS
------------------------------*/
async function fetchFeed(url) {
  try {
    const res = await fetch(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`
    );

    const data = await res.json();
    return (data.items || []).slice(0, 5);

  } catch {
    return [];
  }
}

/* -----------------------------
   RENDER NEWS
------------------------------*/
function render(id, items) {
  const el = document.getElementById(id);

  if (!items.length) {
    el.innerHTML = "<div class='news-item'>Failed to load</div>";
    return;
  }

  el.innerHTML = items.map(i => `
    <div class="news-item">
      <a href="${i.link}" target="_blank" rel="noopener noreferrer">
        ${i.title}
      </a>
    </div>
  `).join("");
}

/* -----------------------------
   WEATHER
------------------------------*/
function getWeatherLabel(code) {
  if (code === 0) return "☀️ Sunny";
  if (code <= 3) return "⛅ Partly Cloudy";
  if (code <= 48) return "🌫️ Foggy";
  if (code <= 67) return "🌧️ Rain";
  if (code <= 77) return "❄️ Snow";
  if (code <= 82) return "🌧️ Showers";
  if (code <= 99) return "⛈️ Storm";
  return "🌡️ Unknown";
}

async function loadWeather() {
  const el = document.getElementById("weather");
  el.innerHTML = "Loading...";

  navigator.geolocation.getCurrentPosition(async (pos) => {

    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    let location = "Your location";

    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );

      const data = await geo.json();

      location =
        (data.address.city ||
         data.address.town ||
         data.address.village ||
         "") + ", " +
        (data.address.country || "");

    } catch {}

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weathercode` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
      `&timezone=auto`
    );

    const w = await res.json();

    const temp = w.current.temperature_2m;
    const code = w.current.weathercode;

    const max = w.daily.temperature_2m_max[0];
    const min = w.daily.temperature_2m_min[0];
    const rainChance = w.daily.precipitation_probability_max?.[0] || 0;

    const condition = getWeatherLabel(code);

    el.innerHTML = `
      <div class="news-item">📍 ${location}</div>
      <div class="news-item">${condition}</div>
      <div class="news-item">🌡️ Current: ${temp}°C</div>
      <div class="news-item">⬆️ High: ${max}°C</div>
      <div class="news-item">⬇️ Low: ${min}°C</div>
      <div class="news-item">🌧️ Rain chance: ${rainChance}%</div>
    `;

  }, () => {
    el.innerHTML = "Location blocked";
  });
}

/* -----------------------------
   FX (FIXED BASE CURRENCY)
------------------------------*/
function getPrev() {
  return JSON.parse(localStorage.getItem("fx") || "{}");
}

function save(curr) {
  localStorage.setItem("fx", JSON.stringify(curr));
}

function signal(prev, cur) {
  if (!prev) return "➖";
  if (cur > prev) return "📈";
  if (cur < prev) return "📉";
  return "➖";
}

async function loadFX() {

  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  const data = await res.json();

  const r = data.rates;
  const base = data.base_code;

  const prev = getPrev();

  const curr = {
    EUR: r.EUR,
    GBP: r.GBP,
    JPY: r.JPY,
    CHF: r.CHF,
    CAD: r.CAD,
    AUD: r.AUD,
    CNY: r.CNY,
    INR: r.INR,
    PLN: r.PLN
  };

  // update title dynamically
  document.getElementById("fx-title").innerText =
    `💱 Currency Exchange (Base: ${base})`;

  document.getElementById("fx").innerHTML = `
    <div class="news-item" style="opacity:0.7; font-size:12px;">
      Base currency: <strong>${base}</strong>
    </div>

    <div class="news-item">EUR ${curr.EUR.toFixed(2)} ${signal(prev.EUR, curr.EUR)}</div>
    <div class="news-item">GBP ${curr.GBP.toFixed(2)} ${signal(prev.GBP, curr.GBP)}</div>
    <div class="news-item">JPY ${curr.JPY.toFixed(2)} ${signal(prev.JPY, curr.JPY)}</div>
    <div class="news-item">CHF ${curr.CHF.toFixed(2)} ${signal(prev.CHF, curr.CHF)}</div>
    <div class="news-item">CAD ${curr.CAD.toFixed(2)} ${signal(prev.CAD, curr.CAD)}</div>
    <div class="news-item">AUD ${curr.AUD.toFixed(2)} ${signal(prev.AUD, curr.AUD)}</div>
    <div class="news-item">CNY ${curr.CNY.toFixed(2)} ${signal(prev.CNY, curr.CNY)}</div>
    <div class="news-item">INR ${curr.INR.toFixed(2)} ${signal(prev.INR, curr.INR)}</div>
    <div class="news-item">PLN ${curr.PLN.toFixed(2)} ${signal(prev.PLN, curr.PLN)}</div>
  `;

  save(curr);
}

/* -----------------------------
   NEWS
------------------------------*/
async function loadNews() {

  const [bbc, aljazeera, france24, dw] = await Promise.all([
    fetchFeed(FEEDS.bbc),
    fetchFeed(FEEDS.aljazeera),
    fetchFeed(FEEDS.france24),
    fetchFeed(FEEDS.dw)
  ]);

  render("bbc", bbc);
  render("aljazeera", aljazeera);
  render("france24", france24);
  render("dw", dw);
}

/* -----------------------------
   REFRESH
------------------------------*/
async function refreshAll() {
  await loadNews();
  await loadWeather();
  await loadFX();
}

refreshAll();