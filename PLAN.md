# LectureFlow Part 6: Advanced Quiz Engine — Implementation Plan

## Architecture Overview

This plan adds the full Quiz Engine to the existing codebase:
- **Admin Dashboard** → Create/manage quizzes with media, view active rooms
- **Live Quiz Execution** → Start quiz in room, answer, reveal, next question — all via Redis/WebSockets
- **Persistence** → Flush Redis quiz results to PostgreSQL when quiz ends

**Data flow:**
```
Admin creates quiz → PostgreSQL (quizzes + questions + media)
Admin starts quiz in room → Backend loads from PostgreSQL → Redis (quiz_state:<roomId>)
Students answer → Redis counters/lists updated in real-time via WebSockets
Admin ends quiz → syncService flushes Redis → PostgreSQL (quiz_results table) → Redis keys deleted
```

---

## Phase 1: Database Extension

### 1.1 Add `quiz_results` table to `backend/src/db/schema.ts`
- Add a new `quiz_results` PG table with columns:
  - `id` (uuid, PK, defaultRandom)
  - `quiz_id` (uuid, FK → quizzes.id, ON DELETE CASCADE, NOT NULL)
  - `room_code` (varchar 10, NOT NULL)
  - `question_id` (uuid, FK → questions.id, ON DELETE CASCADE, NOT NULL)
  - `aggregated_results` (jsonb, NOT NULL) — stores `{ votes: { option: count }, openTextAnswers: string[] }`
  - `completed_at` (timestamp, NOT NULL, defaultNow)
- **File:** `backend/src/db/schema.ts:40` (append after the `media` table)

### 1.2 Push schema to database
- Run `pnpm --filter @lectureflow/backend run db:push` to apply the new table

---

## Phase 2: Backend — Redis Quiz State Service

### 2.1 Create `backend/src/services/redisQuizState.ts`
This file manages the live quiz state in Redis, following the same patterns as `redisState.ts`.

**Functions to implement:**
- `initQuiz(roomCode, quizData, questions)` — Store serialized quiz in Redis Hash at `quiz_state:<roomCode>` with fields: `quizId`, `quizData` (JSON), `questions` (JSON), `currentQuestionIndex` (0), `status` ("active"), `startedAt` (timestamp). Set TTL 3600s.
- `getQuizState(roomCode)` — Return full quiz state hash. Parse JSON fields.
- `setCurrentQuestion(roomCode, index)` — Update `currentQuestionIndex` in hash.
- `incrementAnswer(roomCode, questionId, optionId)` — `HINCRBY` on `quiz_answers:<roomCode>:<questionId>` field `optionId`.
- `pushOpenTextAnswer(roomCode, questionId, text)` — `RPUSH` text into `quiz_open_answers:<roomCode>:<questionId>` list.
- `getQuestionAnswers(roomCode, questionId)` — Get all MC vote counts + open text list for a question.
- `getOpenTextAnswers(roomCode, questionId)` — `LRANGE` on open text list.
- `setQuizStatus(roomCode, status)` — Update status field ("active" | "ended").
- `deleteQuizState(roomCode)` — Delete `quiz_state:<roomCode>` and all `quiz_answers:*` and `quiz_open_answers:*` keys.
- `getActiveQuizRoom(roomCode)` — Check if `quiz_state:<roomCode>` exists and is active.

**File:** Create new file `backend/src/services/redisQuizState.ts`

---

## Phase 3: Backend — Socket Quiz Event Handlers

### 3.1 Create `backend/src/sockets/quiz.events.ts`
Register quiz-specific socket event handlers following the same pattern as `room.events.ts`.

**Event handlers:**

- **`start_quiz`** (client → server)
  - Payload: `{ roomCode, quizId }`
  - Auth: Admin only (check `socket.data.admin` + room ownership via `getRoomOwner`)
  - Logic: Query PostgreSQL for quiz + its questions + media. Call `initQuiz` to store in Redis. Emit `quiz_started` to the room with first question (scrub `correct_answer` from student-facing payload — emit only to non-admin sockets via `socket.to(roomCode).emit(...)` with `isAdmin: false` flag).
  - Admin gets full question data including answers.

