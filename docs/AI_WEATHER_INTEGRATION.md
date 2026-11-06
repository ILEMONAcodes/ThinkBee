# AI_WEATHER_INTEGRATION.md

This document defines how Think Bee resolves a private farm location, obtains weather data and supplies safe, freshness-aware context to the AI, Home screen and alerts. Weather informs timing and risk; it never proves a crop disease, pest or hive condition.

## Location resolution

Resolve one location for each request in this order:

1. **Live device GPS**, only after the farmer grants permission for the current feature. The frontend sends coordinates over HTTPS for the weather request; it does not put them in analytics or client logs.
2. **Saved farm location**, preferring a private pinned coordinate and otherwise the saved State/LGA centroid.
3. **No location.** Return `location_unavailable`; do not infer a location from IP address, authentication data, chat profile or photo EXIF.

Exact coordinates may be used transiently for a weather-provider request and encrypted farm coordinates may remain in the farm record. Before coordinates enter an AI prompt, application log, cache key exposed to tooling or persisted briefing context, truncate latitude and longitude to two decimal places. Public profiles and other users receive State/LGA at most, never coordinates.

The UI requests location when the farmer opens a location-dependent feature, explains the benefit, and offers “Use saved farm location” and “Not now”. Denial does not block scans, records, chat or non-weather assistant use.

## Provider abstraction

`api/app/providers/weather/base.py` will define the provider-neutral contract. Domain models are typed Pydantic models; provider payloads never cross the provider boundary.

```python
class WeatherProvider(Protocol):
    async def get_current_and_forecast(
        self,
        *,
        latitude: float,
        longitude: float,
        timezone: str,
        forecast_hours: int = 48,
    ) -> WeatherSnapshot: ...
```

`WeatherSnapshot` contains:

- provider and fetched-at timestamps;
- observation time and timezone;
- current temperature in Celsius;
- relative humidity percentage;
- wind speed in km/h and direction;
- hourly rain probability for at least the next 24 hours and up to 48 hours;
- hourly temperature, humidity and wind needed by deterministic rules;
- freshness status: `live`, `cached`, `stale` or `unavailable`;
- limitations, including missing provider fields.

`OpenMeteoProvider` is the production implementation. `CachedWeatherProvider` wraps it, and `MockWeatherProvider` supplies deterministic local and test fixtures. The provider is selected through settings so the domain and prompt builder never depend on Open-Meteo response shapes.

Provider requests use timeouts, bounded retries with jitter and a circuit breaker. A provider failure first falls back to a recently expired cached snapshot and labels it `stale`; if none exists, it returns a typed unavailable result. Weather failures must not fail the Home screen or unrelated API routes.

## Redis caching

Cache by provider, privacy-preserving location cell and forecast window, for example:

```text
weather:v1:open_meteo:7.38:3.92:48h
```

The cell uses coordinates truncated to two decimals or an equivalent geohash precision. The default fresh TTL is 90 minutes and is configurable within one to two hours. Keep an additional configurable stale-if-error window for resilience. Use a short Redis lock per key so concurrent requests do not stampede the provider.

Cache values contain the normalized `WeatherSnapshot`, never user IDs, farm names or exact coordinates. A live provider response is `live` for the request that fetched it; subsequent valid cache reads are `cached`. Expired fallback data is `stale` and must include its observation time and limitation.

## Context builder

The location-aware context builder receives the authenticated user, selected farm, optional permitted live coordinates and task type. It:

1. checks farm ownership;
2. resolves location using the hierarchy above;
3. fetches normalized weather through the cached provider;
4. truncates coordinates before prompt construction;
5. selects only relevant farm fields, recent records, scans, tasks and conversation messages;
6. emits the model in `prompts/context_template.json`.

The AI receives freshness and timestamps. It cannot turn `stale` or `unavailable` weather into current conditions. Prompt injection defenses treat all context strings as data.

## Deterministic weather rules

These rules run in backend code before AI generation and again as a post-check. Settings hold thresholds so expert review can change them without rewriting prompt text.

### Beekeeping

Do not recommend opening or inspecting a hive when any of these are true for the proposed time:

- rain is occurring or forecast for that period;
- wind speed is greater than 20 km/h;
- temperature is below 18°C.

The briefing should postpone the task and identify the next forecast window meeting all available conditions. If weather is unavailable, give the thresholds as conditional guidance instead of naming a safe time.

### Crop spraying

