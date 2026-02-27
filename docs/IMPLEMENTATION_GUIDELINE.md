# Match-Mate API – Implementation Guideline

This document describes the backend API: response format, authentication, and every endpoint with payload and response examples.

---

## 1. Overview

- **Stack:** NestJS, Prisma, PostgreSQL, JWT, Socket.IO (chat).
- **Base URL:** `http://localhost:3000` (or your deployed URL).
- **Auth:** JWT Bearer token for all protected routes. Send header: `Authorization: Bearer <access_token>`.

---

## 2. Response format

Every API response (success and error) uses the same shape:

```json
{
  "status": 200,
  "message": "Success",
  "data": { ... }
}
```

| Field     | Type   | Description                          |
|----------|--------|--------------------------------------|
| `status` | number | HTTP status code (200, 201, 400, 401, 404, etc.) |
| `message`| string | Short human-readable message         |
| `data`   | any    | Payload (object, array, or `null` for errors)   |

**Success example:**

```json
{
  "status": 200,
  "message": "Success",
  "data": { "id": "...", "email": "user@example.com" }
}
```

**Error example (e.g. validation):**

```json
{
  "status": 400,
  "message": "Bad Request",
  "data": {
    "errors": ["email must be an email"]
  }
}
```

---

## 3. API endpoints

### 3.1 Health / root

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Simple health check. |

**Response (200):**

```json
{
  "status": 200,
  "message": "Success",
  "data": "Hello World!"
}
```

---

### 3.2 Auth

Base path: `/auth`.

#### POST `/auth/register`

Register a new user.

**Request body:**

| Field        | Type   | Required | Description                |
|-------------|--------|----------|----------------------------|
| email      | string | Yes      | Valid email                |
| password   | string | Yes      | Min 6 characters           |
| phoneNumber| string | No       | Optional phone             |

**Example payload:**

```json
{
  "email": "user@example.com",
  "password": "secret123",
  "phoneNumber": "+1234567890"
}
```

**Success (201):**