- **`submit_answer`** (client → server)
  - Payload: `{ roomCode, questionId, answer }` where answer is either a string (option ID for MC) or text.
  - No auth required.
  - Logic: Get current quiz state. For multiple_choice: `incrementAnswer`. For open_text: `pushOpenTextAnswer`.
  - Emit `quiz_answer_update` to admins only with current counts/texts.

- **`next_question`** (client → server)
  - Payload: `{ roomCode }`
  - Auth: Admin + room ownership.
  - Logic: Increment `currentQuestionIndex` → call `setCurrentQuestion`. Emit `quiz_question_changed` to room with next question (scrubbed for students).
  - If no more questions, emit `quiz_question_changed` with `{ finished: true }`.

- **`reveal_solution`** (client → server)
  - Payload: `{ roomCode }`
  - Auth: Admin + room ownership.
  - Logic: Emit `quiz_solution_revealed` to all sockets in room with the correct answer for the current question.

- **`end_quiz`** (client → server)
  - Payload: `{ roomCode }`
  - Auth: Admin + room ownership.
  - Logic: Call `syncService.flushQuizResults(roomCode)`. Call `deleteQuizState(roomCode)`. Emit `quiz_ended` to room.

### 3.2 Wire quiz events into `backend/src/sockets/index.ts`
- Import `registerQuizEvents` from `./quiz.events.js`
- Call `registerQuizEvents(io, socket, app)` inside the `io.on("connection")` handler alongside `registerRoomEvents`
- **File:** `backend/src/sockets/index.ts:49`

---

## Phase 4: Backend — Synchronization Service

### 4.1 Create `backend/src/services/syncService.ts`
Contains the logic to read final Redis quiz state and persist to PostgreSQL.

**Function:**
- `flushQuizResults(roomCode)`:
  1. `getQuizState(roomCode)` → get quizId, questions array, currentQuestionIndex
  2. For each question index from 0 to currentQuestionIndex:
     - Get question data (id, type)
     - `getQuestionAnswers(roomCode, questionId)` → aggregated results (MC vote counts or open text list)
     - Insert row into `quiz_results` table with `quiz_id`, `room_code`, `question_id`, `aggregated_results`
  3. Return success

**DSGVO compliance:** Only store aggregated counts (no sessionId). Open text answers stored anonymously.

**File:** Create new file `backend/src/services/syncService.ts`

---

## Phase 5: Backend — Additional API Routes

### 5.1 Add active rooms endpoint
- **Route:** `GET /api/rooms` (authenticated)
- **Logic:** Query Redis for all `room:*` keys (use `SCAN` or `KEYS`). Filter by admin ownership if not super admin. Return `{ code, status, createdAt, adminId }`.
- **File:** Append to `backend/src/api/rooms.routes.ts`

### 5.2 Serve uploaded files statically
- Register Fastify static file serving for `/uploads/*` pointing to the `uploads/` directory
- **File:** `backend/src/index.ts:70` (after multipart registration)

---

## Phase 6: Frontend — Admin Dashboard Pages

### 6.1 Admin Quiz List (`frontend/src/features/admin/QuizList.tsx`)
- Fetch quizzes via `GET /api/quizzes` using the `api.ts` axios instance
- Render a list of quiz cards: title, created date, question count
- Each card has "Edit" and "Delete" buttons
- "Create New Quiz" button at top

**File:** Create new file `frontend/src/features/admin/QuizList.tsx`

### 6.2 Admin Quiz Editor (`frontend/src/features/admin/QuizEditor.tsx`)
- **Mode:** Create or Edit (detected via URL param `:quizId`)
- **Title input:** Text field for quiz title
- **Questions list:** Dynamic list of question blocks
  - Each question: type selector (multiple_choice / open_text), content textarea, options editor (for MC: list of option inputs), correct answer input, media upload button
  - Media upload: `<input type="file">` → upload to `POST /api/upload` with `question_id` → store returned `file_path` locally
  - Add/Remove question buttons
