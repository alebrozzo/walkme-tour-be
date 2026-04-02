# WalkMe Tour — Backend

REST API for the [WalkMe Tour](https://github.com/alebrozzo/walkme-tour) React Native app. When a user selects a city, this service returns a curated list of must-see stops — fetching them from the database if they exist, or generating them on the fly via an LLM and persisting them for future requests.

## Tech Stack

| Layer           | Technology         |
| --------------- | ------------------ |
| Runtime         | Node.js.           |
| Language        | TypeScript.        |
| Framework       | Express            |
| Database        | MongoDB (Mongoose) |
| Stop generation | Gemini API         |

## Getting Started

### Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

| Variable                | Description                         |
| ----------------------- | ----------------------------------- |
| `MONGO_URI`             | MongoDB Atlas connection string     |
| `GEMINI_API_KEY`        | Google Gemini API key               |
| `GOOGLE_PLACES_API_KEY` | Google Cloud API key (Places API)   |
| `PORT`                  | Port to listen on (default: `3000`) |

### 3. Run in development mode

```bash
npm run dev
```

The server starts on `http://localhost:3000` and restarts automatically on file changes.

## API

### `GET /api/ping`

Lightweight liveness endpoint. This does not call external services.

```bash
curl "http://localhost:3000/api/ping"
```

### `GET /api/health-check`

Deep health endpoint for dependency checks.

- By default it runs database and Google Places checks.
- Gemini check is opt-in because it is costlier and may be rate-limited.

**Query parameters**

| Parameter       | Required | Default | Description                             |
| --------------- | -------- | ------- | --------------------------------------- |
| `includeDb`     | no       | `true`  | Run MongoDB check using Paris/France/en |
| `includePlaces` | no       | `true`  | Run Google Places API check             |
| `includeAI`     | no       | `false` | Run Gemini API check                    |

**Examples**

```bash
# Default deep check (DB + Places)
curl "http://localhost:3000/api/health-check"

# Include AI (Gemini) in deep check
curl "http://localhost:3000/api/health-check?includeAI=true"

# Gemini only
curl "http://localhost:3000/api/health-check?includeDb=false&includePlaces=false&includeAI=true"

# DB only
curl "http://localhost:3000/api/health-check?includePlaces=false&includeAI=false"
```

The response includes overall `status` (`ok` or `degraded`) and component-level results under `database`, `googlePlaces`, and `ai` for the checks that were run.

### `GET /api/cities`

Returns a tour (city + ordered list of stops) for the given Google Place ID. If the city is not yet in the database, stops are generated via the Gemini API, persisted, and returned.

**Query parameters**

| Parameter  | Required | Description                                                                      |
| ---------- | -------- | -------------------------------------------------------------------------------- |
| `placeId`  | yes      | Google Place ID of the city (e.g. `ChIJD7fiBh9u5kcRYJSMaMOCCwQ`)                 |
| `city`     | yes      | City display name (e.g. `Paris`)                                                 |
| `country`  | yes      | Country name (e.g. `France`)                                                     |
| `language` | no       | ISO 639-1 language code for the generated content (e.g. `es`). Defaults to `en`. |

**Examples**

```
GET /api/cities?placeId=ChIJD7fiBh9u5kcRYJSMaMOCCwQ&city=Paris&country=France
GET /api/cities?placeId=ChIJD7fiBh9u5kcRYJSMaMOCCwQ&city=Paris&country=France&language=fr
```

```bash
# Buenos Aires
curl "http://localhost:3000/api/cities?placeId=ChIJvQz7nfzKvJURjlC4fXQYlTk&city=Buenos%20Aires&country=Argentina"
# Buenos Aires in French
curl "http://localhost:3000/api/cities?placeId=ChIJvQz7nfzKvJURjlC4fXQYlTk&city=Buenos%20Aires&country=Argentina&language=fr"
```

**Response** — a `Tour` object matching the shared type in the frontend:

```json
{
  "id": "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
  "city": "Paris",
  "country": "France",
  "description": "Discover the City of Light on foot...",
  "color": "#2C3E8C",
  "imageUrl": "https://...",
  "stops": [
    {
      "id": "ChIJD7fiBh9u5kcRYJSMaMOCCwQ-1",
      "name": "Eiffel Tower",
      "address": "Champ de Mars, 5 Av. Anatole France, 75007 Paris",
      "coordinate": { "latitude": 48.8584, "longitude": 2.2945 },
      "type": "landmark",
      "imageUrl": "https://...",
      "description": "The iconic iron lattice tower...",
      "duration": 45,
      "price": "€17"
    }
  ]
}
```

#### `Tour` fields

| Field         | Type      | Description                                     |
| ------------- | --------- | ----------------------------------------------- |
| `id`          | `string`  | Google Place ID of the city                     |
| `city`        | `string`  | City name                                       |
| `country`     | `string`  | Country name                                    |
| `description` | `string`  | Short tour description                          |
| `color`       | `string`  | Hex colour used for UI theming (e.g. `#2C3E8C`) |
| `imageUrl`    | `string?` | Optional hero image URL                         |
| `stops`       | `Stop[]`  | Ordered list of stops                           |

#### `Stop` fields

| Field         | Type                      | Description                                                  |
| ------------- | ------------------------- | ------------------------------------------------------------ |
| `id`          | `string`                  | Unique stop ID (`{placeId}-{order}`)                         |
| `order`       | `number`                  | Position in the tour (1-based)                               |
| `name`        | `string`                  | Stop name                                                    |
| `address`     | `string`                  | Full street address                                          |
| `coordinate`  | `{ latitude, longitude }` | GPS coordinates                                              |
| `type`        | `StopType`                | Category — see below                                         |
| `imageUrl`    | `string?`                 | Optional stop image URL                                      |
| `description` | `string`                  | Detailed description of the place                            |
| `duration`    | `number`                  | Recommended time to spend in minutes                         |
| `price`       | `string?`                 | Entry price as display string e.g. `"€15"` (omitted if free) |

#### `StopType` values

`landmark` · `museum` · `neighborhood` · `temple` · `shrine` · `park` · `piazza` · `market` · `beach`
