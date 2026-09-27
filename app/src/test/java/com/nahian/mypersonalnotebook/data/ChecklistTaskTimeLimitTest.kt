package com.nahian.mypersonalnotebook.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ChecklistTaskTimeLimitTest {
    @Test
    fun deadlineProducesItsFixedDueTime() {
        val limit = ChecklistTaskTimeLimit(deadlineAt = 1_800_000_000_000L)
        assertEquals(1_800_000_000_000L, limit.dueAt())
        assertEquals(ChecklistTaskTimeLimitType.DEADLINE, limit.type)
        assertTrue(limit.isValid())
    }

    @Test
    fun manualCountdownHasNoDueTimeUntilStarted() {
        val limit = ChecklistTaskTimeLimit(countdownDurationMillis = 30 * 60_000L)
        assertNull(limit.dueAt())
        assertEquals(ChecklistTaskTimeLimitType.COUNTDOWN, limit.type)
        assertTrue(limit.isValid())
        assertFalse(limit.startCountdownWhenSaved)
    }

    @Test
    fun immediateCountdownChoiceWaitsUntilTheTaskIsSavedToStart() {
        val limit = ChecklistTaskTimeLimit(
            countdownDurationMillis = 30 * 60_000L,
            startCountdownWhenSaved = true,
        )
        assertNull(limit.countdownStartedAt)
        assertNull(limit.dueAt())
        assertTrue(limit.isValid())
    }

    @Test
    fun activeCountdownAddsDurationToItsStartTime() {
        val limit = ChecklistTaskTimeLimit(countdownDurationMillis = 30 * 60_000L, countdownStartedAt = 1_000_000L)
        assertEquals(2_800_000L, limit.dueAt())
        assertTrue(limit.isValid())
    }

    @Test
    fun rejectsMixedOrIncompleteLimits() {
        assertFalse(ChecklistTaskTimeLimit(deadlineAt = 10L, countdownDurationMillis = 60_000L).isValid())
        assertFalse(ChecklistTaskTimeLimit(countdownStartedAt = 10L).isValid())
        assertFalse(
            ChecklistTaskTimeLimit(
                countdownDurationMillis = ChecklistTaskTimeLimit.MAX_COUNTDOWN_DURATION_MILLIS + 1,
            ).isValid(),
        )
        assertFalse(
            ChecklistTaskTimeLimit(
                countdownDurationMillis = 60_000L,
                countdownStartedAt = 10L,
                startCountdownWhenSaved = false,
            ).isValid(),
        )
        assertTrue(ChecklistTaskTimeLimit.None.isValid())
    }
}
