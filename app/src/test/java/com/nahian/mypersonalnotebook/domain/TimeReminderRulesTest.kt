package com.nahian.mypersonalnotebook.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TimeReminderRulesTest {
    @Test
    fun rejectsBlankTitleAndMessage() {
        val now = 10_000L
        assertEquals(
            "Add a title for this reminder.",
            TimeReminderRules.validate("  ", "message", now + 60_000, now),
        )
        assertEquals(
            "Add a reminder message.",
            TimeReminderRules.validate("title", "\n", now + 60_000, now),
        )
    }

    @Test
    fun requiresMoreThanFiveSecondsLeadTime() {
        val now = 50_000L
        assertEquals(
            "Choose a future date and time.",
            TimeReminderRules.validate("title", "message", now + TimeReminderRules.MINIMUM_LEAD_TIME_MILLIS, now),
        )
        assertNull(
            TimeReminderRules.validate("title", "message", now + TimeReminderRules.MINIMUM_LEAD_TIME_MILLIS + 1, now),
        )
    }

    @Test
    fun aReminderCanOnlyBeReenabledBeforeItsScheduledTime() {
        val now = 90_000L
        assertFalse(TimeReminderRules.canEnable(now, now))
        assertTrue(TimeReminderRules.canEnable(now + 1, now))
    }
}
