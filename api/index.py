"""
"""
Zero Waste Smart Food Supply Chain - FastAPI Backend
=====================================================
A hackathon-ready backend that uses AI/rule-based logic to:
- Predict food expiry and suggest actions
- Forecast demand for food items
- Match surplus food with nearby NGOs
- Suggest smart pricing based on expiry
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import math
import random

# ─────────────────────────────────────────────
# App Setup
# ─────────────────────────────────────────────
app = FastAPI(
    title="Zero Waste Smart Food Supply Chain API",
    description="AI-powered API to reduce food waste through smart predictions and redistribution.",
    version="2.0.0"
)

# Allow all origins for hackathon demo (frontend can be on any port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Sample Data / Knowledge Base
# ─────────────────────────────────────────────

# Base expiry durations (in days) for common food items
EXPIRY_DATABASE = {
   
    # Dairy
    "milk": 7, "curd": 5, "butter": 30, "paneer": 4, "cheese": 30,

    # Grains & Staples
    "rice": 365, "wheat": 365, "flour": 180, "dal": 180,
    "lentils": 180, "oats": 180, "poha": 120,

    # Cooked staple foods (IMPORTANT for surplus)
    "cooked rice": 2, "roti": 1, "chapati": 1,
    "cooked dal": 2, "vegetable curry": 2,
    "khichdi": 1, "upma": 1, "idli": 2, "dosa batter": 3,

    # Vegetables
    "potato": 60, "onion": 45, "tomato": 7, "carrot": 21,
    "cabbage": 14, "cauliflower": 10, "spinach": 5,
    "capsicum": 7, "brinjal": 7, "peas": 10,

    # Fruits
    "banana": 6, "apple": 14, "orange": 14,
    "mango": 7, "papaya": 5, "grapes": 7,
    "watermelon": 5, "pineapple": 7,

    # Protein (veg + non-veg)
    "eggs": 21, "chicken": 3, "fish": 2,
    "tofu": 5, "soy chunks": 180,

    # Bakery (allowed)
    "bread": 5, "pav": 3, "bun": 3,

    # Desserts (allowed)
    "cake": 3, "pastry": 2, "kheer": 2,
    "halwa": 2, "gulab jamun": 3
}
ALLOWED_ITEMS = set(EXPIRY_DATABASE.keys())
# Demand patterns per item (base demand score 1–100)
DEMAND_DATABASE = {
    "rice": 85, "wheat": 80, "dal": 85,
    "cooked rice": 95, "roti": 95, "chapati": 95,
    "vegetable curry": 90, "khichdi": 85,
    "idli": 80, "upma": 75,

    "potato": 80, "onion": 75, "tomato": 70,
    "spinach": 60, "cabbage": 55,

    "banana": 70, "apple": 65, "orange": 60,

    "eggs": 80, "chicken": 75, "fish": 70,

    "bread": 85, "pav": 75,

    "cake": 50, "pastry": 45, "halwa": 60

       "butter": 50,
    "lettuce": 35,
}

# Sample NGO data (name, lat, lon, need_level)
NGO_DATABASE = [
    {"name": "Hunger Relief Foundation", "lat": 23.0225, "lon": 72.5714, "need_level": "high"},
    {"name": "City Food Bank",           "lat": 23.0300, "lon": 72.5800, "need_level": "medium"},
    {"name": "Community Kitchen Trust",  "lat": 22.9900, "lon": 72.5600, "need_level": "high"},
    {"name": "Green Plate Initiative",   "lat": 23.0400, "lon": 72.5500, "need_level": "low"},
    {"name": "Village Aid Society",      "lat": 23.0100, "lon": 72.6000, "need_level": "medium"},
    {"name": "Feed the Future NGO",      "lat": 23.0500, "lon": 72.5300, "need_level": "high"},
    {"name": "Annapurna Seva Trust",     "lat": 23.0150, "lon": 72.5650, "need_level": "medium"},
]