```json
{
  "status": 201,
  "message": "Registration successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Error (409 – email already registered):**

```json
{
  "status": 409,
  "message": "Email already registered",
  "data": null
}
```

---

#### POST `/auth/login`

Login and get a JWT.

**Request body:**

| Field     | Type   | Required | Description      |
|----------|--------|----------|------------------|
| email    | string | Yes      | Valid email      |
| password | string | Yes      | Min 6 characters |

**Example payload:**

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Success (201):**

```json
{
  "status": 201,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Error (401 – invalid credentials):**

```json
{
  "status": 401,
  "message": "Invalid email or password",
  "data": null
}
```

---

### 3.3 Profile

Base path: `/profile`. **All require JWT.**

#### GET `/profile/me`

Get the current user’s profile (including partner preference).

**Headers:** `Authorization: Bearer <access_token>`

**Success (200):**

```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "profileCompleted": true,
    "profilePhoto": "https://...",
    "firstName": "John",
    "lastName": "Doe",
    "gender": "MALE",
    "location": "New York",
    "maritalStatus": "UNMARRIED",
    "dateOfBirth": "1990-01-15T00:00:00.000Z",
    "profession": "Engineer",
    "education": "BS Computer Science",
    "height": 175,
    "aboutYourself": "...",
    "createdAt": "...",
    "updatedAt": "...",
    "partnerPreference": { "interestedIn": "FEMALE", "minAge": 25, "maxAge": 35, "preferredCities": ["NYC"] }
  }
}
```

---

#### GET `/profile/list`

List profiles (paginated, optional filter by city).

**Headers:** `Authorization: Bearer <access_token>`

**Query parameters:**

| Param  | Type   | Default | Description                                  |
|--------|--------|---------|----------------------------------------------|
| city   | string | `"all"` | `"my_city"` or `"all"`                       |
| page   | number | 1       | Page number                                  |
| limit  | number | 10      | Items per page (max 50)                      |

**Success (200):**

```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "data": [
      {
        "id": "uuid",
        "profilePhoto": "https://...",
        "firstName": "Jane",
        "lastName": "Doe",
        "gender": "FEMALE",
        "location": "New York",
        "maritalStatus": "UNMARRIED",
        "dateOfBirth": "1992-05-20T00:00:00.000Z",
        "profession": "Designer",
        "education": "BA Design",
        "height": 165,
        "aboutYourself": "...",
        "profileCompleted": true,
        "createdAt": "...",
        "updatedAt": "...",
        "partnerPreference": { ... }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

---

#### PATCH `/profile/complete`

Complete or update the current user’s profile.

**Headers:** `Authorization: Bearer <access_token>`

**Request body:**

| Field          | Type   | Required | Description                    |
|----------------|--------|----------|--------------------------------|
| profilePhoto  | string | No       | URL                            |
| firstName     | string | Yes      | Max 100 chars                  |
| lastName      | string | Yes      | Max 100 chars                  |
| gender        | enum   | Yes      | `MALE`, `FEMALE`, `OTHER`      |
| location      | string | Yes      | Max 200 chars                  |
| maritalStatus | enum   | Yes      | `MARRIED`, `UNMARRIED`, `WIDOW`, `DIVORCED` |
| dateOfBirth   | string | Yes      | ISO date string                |
| profession    | string | Yes      | Max 150 chars                  |
| education     | string | Yes      | Max 200 chars                  |
| height        | number | Yes      | 50–300 (cm)                    |
| aboutYourself | string | Yes      | Max 2000 chars                 |

**Success (200):**

```json
{
  "status": 200,
  "message": "Profile completed successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "profileCompleted": true,
    "profilePhoto": "...",
    "firstName": "John",
    "lastName": "Doe",
    "gender": "MALE",
    "location": "New York",
    "maritalStatus": "UNMARRIED",
    "dateOfBirth": "1990-01-15T00:00:00.000Z",
    "profession": "Engineer",
    "education": "BS CS",
    "height": 175,
    "aboutYourself": "...",
    "createdAt": "...",
    "updatedAt": "...",
    "partnerPreference": { ... }
  }
}
```

**Error (400 – e.g. height validation):**

```json
{
  "status": 400,
  "message": "Height must be at least 50 cm",
  "data": null
}
```

---

#### PATCH `/profile/partner-preference`

Set or update partner preference.

**Headers:** `Authorization: Bearer <access_token>`

**Request body:**

| Field           | Type     | Required | Description                    |
|-----------------|----------|----------|--------------------------------|
| interestedIn    | enum     | Yes      | `MALE`, `FEMALE`, `OTHER`      |
| minAge          | number   | Yes      | 18–120 (integer)               |
| maxAge          | number   | Yes      | 18–120, must be ≥ minAge       |
| preferredCities | string[] | Yes      | Max 20 items, each max 100 chars |

**Example payload:**

```json
{
  "interestedIn": "FEMALE",
  "minAge": 25,
  "maxAge": 35,
  "preferredCities": ["New York", "Boston"]
}
```

**Success (200):**

```json
{
  "status": 200,
  "message": "Partner preference saved successfully",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "interestedIn": "FEMALE",
    "minAge": 25,
    "maxAge": 35,
    "preferredCities": ["New York", "Boston"],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Error (400 – maxAge < minAge):**

```json
{
  "status": 400,
  "message": "maxAge must be greater than or equal to minAge",
  "data": null
}
```

---

### 3.4 Favourites

Base path: `/favourites`. **All require JWT.**

#### GET `/favourites/list`

List current user’s favourites.

**Success (200):**

```json
{
  "status": 200,
  "message": "Success",
  "data": [
    {
      "favouritedAt": "2025-02-27T12:00:00.000Z",
      "profile": {
        "id": "uuid",
        "profilePhoto": "...",
        "firstName": "Jane",
        "lastName": "Doe",
        "gender": "FEMALE",
        "location": "New York",
        "dateOfBirth": "1992-05-20T00:00:00.000Z",
        "profession": "Designer",
        "profileCompleted": true,
        "createdAt": "...",
        "updatedAt": "...",
        "partnerPreference": { ... }
      }
    }
  ]
}
```

---

#### POST `/favourites/:targetUserId`

Add a user to favourites. `:targetUserId` is a UUID.

**Success (201):**

```json
{
  "status": 201,
  "message": "Added to favourites",
  "data": {
    "targetUserId": "uuid"
  }
}
```

**Errors:**

- 400 – Cannot favourite yourself.
- 404 – Target user not found.
- 409 – Already in favourites.

---

#### DELETE `/favourites/:targetUserId`

Remove a user from favourites.

**Success (200):**

```json
{
  "status": 200,
  "message": "Removed from favourites",
  "data": {
    "targetUserId": "uuid"
  }
}
```

**Error (404):** Profile is not in your favourites.

---

### 3.5 Chats

Base path: `/chats`. **All require JWT.**

#### GET `/chats`

Get conversation list with last message and unread count.

**Success (200):**

```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "conversations": [
      {
        "conversationId": "uuid",
        "otherUser": {
          "id": "uuid",
          "firstName": "Jane",
          "lastName": "Doe",
          "profilePhoto": "..."
        },
        "lastMessage": {
          "id": "uuid",
          "content": "Hi there!",
          "senderId": "uuid",
          "createdAt": "...",
          "sender": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" }
        },
        "unreadCount": 2,
        "lastReadAt": "2025-02-26T10:00:00.000Z"
      }
    ],
    "totalUnread": 2
  }
}
```

---

#### POST `/chats/with`

Get or create a conversation with a user.

**Request body:**

| Field        | Type   | Required | Description |
|-------------|--------|----------|-------------|
| targetUserId| string | Yes      | UUID        |

**Example payload:**

```json
{
  "targetUserId": "uuid"
}
```

**Success (201):**

```json
{
  "status": 201,
  "message": "Success",
  "data": {
    "id": "conversation-uuid",
    "createdAt": "...",
    "updatedAt": "...",
    "participants": [
      {
        "user": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe",
          "profilePhoto": "..."
        }
      },
      {
        "user": {
          "id": "uuid",
          "firstName": "Jane",
          "lastName": "Doe",
          "profilePhoto": "..."
        }
      }
    ]
  }
}
```

**Errors:** 403 (cannot chat with yourself), 404 (user not found).

---

#### GET `/chats/:conversationId/messages`

Get messages in a conversation (paginated).

**Query parameters:**

| Param | Type   | Default | Description     |
|-------|--------|---------|-----------------|
| page  | number | 1       | Page number     |
| limit | number | 20      | Per page (max 100) |

**Success (200):**

```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "data": [
      {
        "id": "uuid",
        "conversationId": "uuid",
        "senderId": "uuid",
        "content": "Hello!",
        "createdAt": "...",
        "sender": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

**Error (403):** Not a participant in this conversation.

---

#### PATCH `/chats/:conversationId/read`

Mark a conversation as read for the current user.

**Success (200):**

```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "success": true
  }
}
```

**Error (403):** Not a participant.

---

### 3.6 Notifications

Base path: `/notifications`. **All require JWT.**

#### GET `/notifications`

List notifications (paginated, optional unread only).

**Query parameters:**

| Param     | Type    | Default | Description     |
|----------|---------|---------|-----------------|
| unreadOnly | boolean | -     | If true, only unread |
| page     | number  | 1       | Page number     |
| limit    | number  | 20      | Per page (max 50) |

**Success (200):**

```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "data": [
      {
        "id": "uuid",
        "userId": "uuid",
        "title": "New match",
        "body": "Jane Doe matches your preferences.",
        "image": "https://...",
        "read": false,
        "createdAt": "..."
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    },
    "unreadCount": 3
  }
}
```

---

#### PATCH `/notifications/:id/read`

Mark one notification as read.

**Success (200):**

```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "New match",
    "body": "...",
    "image": null,
    "read": true,
    "createdAt": "..."
  }
}
```

**Errors:** 403/404 – Notification not found or not owned by user.

---

#### PATCH `/notifications/read-all`

Mark all notifications as read for the current user.

**Success (200):**

```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "success": true
  }
}
```

---

### 3.7 Matches

Base path: `/matches`. **All require JWT.**

#### POST `/matches/run-job`

Trigger the match job for the current user (e.g. for testing). Normally runs on a schedule.

**Success (201):**

```json
{
  "status": 201,
  "message": "Match job completed",
  "data": {
    "message": "Match job completed"
  }
}
```

---

#### GET `/matches`

List matches (paginated) with match percentage and “new” flag.

**Query parameters:**

| Param  | Type   | Default | Description     |
|--------|--------|---------|-----------------|
| page   | number | 1       | Page number     |
| limit  | number | 20      | Per page (max 50) |

**Success (200):**

```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "data": [
      {
        "id": "match-uuid",
        "targetUser": {
          "id": "uuid",
          "profilePhoto": "...",
          "firstName": "Jane",
          "lastName": "Doe",
          "age": 28,
          "location": "New York",
          "gender": "FEMALE",
          "profession": "Designer",
          "education": "BA Design"
        },
        "matchPercentage": 85,
        "isNew": true,
        "seenAt": null,
        "createdAt": "..."
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "totalPages": 1
    },
    "newMatchesCount": 3
  }
}
```

---

#### PATCH `/matches/:id/seen`

Mark one match as seen.

**Success (200):**

```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "targetUserId": "uuid",
    "seenAt": "2025-02-27T12:00:00.000Z",
    "createdAt": "..."
  }
}
```

**Errors:** 403/404 – Match not found or not owned by user.

---

#### PATCH `/matches/seen-all`

Mark all matches as seen for the current user.

**Success (200):**

```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "success": true
  }
}
```

---

## 4. WebSocket (Chat)

- **Namespace:** `/chat`
- **Auth:** Send JWT in handshake: `auth: { token: "<access_token>" }` or query: `?token=<access_token>`

**Events:**

| Event               | Direction | Payload                    | Description                    |
|---------------------|-----------|----------------------------|--------------------------------|
| `join_conversation` | Client → Server | `{ conversationId }`  | Join a conversation room       |
| `leave_conversation`| Client → Server | `{ conversationId }`  | Leave a conversation room      |
| `send_message`      | Client → Server | `{ conversationId, content }` | Send a message         |
| `new_message`       | Server → Client | message object         | Broadcast to room when a message is sent |

---

## 5. Summary table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Health check |
| POST | `/auth/register` | No | Register |
| POST | `/auth/login` | No | Login |
| GET | `/profile/me` | JWT | My profile |
| GET | `/profile/list` | JWT | List profiles |
| PATCH | `/profile/complete` | JWT | Complete profile |
| PATCH | `/profile/partner-preference` | JWT | Partner preference |
| GET | `/favourites/list` | JWT | List favourites |
| POST | `/favourites/:targetUserId` | JWT | Add favourite |
| DELETE | `/favourites/:targetUserId` | JWT | Remove favourite |
| GET | `/chats` | JWT | Conversation list |
| POST | `/chats/with` | JWT | Get/create conversation |
| GET | `/chats/:conversationId/messages` | JWT | Messages |
| PATCH | `/chats/:conversationId/read` | JWT | Mark read |
| GET | `/notifications` | JWT | List notifications |
| PATCH | `/notifications/:id/read` | JWT | Mark one read |
| PATCH | `/notifications/read-all` | JWT | Mark all read |
| POST | `/matches/run-job` | JWT | Run match job |
| GET | `/matches` | JWT | List matches |
| PATCH | `/matches/:id/seen` | JWT | Mark match seen |
| PATCH | `/matches/seen-all` | JWT | Mark all matches seen |

---

*Last updated: February 2025.*
