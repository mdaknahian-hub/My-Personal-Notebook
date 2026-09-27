package com.nahian.mypersonalnotebook.data

/** A task may have one fixed deadline or one countdown; a null start means the countdown is not running yet. */
data class ChecklistTaskTimeLimit(
    val deadlineAt: Long? = null,
    val countdownDurationMillis: Long? = null,
    val countdownStartedAt: Long? = null,
    /** UI intent only: repositories turn this into a start timestamp when the task is saved. */
    val startCountdownWhenSaved: Boolean = countdownStartedAt != null,
) {
    val type: ChecklistTaskTimeLimitType
        get() = when {
            deadlineAt != null -> ChecklistTaskTimeLimitType.DEADLINE
            countdownDurationMillis != null -> ChecklistTaskTimeLimitType.COUNTDOWN
            else -> ChecklistTaskTimeLimitType.NONE
        }

    fun dueAt(): Long? = when (type) {
        ChecklistTaskTimeLimitType.NONE -> null
        ChecklistTaskTimeLimitType.DEADLINE -> deadlineAt
        ChecklistTaskTimeLimitType.COUNTDOWN -> countdownStartedAt?.let { startedAt ->
            countdownDurationMillis?.let { duration -> startedAt + duration }
        }
    }

    fun isValid(): Boolean = when (type) {
        ChecklistTaskTimeLimitType.NONE -> deadlineAt == null && countdownDurationMillis == null && countdownStartedAt == null && !startCountdownWhenSaved
        ChecklistTaskTimeLimitType.DEADLINE -> countdownDurationMillis == null && countdownStartedAt == null && !startCountdownWhenSaved
        ChecklistTaskTimeLimitType.COUNTDOWN -> deadlineAt == null &&
            (countdownDurationMillis ?: 0L) in 1L..MAX_COUNTDOWN_DURATION_MILLIS &&
            (countdownStartedAt == null || startCountdownWhenSaved)
    }

    companion object {
        const val MAX_COUNTDOWN_DURATION_MILLIS = 365L * 24 * 60 * 60 * 1000
        val None = ChecklistTaskTimeLimit()

        fun from(item: NotebookChecklistItem): ChecklistTaskTimeLimit = ChecklistTaskTimeLimit(
            deadlineAt = item.deadlineAt,
            countdownDurationMillis = item.countdownDurationMillis,
            countdownStartedAt = item.countdownStartedAt,
            startCountdownWhenSaved = item.countdownStartedAt != null,
        )
    }
}

enum class ChecklistTaskTimeLimitType {
    NONE,
    DEADLINE,
    COUNTDOWN,
}