- **Save flow:**
  1. POST/PUT quiz title → get quiz ID
  2. For each question: upload media first (if any) → then POST/PUT question with media IDs attached
- **Form state management:** Use local React state (useState/useReducer)

**File:** Create new file `frontend/src/features/admin/QuizEditor.tsx`

### 6.3 Update Admin Dashboard (`frontend/src/pages/AdminDashboardPage.tsx`)
- Replace skeleton with real content:
  - Fetch active rooms via `GET /api/rooms`
  - Display active room cards with room code, status, "Join Room" link
  - "Create New Room" button → calls `POST /api/rooms` → shows created room code
  - Quick stats card: total quizzes count, active rooms count
- Add sidebar links for "Quizzes" (navigates to `/admin/quizzes`) and "Rooms" (navigates to `/admin/rooms` if separate page, or stays on dashboard)

**Files modified:**
- `frontend/src/pages/AdminDashboardPage.tsx`
- `frontend/src/layouts/AdminLayout.tsx` (add sidebar links)

---

## Phase 7: Frontend — Router Updates

### 7.1 Add admin sub-routes
Add to the AdminLayout children in `frontend/src/router/index.tsx`:
- `/admin/quizzes` → QuizList
- `/admin/quizzes/new` → QuizEditor (create mode)
- `/admin/quizzes/:quizId/edit` → QuizEditor (edit mode)

**File:** `frontend/src/router/index.tsx:40-45`

---

## Phase 8: Frontend — Room Quiz UI

### 8.1 Add Tab Navigation to `LiveRoomPage.tsx`
- Add a tab bar with two tabs: "Chatwall" (current content) and "Quiz"
- Use local `useState<'chatwall' | 'quiz'>` to switch content
- In "Quiz" tab:
  - Students see: `StudentQuizView` (or "Waiting for quiz to start..." message)
  - Admins see: `AdminQuizControl` (or "Start Quiz" button that opens modal listing quizzes)
- **File:** `frontend/src/features/room/LiveRoomPage.tsx`

### 8.2 Student Quiz View (`frontend/src/features/room/quiz/StudentQuizView.tsx`)
- **Waiting state:** Show "Warte auf das Quiz..." message
- **Active question:** Show question content. If `media.file_path` exists → render `<img>` with backend URL
- **Answer input:**
  - Multiple choice: Radio button group with option labels
  - Open text: Textarea
  - Submit button → emits `submit_answer` via socket
  - After submission: disable inputs, show "Antwort gesendet"
- **Solution revealed:** Compare student's local answer with broadcast correct answer → show badge: "Richtig" (green), "Falsch" (red), or "Keine Antwort" (gray)
- **Quiz ended:** Show "Quiz beendet" summary

**File:** Create new file `frontend/src/features/room/quiz/StudentQuizView.tsx`

### 8.3 Admin Quiz Control (`frontend/src/features/room/quiz/AdminQuizControl.tsx`)
- **Pre-quiz:** "Quiz starten" button → opens modal with quiz list → Admin selects quiz → emits `start_quiz`
- **Active quiz:** Show current question (full data with correct answer), timer display (optional countdown), "Nächste Frage" button, "Lösung anzeigen" button, "Quiz beenden" button
- **Stats panel:** Live bar chart of MC answer distribution (reusing PollBoard patterns)
- **Open text answers:** Render `OpenTextFeed` component

**File:** Create new file `frontend/src/features/room/quiz/AdminQuizControl.tsx`

### 8.4 Open Text Answer Feed (`frontend/src/features/room/quiz/OpenTextFeed.tsx`)
- Admin-only component
- Listens for `quiz_answer_update` events containing open text answers
- Renders them in a live scrolling list (auto-scroll to bottom)
- Each entry shows the text content, timestamp

**File:** Create new file `frontend/src/features/room/quiz/OpenTextFeed.tsx`