Advise against spraying when rain is expected within four hours or wind is high. High-wind configuration defaults to greater than 20 km/h until an agricultural expert sets a product-appropriate threshold. Explain that the restriction reduces chemical drift and runoff and protects people, crops, bees and other pollinators. Never generate chemical dose, mixing ratio or application rate.

### Fungal risk

An elevated fungal-risk alert requires humidity above 80% and temperature above 25°C on consecutive forecast days. One high reading is insufficient. The alert says conditions may favour fungal growth; it is not a diagnosis and does not justify automatic treatment. Ask the farmer to inspect for visible signs and seek expert help for serious or uncertain cases.

## Daily briefings and predictive alerts

`GET /api/v1/briefings/daily` builds or returns one briefing per user, farm and local date. The generated briefing follows `DailyBriefingOutput` in `docs/AI_PROMPTS.md`. It combines weather, scheduled tasks and recent farm context, but never marks a task complete.

A scheduled morning job may pre-generate the briefing and send a push alert at a configurable local time. The job:

- resolves the farm timezone, defaulting to `Africa/Lagos` for the Nigeria launch;
- is idempotent by user, farm, local date and briefing version;
- respects notification preferences and quiet hours;
- sends no exact coordinates or private record details in the push body;
- retries delivery separately from generation;
- does not send predictive claims when weather is unavailable or stale.

Predictive weather and pest alerts are probabilistic. Each stored alert includes the source observation/forecast time, rule version, generated time, expiry and evidence summary. Deduplicate by user, farm, rule and forecast window. Expired alerts are not displayed as current.

## API and frontend behavior

`GET /api/v1/weather/current` returns normalized cached weather and freshness for a selected farm or permitted live location. `GET /api/v1/briefings/daily` returns the weather summary plus structured daily advice. Full contracts are in `docs/API_SPEC.md`.

The Home weather widget always shows freshness. A stale result says when it was last updated. An unavailable result offers retry and saved-farm location selection. Offline mode may display an unexpired cached snapshot; otherwise it displays “Weather unavailable offline” and keeps non-weather Home content usable.

## Privacy and security

- Ask for device location only at the moment it is needed and explain why.
- Do not infer location from IP address or strip location from chat/photo metadata for reuse.
- Strip EXIF/GPS from uploaded photos before storage or AI processing.
- Never log exact coordinates, prompt bodies, weather request URLs containing coordinates, auth tokens or private farm records.
- Authorize every farm-specific request against the authenticated user.
- Provider keys, if a future provider needs them, remain server-only.
- Apply retention rules to generated briefings and alerts; raw weather snapshots normally remain Redis-only.

## Errors and observability

Stable error codes include `location_permission_required`, `location_unavailable`, `farm_not_found`, `weather_provider_unavailable` and `briefing_unavailable`. User messages remain plain language. Metrics may record provider latency, cache hit/miss, stale fallback count, rule trigger count, generation failure and alert delivery result without personal data or precise location.

## Configuration

At minimum:

```text
WEATHER_PROVIDER=open_meteo
WEATHER_CACHE_TTL_SECONDS=5400
WEATHER_STALE_IF_ERROR_SECONDS=21600
WEATHER_FORECAST_HOURS=48
WEATHER_REQUEST_TIMEOUT_SECONDS=8
HIVE_MAX_WIND_KMH=20
HIVE_MIN_TEMPERATURE_C=18
SPRAY_MAX_WIND_KMH=20
SPRAY_RAIN_LOOKAHEAD_HOURS=4
FUNGAL_RISK_MIN_HUMIDITY_PERCENT=80
FUNGAL_RISK_MIN_TEMPERATURE_C=25
FUNGAL_RISK_CONSECUTIVE_DAYS=2
DAILY_BRIEFING_LOCAL_TIME=06:00
```

## Test requirements

- Provider contract tests normalize units, timezone and missing fields.
- Cache tests cover hits, expiry, stampede lock and stale-if-error behavior.
- Location tests cover permission denial, saved-pin fallback, State/LGA fallback and ownership.
- Privacy tests prove AI/log/cache context contains no exact coordinates.
- Rule table tests cover every threshold boundary, including exactly 20 km/h, exactly 18°C, rain at the four-hour edge and non-consecutive humid days.
- Briefing tests cover fresh, cached, stale, unavailable and offline weather.
- Alert tests cover idempotency, deduplication, quiet hours and expired forecasts.
- AI evaluations reject diagnoses based only on weather and unsafe spraying or hive-inspection advice.
