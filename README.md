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

### `GET /api/cities`

Returns a tour (city + ordered list of stops) for the given Google Place ID. If the city is not yet in the database, stops are generated via the Gemini API, persisted, and returned.

**Query parameters**

| Parameter | Required | Description                                                      |
| --------- | -------- | ---------------------------------------------------------------- |
| `placeId` | yes      | Google Place ID of the city (e.g. `ChIJD7fiBh9u5kcRYJSMaMOCCwQ`) |
| `name`    | yes      | City display name (e.g. `Paris`)                                 |
| `country` | yes      | Country name (e.g. `France`)                                     |

**Example**

```
GET /api/cities?placeId=ChIJD7fiBh9u5kcRYJSMaMOCCwQ&name=Paris&country=France
```

**Response** — a `Tour` object matching the shared type in the frontend:

```json
{
  "id": "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
  "city": "Paris",
  "country": "France",
  "description": "...",
  "duration": 210,
  "distance": 7.2,
  "difficulty": "moderate",
  "color": "#2C3E8C",
  "stops": [ ... ]
}
```
