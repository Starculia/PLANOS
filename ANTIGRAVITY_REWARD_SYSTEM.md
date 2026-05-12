# ANTIGRAVITY Linear Point Reward System

## Implementation Summary

The `markAsFinished()` function in `script.js` implements a **linear time-based point reward system** that scales consistently at all durations.

---

## The Reward Formula

### 10 Points Per Minute (Linear Scaling)

Simple and fair:
- Every minute of work = **10 points**
- No diminishing returns
- Encourages both short bursts and deep focus sessions

---

## How It Works

### Time Calculation
```javascript
const startTime = new Date(task.created_at).getTime();
const currentTime = Date.now();
const elapsedMinutes = Math.floor((currentTime - startTime) / 60000);
```

### Point Calculation Logic
```javascript
// Linear scaling: 10 points per minute (minimum 1 minute)
if (elapsedMinutes >= 1) {
    earnedPoints = elapsedMinutes * 10;
}
```

### Minimum Requirement
- **At least 1 minute must pass** to earn any points
- Tasks completed in less than 1 minute earn 0 points (with an informational notification)

---

## Examples

| Time Worked | Calculation | Points Earned |
|-------------|-------------|---------------|
| 30 seconds | < 1 minute | **0 points** |
| 1 minute | 1 × 10 | **10 points** |
| 5 minutes | 5 × 10 | **50 points** |
| 15 minutes | 15 × 10 | **150 points** |
| 30 minutes | 30 × 10 | **300 points** |
| 45 minutes | 45 × 10 | **450 points** |
| 1 hour (60 min) | 60 × 10 | **600 points** |
| 1 hour 30 min (90 min) | 90 × 10 | **900 points** |
| 2 hours (120 min) | 120 × 10 | **1200 points** |
| 3 hours (180 min) | 180 × 10 | **1800 points** |
| 5 hours (300 min) | 300 × 10 | **3000 points** |

---

## Key Features Implemented

### ✅ 1. Time Delta Calculation
- Fetches task's `created_at` timestamp
- Calculates elapsed time in minutes
- Uses `Math.floor()` to ensure whole minutes only

### ✅ 2. Linear Reward Math
- **Simple formula**: `points = minutes × 10`
- No complex conditionals
- Predictable and transparent

### ✅ 3. Database Updates
- **localStorage**: Immediately updates points for instant UI feedback
- **Supabase tasks table**: Updates task status to 'finished'
- **Supabase user_progress table**: Syncs total points and level via `syncProgressToSupabase()`

### ✅ 4. Instant UI Sync
- Calls `updatePointsAndLevel()` to refresh:
  - XP bar in sidebar
  - Level display
  - Rank icon
  - "Total Points" in Insights tab
- No page refresh required

### ✅ 5. Toast Notification
Shows a dynamic notification with:
- **Success case**: `"+[X] Points earned for [Y] minutes of work!"`
- **Info case** (< 1 minute): `"Complete tasks that take at least 1 minute to earn points!"`

---

## Technical Details

### Function Signature
```javascript
async function markAsFinished(taskId)
```

### Dependencies
- `loadTasks()` - Loads tasks from localStorage
- `getLevelFromPoints(points)` - Calculates level from total points
- `checkLevelUp(newPoints, oldPoints)` - Triggers level-up modal if needed
- `updatePointsAndLevel()` - Refreshes all UI elements
- `syncProgressToSupabase(points, level)` - Syncs to Supabase user_progress table
- `showAuthNotification(title, message, type)` - Shows toast notification
- `triggerFinishJuice(taskId)` - Visual feedback animation
- `checkExecutionMasterAchievement(task)` - Achievement system
- `playNotificationSound('complete')` - Audio feedback
- `updateTaskDisplay()` - Refreshes task list UI
- `checkNextPendingTask()` - Auto-starts next pending task

### Error Handling
- Gracefully handles Supabase errors with console logging
- Falls back to localStorage if Supabase sync fails
- Validates minimum 1-minute requirement before awarding points

---

## Testing Recommendations

1. **Quick Task (< 1 minute)**
   - Create a task, immediately finish it
   - Should show: "Complete tasks that take at least 1 minute to earn points!"
   - Points earned: **0**

2. **Short Task (5 minutes)**
   - Create a task, wait 5 minutes, finish it
   - Should show: "+50 Points earned for 5 minutes of work!"
   - Points earned: **50**

3. **Medium Task (30 minutes)**
   - Create a task, wait 30 minutes, finish it
   - Should show: "+300 Points earned for 30 minutes of work!"
   - Points earned: **300**

4. **Long Task (1 hour)**
   - Create a task, wait 60 minutes, finish it
   - Should show: "+600 Points earned for 60 minutes of work!"
   - Points earned: **600**

5. **Extended Task (3 hours)**
   - Create a task, wait 180 minutes, finish it
   - Should show: "+1800 Points earned for 180 minutes of work!"
   - Points earned: **1800**

---

## Why Linear Scaling?

The linear system provides:
- ✅ **Fairness**: Every minute is worth the same
- ✅ **Simplicity**: Easy to understand and predict
- ✅ **Flexibility**: Rewards both quick tasks and deep work equally
- ✅ **Transparency**: No hidden formulas or diminishing returns
- ✅ **Motivation**: Longer focus sessions earn proportionally more

---

## Files Modified

- `c:\xampp\htdocs\PLANOS\script.js` (lines 1437-1445)

## Status

✅ **COMPLETE** - Linear scaling (10 pts/min) implemented and ready for testing
