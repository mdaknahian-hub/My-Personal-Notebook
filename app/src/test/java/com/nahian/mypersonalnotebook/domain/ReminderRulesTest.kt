package com.nahian.mypersonalnotebook.domain

import com.nahian.mypersonalnotebook.data.LocationReminder
import com.nahian.mypersonalnotebook.data.RecurrenceType
import com.nahian.mypersonalnotebook.data.TriggerType
import java.time.LocalDate
import java.time.ZoneId
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ReminderRulesTest {
    private val zone = ZoneId.of("Asia/Dhaka")

    @Test
    fun acceptsOnlySupportedRadiiAndValidCoordinates() {
        assertNull(ReminderRules.validate("Office", "Send report", 23.8, 90.4, 200, TriggerType.ENTER.storageValue, RecurrenceType.ONCE.storageValue, 1))
        assertTrue(ReminderRules.validate("Office", "Send report", 23.8, 90.4, 250, TriggerType.ENTER.storageValue, RecurrenceType.ONCE.storageValue, 1) != null)
        assertTrue(ReminderRules.validate("Office", "Send report", 91.0, 90.4, 200, TriggerType.ENTER.storageValue, RecurrenceType.ONCE.storageValue, 1) != null)
    }

    @Test
    fun requiresTitleMessageAndLocation() {
        assertTrue(ReminderRules.validate(" ", "Message", 0.0, 0.0, 100, TriggerType.ENTER.storageValue, RecurrenceType.ONCE.storageValue, 1) != null)
        assertTrue(ReminderRules.validate("Title", " ", 0.0, 0.0, 100, TriggerType.ENTER.storageValue, RecurrenceType.ONCE.storageValue, 1) != null)
        assertTrue(ReminderRules.validate("Title", "Message", null, null, 100, TriggerType.ENTER.storageValue, RecurrenceType.ONCE.storageValue, 1) != null)
    }

    @Test
    fun customRecurrenceMustBeWithinSupportedRange() {
        assertTrue(ReminderRules.validate("Title", "Message", 0.0, 0.0, 100, TriggerType.ENTER.storageValue, RecurrenceType.CUSTOM.storageValue, 0) != null)
        assertTrue(ReminderRules.validate("Title", "Message", 0.0, 0.0, 100, TriggerType.ENTER.storageValue, RecurrenceType.CUSTOM.storageValue, 366) != null)
        assertNull(ReminderRules.validate("Title", "Message", 0.0, 0.0, 100, TriggerType.ENTER.storageValue, RecurrenceType.CUSTOM.storageValue, 7))
    }

    @Test
    fun transitionMustMatchConfiguredTrigger() {
        assertTrue(ReminderRules.transitionMatches(TriggerType.ENTER.storageValue, entering = true))
        assertFalse(ReminderRules.transitionMatches(TriggerType.ENTER.storageValue, entering = false))
        assertTrue(ReminderRules.transitionMatches(TriggerType.EXIT.storageValue, entering = false))
        assertTrue(ReminderRules.transitionMatches(TriggerType.ENTER_OR_EXIT.storageValue, entering = false))
    }

    @Test
    fun dailyRecurrenceAllowsOneTransitionPerLocalDay() {
        val reminder = reminder(RecurrenceType.DAILY)
        val first = at(LocalDate.of(2026, 4, 1), 10)
        assertTrue(ReminderRules.mayTrigger(reminder, entering = true, nowMillis = first, zoneId = zone))
        val sameDay = first + 2 * 60 * 60 * 1_000L
        assertFalse(ReminderRules.mayTrigger(reminder.copy(lastTriggeredAt = first), true, sameDay, zone))
        val nextDay = at(LocalDate.of(2026, 4, 2), 10)
        assertTrue(ReminderRules.mayTrigger(reminder.copy(lastTriggeredAt = first), true, nextDay, zone))
    }

    @Test
    fun weeklyAndCustomRecurrenceRespectTheirIntervals() {
        val monday = at(LocalDate.of(2026, 4, 6), 9)
        val nextMonday = at(LocalDate.of(2026, 4, 13), 9)
        assertFalse(ReminderRules.mayTrigger(reminder(RecurrenceType.WEEKLY).copy(lastTriggeredAt = monday), true, monday + 24 * 60 * 60 * 1_000L, zone))
        assertTrue(ReminderRules.mayTrigger(reminder(RecurrenceType.WEEKLY).copy(lastTriggeredAt = monday), true, nextMonday, zone))

        val custom = reminder(RecurrenceType.CUSTOM).copy(lastTriggeredAt = monday, customIntervalDays = 3)
        assertFalse(ReminderRules.mayTrigger(custom, true, at(LocalDate.of(2026, 4, 8), 23), zone))
        assertTrue(ReminderRules.mayTrigger(custom, true, at(LocalDate.of(2026, 4, 9), 0), zone))
    }

    @Test
    fun everyVisitAllowsEnterAndExitButDebouncesDuplicateDelivery() {
        val now = at(LocalDate.of(2026, 4, 1), 10)
        val reminder = reminder(RecurrenceType.EVERY_VISIT).copy(
            triggerType = TriggerType.ENTER_OR_EXIT.storageValue,
            lastTriggeredAt = now,
            lastTransitionType = "ENTER",
        )
        assertFalse(ReminderRules.mayTrigger(reminder, entering = true, nowMillis = now + 1_000, zoneId = zone))
        assertTrue(ReminderRules.mayTrigger(reminder, entering = false, nowMillis = now + 1_000, zoneId = zone))
    }

    @Test
    fun onceAndDisabledRemindersCannotTriggerTwice() {
        val now = at(LocalDate.of(2026, 4, 1), 10)
        assertFalse(ReminderRules.mayTrigger(reminder(RecurrenceType.ONCE).copy(lastTriggeredAt = now), true, now + 60_000, zone))
        assertFalse(ReminderRules.mayTrigger(reminder(RecurrenceType.EVERY_VISIT).copy(enabled = false), true, now, zone))
    }

    private fun reminder(recurrence: RecurrenceType) = LocationReminder(
        id = "test-id",
        title = "Test place",
        message = "Test message",
        latitude = 23.8,
        longitude = 90.4,
        radiusMeters = 200,
        triggerType = TriggerType.ENTER.storageValue,
        recurrenceType = recurrence.storageValue,
        enabled = true,
        notificationId = 1,
        createdAt = 0,
        updatedAt = 0,
        lastTriggeredAt = null,
        customIntervalDays = 3,
    )

    private fun at(day: LocalDate, hour: Int): Long = day.atTime(hour, 0).atZone(zone).toInstant().toEpochMilli()
}
