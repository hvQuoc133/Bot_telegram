# Telegram Internal Company Management Bot System

## I. System Architecture Overview

### Architecture Diagram
```text
[Telegram Clients] <--> [Telegram Bot API] <--> [Node.js/Express Backend]
                                                      |
                                                      v
                                              [PostgreSQL Database]
```

### Components
1. **Telegram Clients**: Employees and Admins interact with the bot via Telegram Groups (with Topics) and Private Chats.
2. **Telegram Bot API**: Acts as the bridge between Telegram and our backend.
3. **Node.js/Express Backend**:
   - **Bot Handlers**: Processes incoming messages and callback queries.
   - **Session Manager**: Manages user state (idle, creating_regulation, etc.) to handle multi-step flows.
   - **Topic Router**: Routes messages based on `message_thread_id` to specific feature modules.
   - **API Endpoints**: Express routes for potential web dashboard integration.
4. **PostgreSQL Database**: Stores users, topics, regulations, and reports.

---

## II. Database Schema Design

### 1. `users` Table
Stores employee and admin information.
- `id` (BIGINT, Primary Key): Telegram User ID.
- `username` (VARCHAR): Telegram username.
- `role` (VARCHAR): 'admin' or 'user'.
- `created_at` (TIMESTAMP).

### 2. `topics` Table
Maps Telegram Topic IDs to features.
- `id` (BIGINT, Primary Key): Telegram `message_thread_id`.
- `name` (VARCHAR): Topic name (e.g., "Regulations", "Reports").
- `feature_type` (VARCHAR): 'discussion', 'regulation', 'report'.
- `created_at` (TIMESTAMP).

### 3. `regulations` Table
Stores company regulations.
- `id` (SERIAL, Primary Key).
- `title` (VARCHAR): Regulation title.
- `content` (TEXT): Regulation content.
- `created_by` (BIGINT, Foreign Key -> users.id).
- `locked_by` (BIGINT, Foreign Key -> users.id): For admin edit locking.
- `locked_at` (TIMESTAMP): Lock timestamp.
- `created_at` (TIMESTAMP).
- `updated_at` (TIMESTAMP).

### 4. `reports` Table
Stores employee reports.
- `id` (SERIAL, Primary Key).
- `user_id` (BIGINT, Foreign Key -> users.id).
- `title` (VARCHAR): Report title.
- `report_date` (DATE): Date of the report.
- `content` (TEXT): Text content of the report.
- `file_url` (VARCHAR): URL to the uploaded file (if any).
- `created_at` (TIMESTAMP).

---

## III. Folder Structure

```
/src
  /api
    /controllers    # Express route controllers
    /routes         # Express API routes
  /bot
    /handlers       # Telegram message and callback handlers
      messageHandler.ts
      callbackHandler.ts
    /middlewares    # Permission and validation middlewares
      authMiddleware.ts
    /services       # Business logic and state management
      sessionManager.ts
      fileService.ts
    /utils          # Helper functions
      setupCommands.ts
      validators.ts
    botInstance.ts  # Singleton bot instance
  /db
    index.ts        # PostgreSQL connection and schema init
  server.ts         # Application entry point
```

---

## IV. State Management Logic

We use an in-memory `Map` (or Redis for production) to track user sessions.

### States:
- `idle`: Default state.
- `creating_regulation_step_1`: Waiting for title.
- `creating_regulation_step_2`: Waiting for content.
- `editing_regulation_step_1`: Waiting for new title/content.
- `creating_report_step_1`: Waiting for report title.
- `creating_report_step_2`: Waiting for report date.
- `creating_report_step_3`: Waiting for content/file.

### Session Object:
```typescript
interface SessionData {
  state: UserState;
  lastActive: number; // For timeout
  tempData?: any;     // Temporary data between steps
  activeMessageId?: number; // For anti-spam UI (editing)
  navigationStack?: string[]; // For "Back" button
}
```

### Timeout Logic:
A `setInterval` runs every minute to clear sessions where `Date.now() - session.lastActive > 10 * 60 * 1000` (10 minutes).

---

## V. Topic Routing Logic

When a message arrives in a group, we check `msg.message_thread_id`.

```typescript
const topicRes = await db.query('SELECT feature_type FROM topics WHERE id = $1', [topicId]);
const feature = topicRes.rows[0]?.feature_type;

switch (feature) {
  case 'discussion':
    return; // Bot ignores
  case 'regulation':
    handleRegulationTopic(msg);
    break;
  case 'report':
    handleReportTopic(msg);
    break;
  default:
    // Unknown topic
    break;
}
```

---

## VI. Message Handling Strategy (Anti-Spam UI)

To prevent spam, we enforce **one active UI message per user** in private chats.

1. **Initial Command**: Bot sends a message and saves `message_id` to `session.activeMessageId`.
2. **Subsequent Actions**: Instead of `bot.sendMessage`, we use `bot.editMessageText` and `bot.editMessageReplyMarkup` on `session.activeMessageId`.
3. **Invalid Input**: If user sends wrong syntax, bot replies with an error, then uses `setTimeout` to delete both the user's invalid message and the error message after 2 seconds.

---

## VII. Sample Flows

### 1. Regulation Flow (Admin Add)
1. Admin sends `/create_regulation` in Private Chat.
2. Bot checks role -> Admin confirmed.
3. Bot sets state to `creating_regulation_step_1`.
4. Bot asks: "Enter regulation title:"
5. Admin replies: "Office Hours".
6. Bot saves title to `tempData`, sets state to `creating_regulation_step_2`.
7. Bot asks: "Enter regulation content:"
8. Admin replies: "9 AM to 6 PM."
9. Bot saves to DB, clears session, sends "Success".

### 2. Report Flow (User View History)
1. User clicks `[View Report History]` inline button.
2. Bot edits message: "Select Year:" `[2023] [2024] [Back]`.
3. User clicks `[2024]`. Bot pushes '2024' to `navigationStack`.
4. Bot edits message: "Select Month:" `[Jan] [Feb] ... [Back]`.
5. User clicks `[Back]`. Bot pops stack, edits message back to Year selection.

---

## VIII. Permission Middleware

```typescript
export async function isAdmin(userId: number): Promise<boolean> {
  const res = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
  return res.rows[0]?.role === 'admin';
}
```
Used before executing any CRUD operations on regulations or viewing other users' reports.

---

## IX. Lock Mechanism (Admin)

When Admin A clicks `[Edit]` on Regulation 1:
1. Check `locked_by` and `locked_at`.
2. If locked by Admin B and lock is < 15 mins old -> Reject Admin A.
3. Else, set `locked_by = Admin A`, `locked_at = NOW()`.
4. Allow Admin A to edit.

---

## X. Express API Endpoints

```typescript
// GET /api/regulations
router.get('/regulations', async (req, res) => {
  const result = await db.query('SELECT * FROM regulations');
  res.json(result.rows);
});

// GET /api/reports/:userId
router.get('/reports/:userId', async (req, res) => {
  const result = await db.query('SELECT * FROM reports WHERE user_id = $1', [req.params.userId]);
  res.json(result.rows);
});
```