# Surplus food source locations (restaurants, stores, warehouses)
# Each entry has: name, lat, lon, surplus_level, category, available_items
SURPLUS_LOCATIONS = 
    {
        "name": "Annapurna Mess",
        "lat": 23.025,
        "lon": 72.57,
        "category": "restaurant",
        "food_type": "veg",
        "cuisine": "indian",
        "surplus_level": "high",
        "available_items": ["roti", "cooked rice", "dal", "vegetable curry"],
        "contact": "+91-9800000001"
    },
    {
        "name": "Shreeji Tiffin Service",
        "lat": 23.03,
        "lon": 72.58,
        "category": "tiffin",
        "food_type": "veg",
        "cuisine": "home-style",
        "surplus_level": "medium",
        "available_items": ["chapati", "sabzi", "dal", "khichdi"],
        "contact": "+91-9800000002"
    },
    {
        "name": "City Vegetable Market",
        "lat": 23.01,
        "lon": 72.56,
        "category": "market",
        "food_type": "veg",
        "cuisine": "raw",
        "surplus_level": "high",
        "available_items": ["potato", "onion", "tomato", "spinach"],
        "contact": "+91-9800000003"
    },
    {
        "name": "Dairy Supply Center",
        "lat": 23.035,
        "lon": 72.575,
        "category": "dairy",
        "food_type": "veg",
        "cuisine": "dairy",
        "surplus_level": "medium",
        "available_items": ["milk", "curd", "paneer"],
        "contact": "+91-9800000004"
    },
    {
        "name": "Bakery Delight",
        "lat": 23.022,
        "lon": 72.582,
        "category": "bakery",
        "food_type": "veg",
        "cuisine": "bakery",
        "surplus_level": "low",
        "available_items": ["bread", "cake", "pastry"],
        "contact": "+91-9800000005"
    }

    {
        "name": "Restaurant A",
        "lat": 23.025,
        "lon": 72.57,
        "surplus_level": "high",
        "category": "restaurant",
        "available_items": ["rice", "bread", "cooked meals"],
        "contact": "+91-98000-00001"
    },
    {
        "name": "Supermarket B",
        "lat": 23.03,
        "lon": 72.58,
        "surplus_level": "medium",
        "category": "supermarket",
        "available_items": ["milk", "yogurt", "vegetables", "fruits"],
        "contact": "+91-98000-00002"
    },
    {
        "name": "Warehouse C",
        "lat": 23.01,
        "lon": 72.56,
        "surplus_level": "high",
        "category": "warehouse",
        "available_items": ["rice", "wheat", "pulses", "canned goods"],
        "contact": "+91-98000-00003"
    },
    {
        "name": "Hotel Grand Kitchen",
        "lat": 23.035,
        "lon": 72.575,
        "surplus_level": "medium",
        "category": "restaurant",
        "available_items": ["cooked meals", "bread", "salads"],
        "contact": "+91-98000-00004"
    },
    {
        "name": "Fresh Mart Store",
        "lat": 23.015,
        "lon": 72.565,
        "surplus_level": "low",
        "category": "supermarket",
        "available_items": ["fruits", "vegetables", "dairy"],
        "contact": "+91-98000-00005"
    },
    {
        "name": "City Cold Storage",
        "lat": 23.045,
        "lon": 72.555,
        "surplus_level": "high",
        "category": "warehouse",
        "available_items": ["frozen foods", "meat", "fish", "dairy"],
        "contact": "+91-98000-00006"
    },
    {
        "name": "Bakery Delight",
        "lat": 23.022,
        "lon": 72.582,
        "surplus_level": "medium",
        "category": "restaurant",
        "available_items": ["bread", "cakes", "pastries", "biscuits"],
        "contact": "+91-98000-00007"
    },
]

# Urgency priority map — used to sort NGOs by need level (high first)
NEED_PRIORITY = {"high": 3, "medium": 2, "low": 1}

