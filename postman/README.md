# Match-Mate API – Postman

## Import

1. Open Postman → **Import** → select `Match-Mate-API.postman_collection.json`.
2. (Optional) Create an **Environment** with variable `base_url` = `http://localhost:3000` and select it.

## Collection variables

| Variable           | Purpose |
|--------------------|--------|
| `base_url`         | API root (default `http://localhost:3000`) |
| `access_token`     | Set automatically after **Auth → Login** or **Register** |
| `target_user_id`   | Set manually for Favourites Add/Remove and Get or Create Conversation |
| `conversation_id`  | Set manually for Get Messages and Mark Read |
| `match_id`         | Set manually for Mark Match Seen |
| `notification_id` | Set manually for Mark Notification Read |

## Auth flow

1. Run **Auth → Login** (or **Register**).
2. In the **Tests** tab, the collection script saves `access_token` from the response.
3. All other folders use **Collection** auth: **Bearer Token** `{{access_token}}`.
4. Auth requests (Register, Login) use **No Auth**.

## Optional: save IDs from responses

After **Profile → Get My Profile**, you can set `user_id` in the collection:

- **Tests** tab:  
  `pm.collectionVariables.set("user_id", pm.response.json().id);`

After **Chats → Get Conversation List**, pick one `conversationId` and set:

- **Tests** tab:  
  `pm.collectionVariables.set("conversation_id", pm.response.json().conversations[0].conversationId);`

Similarly set `target_user_id` from **Profile → List Profiles** (e.g. first profile `id`) and `match_id` / `notification_id` from list responses when needed.