### 8.5 Start Quiz Modal (`frontend/src/features/room/quiz/StartQuizModal.tsx`)
- Modal listing all quizzes from `GET /api/quizzes`
- Search/filter by title
- Admin selects a quiz → emits `start_quiz` event

**File:** Create new file `frontend/src/features/room/quiz/StartQuizModal.tsx`

---

## Phase 9: Frontend — Zustand Store Extension

### 9.1 Extend `useRoomStore` with quiz state
Add to the existing store:
- **State:** `quiz: QuizState | null` (QuizState: currentQuestion, questionIndex, myAnswer, solutionRevealed, quizEnded, isAdmin, answers, openTextAnswers[])
- **Actions:**
  - `startQuiz(quizId)` — emit `start_quiz`
  - `submitAnswer(answer)` — emit `submit_answer`, store local answer
  - `nextQuestion()` — emit `next_question`
  - `revealSolution()` — emit `reveal_solution`
  - `endQuiz()` — emit `end_quiz`
- **Socket listeners for quiz events:** `quiz_started`, `quiz_question_changed`, `quiz_solution_revealed`, `quiz_answer_update`, `quiz_ended`

**File:** `frontend/src/store/useRoomStore.ts`

### 9.2 Add quiz types to `frontend/src/features/room/types.ts`
```typescript
export interface QuizState {
  quizId: string
  title: string
  currentQuestion: QuizQuestion | null
  currentQuestionIndex: number
  totalQuestions: number
  myAnswer: string | null
  solutionRevealed: boolean
  quizEnded: boolean
  isAdmin: boolean
}

export interface QuizQuestion {
  id: string
  type: 'multiple_choice' | 'open_text'
  content: string
  options: string[] | null
  correctAnswer: string | null
  media?: { id: string; filePath: string; type: string }
}
```

**File:** `frontend/src/features/room/types.ts`

---

## Phase 10: Internationalization

### 10.1 Add quiz translations to `de.json` and `en.json`
Add `quiz` section with keys:
- `quiz.tabs.chatwall`, `quiz.tabs.quiz`
- `quiz.start`, `quiz.select`, `quiz.waiting`, `quiz.submitAnswer`, `quiz.answerSent`, `quiz.nextQuestion`, `quiz.revealSolution`, `quiz.endQuiz`, `quiz.quizEnded`, `quiz.finished`
- `quiz.result.correct`, `quiz.result.incorrect`, `quiz.result.noAnswer`
- `admin.quizzes.title`, `admin.quizzes.create`, `admin.quizzes.edit`, `admin.quizzes.delete`, `admin.quizzes.noQuizzes`
- `admin.quizEditor.title`, `admin.quizEditor.addQuestion`, `admin.quizEditor.removeQuestion`, `admin.quizEditor.questionType`, `admin.quizEditor.multipleChoice`, `admin.quizEditor.openText`, `admin.quizEditor.correctAnswer`, `admin.quizEditor.options`, `admin.quizEditor.mediaUpload`

**Files:** `frontend/src/i18n/locales/de.json`, `frontend/src/i18n/locales/en.json`

---

## Phase 11: Integration & Verification

### 11.1 Backend wiring
- Register `quiz.events.ts` in `sockets/index.ts`
- Register static file serving in `index.ts`
- Verify all imports are correct

### 11.2 Frontend wiring
- Add new routes to router
- Add sidebar links to AdminLayout
- Wire tab navigation in LiveRoomPage

### 11.3 Verification checklist
1. Admin creates a quiz with 2 MC + 1 open text questions, uploads an image → appears in QuizList
2. Admin creates a room → room appears in dashboard
3. Admin joins room → can start quiz → student sees first question with image
4. Student submits answer → admin sees live stats update
5. Admin reveals solution → student sees correct/incorrect badge
6. Admin clicks next question → both screens update
7. Admin ends quiz → check PostgreSQL `quiz_results` table has aggregated data
8. Redis keys for quiz are cleaned up after end