# Base prices (in INR) for items
BASE_PRICES = {
    "milk": 60,
    "bread": 40,
    "eggs": 80,
    "chicken": 200,
    "rice": 50,
    "banana": 30,
    "apple": 120,
    "yogurt": 45,
    "cheese": 250,
    "tomato": 40,
    "spinach": 30,
    "potato": 25,
    "onion": 35,
    "carrot": 40,
    "orange": 80,
    "fish": 180,
    "beef": 300,
    "butter": 55,
    "lettuce": 35,
}

DEFAULT_PRICE = 100  # fallback if item not found


# ─────────────────────────────────────────────
# Utility Functions
# ─────────────────────────────────────────────

def normalize_item(item_name: str) -> str:
    """Lowercase and strip whitespace from item name."""
    return item_name.strip().lower()


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate straight-line distance (km) between two GPS coordinates
    using the Haversine formula.
    """
    R = 6371  # Earth's radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_combined_action(expiry_days: int, demand_level: str) -> str:
    """
    BONUS: Combine expiry + demand to suggest the best action.
    Logic matrix:
    - Expiry soon (<=3 days) + low demand   → Donate
    - Expiry soon (<=3 days) + medium demand → Discount heavily
    - Expiry soon (<=3 days) + high demand   → Discount slightly
    - Expiry moderate (4–7) + any demand     → Discount
    - Expiry fine (>7 days)                  → Sell at full price
    """
    if expiry_days <= 3:
        if demand_level == "low":
            return "Donate"
        elif demand_level == "medium":
            return "Discount heavily (30–50%)"
        else:
            return "Discount slightly (10–20%)"
    elif expiry_days <= 7:
        return "Discount (15–30%)"
    else:
        return "Sell at full price"


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@app.get("/")
def root():
    """Health check / welcome endpoint."""
    return {
        "message": "Zero Waste Smart Food Supply Chain API is running!",
        "version": "2.0.0",
        "endpoints": [
            "/predict-expiry",
            "/forecast-demand",
            "/match-ngo",
            "/smart-pricing",
            "/combined-action",
            "/map-data"         # NEW: unified map endpoint
        ]
    }


@app.get("/predict-expiry")
def predict_expiry(item: str = Query(..., description="Name of the food item (e.g., milk, bread)")):
    """
    Predict how many days until a food item expires,
    and suggest whether to use it, discount it, or donate it.

    Logic:
    - Look up base expiry from database
    - Add slight randomness to simulate real-world variance
    - Map expiry range → suggestion
    """
    validate_food_item(key)
    key = normalize_item(item)
    base_days = EXPIRY_DATABASE.get(key)

    if base_days is None:
        # Fallback for unknown items: estimate 10 days
        base_days = 10

    # Simulate slight variance (±20%) for realism
    variance = random.uniform(-0.2, 0.2)
    predicted_days = max(1, round(base_days * (1 + variance)))

    # Decide suggestion based on expiry window
    if predicted_days <= 2:
        suggestion = "donate"
        reason = "Item is near end of life. Best to donate immediately."
    elif predicted_days <= 5:
        suggestion = "discount"
        reason = "Item expiring soon. Apply discount to move inventory fast."
    else:
        suggestion = "use"
        reason = "Item is fresh. Use or sell normally."

    return {
        "item": key,
        "predicted_expiry_days": predicted_days,
        "suggestion": suggestion,
        "reason": reason
    }


@app.get("/forecast-demand")
def forecast_demand(item: str = Query(..., description="Name of the food item")):
    """
    Forecast demand level and predicted quantity needed for the item.

    Logic:
    - Retrieve base demand score (0–100)
    - Classify into low / medium / high
    - Estimate quantity using demand score
    """
    key = normalize_item(item)
    base_score = DEMAND_DATABASE.get(key, 50)  # default to 50 if unknown

    # Add small noise to simulate daily fluctuation
    noise = random.randint(-10, 10)
    score = max(0, min(100, base_score + noise))

    # Classify demand level
    if score < 40:
        demand_level = "low"
        predicted_quantity = random.randint(10, 30)
    elif score < 70:
        demand_level = "medium"
        predicted_quantity = random.randint(30, 70)
    else:
        demand_level = "high"
        predicted_quantity = random.randint(70, 150)

    return {
        "item": key,
        "demand_score": score,
        "demand_level": demand_level,
        "predicted_quantity_units": predicted_quantity,
        "unit": "kg or packs (context-dependent)"
    }


@app.get("/match-ngo")
def match_ngo(
    latitude: float = Query(..., description="Your latitude (e.g., 23.0225)"),
    longitude: float = Query(..., description="Your longitude (e.g., 72.5714)")
):
    """
    Find the 2–3 nearest NGOs based on GPS coordinates.

    Logic:
    - Calculate Haversine distance from user location to each NGO
    - Sort by distance
    - Return top 3 with name, distance, and need level
    """
    # Compute distance to each NGO
    ngos_with_distance = []
    for ngo in NGO_DATABASE:
        dist = haversine_distance(latitude, longitude, ngo["lat"], ngo["lon"])
        ngos_with_distance.append({
            "name": ngo["name"],
            "distance_km": round(dist, 2),
            "need_level": ngo["need_level"],
            "latitude": ngo["lat"],
            "longitude": ngo["lon"]
        })

    # Sort by distance (nearest first)
    ngos_sorted = sorted(ngos_with_distance, key=lambda x: x["distance_km"])

    return {
        "your_location": {"latitude": latitude, "longitude": longitude},
        "nearby_ngos": ngos_sorted[:3]
    }


@app.get("/smart-pricing")
def smart_pricing(
    item: str = Query(..., description="Name of the food item"),
    expiry_days: int = Query(..., description="Days remaining until expiry", ge=0)
):
    """
    Suggest a discount percentage and final price based on item + expiry days.

    Logic:
    - The fewer days remaining → higher discount
    - Also factor in demand: high-demand items need less discount
    - Combine both signals for a smart discount %
    """
    key = normalize_item(item)
    base_price = BASE_PRICES.get(key, DEFAULT_PRICE)
    base_expiry = EXPIRY_DATABASE.get(key, 10)

    # Expiry ratio: how close to expiry is this item (0 = fresh, 1 = expired)
    expiry_ratio = max(0.0, 1.0 - (expiry_days / base_expiry))

    # Demand score influences discount (high demand = less aggressive discount)
    demand_score = DEMAND_DATABASE.get(key, 50) / 100.0  # normalize to 0–1

    # Discount formula: expiry urgency increases discount, demand reduces it
    raw_discount = expiry_ratio * 60 * (1 - demand_score * 0.4)
    discount_percent = round(min(70, max(0, raw_discount)))  # cap between 0–70%

    final_price = round(base_price * (1 - discount_percent / 100), 2)

    # Determine action recommendation
    if discount_percent == 0:
        action = "Sell at full price"
    elif discount_percent <= 20:
        action = "Apply small discount"
    elif discount_percent <= 40:
        action = "Apply moderate discount"
    else:
        action = "Heavily discount or consider donation"

    return {
        "item": key,
        "expiry_days_remaining": expiry_days,
        "base_price_inr": base_price,
        "discount_percent": discount_percent,
        "final_price_inr": final_price,
        "action": action
    }


@app.get("/combined-action")
def combined_action(
    item: str = Query(..., description="Food item name"),
    expiry_days: int = Query(..., description="Days until expiry", ge=0)
):
    """
    BONUS endpoint: Combine expiry + demand data to give a unified smart action.
    One call, one clear recommendation.
    """
    key = normalize_item(item)

    if key not in EXPIRY_DATABASE:
    	raise HTTPException(
        	status_code=400,
        	detail=f"Unsupported item: {item}. Use basic food items like milk, rice, 		fruits, etc."
    )

    # Reuse demand logic inline
    base_score = DEMAND_DATABASE.get(key, 50)
    noise = random.randint(-5, 5)
    score = max(0, min(100, base_score + noise))
    if score < 40:
        demand_level = "low"
    elif score < 70:
        demand_level = "medium"
    else:
        demand_level = "high"

    # Get combined action recommendation
    recommendation = get_combined_action(expiry_days, demand_level)

    # Also compute price suggestion
    base_price = BASE_PRICES.get(key, DEFAULT_PRICE)
    base_expiry = EXPIRY_DATABASE.get(key, 10)
    expiry_ratio = max(0.0, 1.0 - (expiry_days / base_expiry))
    raw_discount = expiry_ratio * 60 * (1 - (score / 100) * 0.4)
    discount_percent = round(min(70, max(0, raw_discount)))
    final_price = round(base_price * (1 - discount_percent / 100), 2)

    return {
        "item": key,
        "expiry_days_remaining": expiry_days,
        "demand_level": demand_level,
        "demand_score": score,
        "recommended_action": recommendation,
        "discount_percent": discount_percent,
        "final_price_inr": final_price,
        "base_price_inr": base_price
    }


@app.get("/map-data")
def map_data(
    latitude: float = Query(..., description="User's current latitude (e.g., 23.0225)"),
    longitude: float = Query(..., description="User's current longitude (e.g., 72.5714)"),
    radius_km: float = Query(20.0, description="Search radius in km (default: 20)")
):
    """
    Unified map endpoint — returns nearby NGOs and surplus food locations
    in a single frontend-friendly response for Leaflet / Google Maps rendering.

    Logic:
    - Compute Haversine distance from user → every NGO and surplus location
    - Filter by radius_km (optional but useful for dense data)
    - Sort NGOs: nearest first, then by need priority (high > medium > low)
    - Sort surplus: nearest first, then by surplus level (high > medium > low)
    - Return top 3 of each with full map-ready metadata
    - Also return a summary: total counts + urgent matches
    """

    # ── Step 1: Process NGOs ──────────────────────────────────────────────────
    ngos_with_distance = []
    for ngo in NGO_DATABASE:
        dist = haversine_distance(latitude, longitude, ngo["lat"], ngo["lon"])
        if dist <= radius_km:  # only include locations within search radius
            ngos_with_distance.append({
                "name": ngo["name"],
                "type": "ngo",                          # marker type for frontend
                "latitude": ngo["lat"],
                "longitude": ngo["lon"],
                "distance_km": round(dist, 2),
                "need_level": ngo["need_level"],
                "priority_score": NEED_PRIORITY.get(ngo["need_level"], 1),
                "marker_color": _get_ngo_color(ngo["need_level"]),  # frontend hint
                "action_hint": "Accept surplus food donations"
            })

    # Sort: nearest first; ties broken by urgency (higher priority = more urgent)
    ngos_sorted = sorted(
        ngos_with_distance,
        key=lambda x: (x["distance_km"], -x["priority_score"])
    )
    top_ngos = ngos_sorted[:3]

    # ── Step 2: Process Surplus Locations ────────────────────────────────────
    surplus_with_distance = []
    for loc in SURPLUS_LOCATIONS:
        dist = haversine_distance(latitude, longitude, loc["lat"], loc["lon"])
        if dist <= radius_km:
            surplus_with_distance.append({
                "name": loc["name"],
                "type": "surplus",                      # marker type for frontend
                "latitude": loc["lat"],
                "longitude": loc["lon"],
                "distance_km": round(dist, 2),
                "surplus_level": loc["surplus_level"],
                "category": loc["category"],            # restaurant / supermarket / warehouse
                "available_items": loc["available_items"],
                "contact": loc["contact"],
                "priority_score": NEED_PRIORITY.get(loc["surplus_level"], 1),
                "marker_color": _get_surplus_color(loc["surplus_level"]),  # frontend hint
                "action_hint": "Pick up available surplus food"
            })

    # Sort: nearest first; ties broken by surplus level (more surplus = more urgent pickup)
    surplus_sorted = sorted(
        surplus_with_distance,
        key=lambda x: (x["distance_km"], -x["priority_score"])
    )
    top_surplus = surplus_sorted[:3]

    # ── Step 3: Smart Match — pair each surplus to the best NGO ──────────────
    # For each top surplus location, suggest the nearest high-need NGO
    smart_matches = _generate_smart_matches(top_surplus, ngos_sorted)

    # ── Step 4: Build summary stats for dashboard cards ──────────────────────
    high_need_ngos = sum(1 for n in ngos_with_distance if n["need_level"] == "high")
    high_surplus   = sum(1 for s in surplus_with_distance if s["surplus_level"] == "high")

    return {
        # User pin on the map
        "user_location": {
            "latitude": latitude,
            "longitude": longitude,
            "marker_color": "#3B82F6",  # blue
            "label": "You are here"
        },

        # Top 3 nearest NGOs (sorted by distance + urgency)
        "nearby_ngos": top_ngos,

        # Top 3 nearest surplus food sources
        "surplus_locations": top_surplus,

        # AI-suggested redistribution routes
        "smart_matches": smart_matches,

        # Summary stats for frontend dashboard cards
        "summary": {
            "total_ngos_in_radius": len(ngos_with_distance),
            "total_surplus_in_radius": len(surplus_with_distance),
            "high_need_ngos": high_need_ngos,
            "high_surplus_sources": high_surplus,
            "search_radius_km": radius_km,
            "alert": _get_alert_message(high_need_ngos, high_surplus)
        }
    }


# ─────────────────────────────────────────────
# Map Helper Functions
# ─────────────────────────────────────────────

def _get_ngo_color(need_level: str) -> str:
    """Return a hex color for NGO markers based on need urgency."""
    return {"high": "#EF4444", "medium": "#F59E0B", "low": "#22C55E"}.get(need_level, "#6B7280")


def _get_surplus_color(surplus_level: str) -> str:
    """Return a hex color for surplus markers based on surplus availability."""
    return {"high": "#8B5CF6", "medium": "#06B6D4", "low": "#84CC16"}.get(surplus_level, "#6B7280")


def _generate_smart_matches(top_surplus: list, all_ngos: list) -> list:
    """
    For each surplus location, find the best NGO match:
    - Prefer high-need NGOs
    - Among equal need, prefer nearest to the surplus source

    Returns a list of {surplus → ngo} pairing recommendations.
    """
    matches = []
    if not all_ngos:
        return matches

    for surplus in top_surplus:
        # Only suggest a match if surplus level is medium or high
        if surplus["surplus_level"] == "low":
            continue

        # Among available NGOs, prioritize high-need, then distance from surplus
        best_ngo = min(
            all_ngos,
            key=lambda n: (
                -n["priority_score"],  # higher priority first (negate for min sort)
                haversine_distance(
                    surplus["latitude"], surplus["longitude"],
                    n["latitude"], n["longitude"]
                )
            )
        )

        route_dist = haversine_distance(
            surplus["latitude"], surplus["longitude"],
            best_ngo["latitude"], best_ngo["longitude"]
        )

        matches.append({
            "from": surplus["name"],
            "from_type": surplus["category"],
            "from_coords": {"lat": surplus["latitude"], "lon": surplus["longitude"]},
            "to": best_ngo["name"],
            "to_need_level": best_ngo["need_level"],
            "to_coords": {"lat": best_ngo["latitude"], "lon": best_ngo["longitude"]},
            "route_distance_km": round(route_dist, 2),
            "items_available": surplus["available_items"],
            "urgency": "immediate" if best_ngo["need_level"] == "high" else "scheduled"
        })

    return matches


def _get_alert_message(high_need_ngos: int, high_surplus: int) -> str:
    """Generate a human-readable alert for the dashboard banner."""
    if high_need_ngos > 0 and high_surplus > 0:
        return f"⚠️ {high_need_ngos} NGO(s) in urgent need — {high_surplus} high-surplus source(s) available nearby. Redistribute now!"
    elif high_need_ngos > 0:
        return f"🔴 {high_need_ngos} NGO(s) urgently need food. No high-surplus sources nearby — check wider radius."
    elif high_surplus > 0:
        return f"🟢 {high_surplus} surplus source(s) available. Connect them with NGOs to prevent waste!"
    else:
        return "✅ No urgent alerts. Supply and demand appear balanced in this area."
        
from mangum import Mangum

handler = Mangum(app)
