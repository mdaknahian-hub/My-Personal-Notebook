package com.nahian.mypersonalnotebook.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ChecklistPlanningTest {
    @Test
    fun categoryStorageFallsBackSafelyForUnknownValues() {
        assertEquals(ChecklistCategory.MEETING, ChecklistCategory.fromStorage("MEETING"))
        assertEquals(ChecklistCategory.OTHER, ChecklistCategory.fromStorage("old-or-unknown"))
        assertEquals(ChecklistCategory.OTHER, ChecklistCategory.fromStorage(null))
    }

    @Test
    fun dailyScheduleBlockCalculatesDurationAndFormatsClockTimes() {
        val range = ChecklistTimeRange(startMinutes = 8 * 60, endMinutes = 8 * 60 + 50)
        assertTrue(range.isValid())
        assertEquals(50, range.durationMinutes())
        assertEquals("08:00", formatChecklistClockTime(range.startMinutes!!))
        assertEquals("08:50", formatChecklistClockTime(range.endMinutes!!))
    }

    @Test
    fun overnightScheduleBlockWrapsToNextDay() {
        val range = ChecklistTimeRange(startMinutes = 23 * 60 + 30, endMinutes = 30)
        assertTrue(range.isValid())
        assertEquals(60, range.durationMinutes())
        assertEquals("00:10", formatChecklistClockTime(24 * 60 + 10))
    }

    @Test
    fun scheduleRequiresEitherNoTimesOrAValidPair() {
        assertTrue(ChecklistTimeRange().isValid())
        assertNull(ChecklistTimeRange().durationMinutes())
        assertFalse(ChecklistTimeRange(startMinutes = 480).isValid())
        assertFalse(ChecklistTimeRange(startMinutes = 480, endMinutes = 480).isValid())
        assertFalse(ChecklistTimeRange(startMinutes = 1440, endMinutes = 500).isValid())
    }

    @Test
    fun taskEstimatesProduceSequentialClockWindowsWithinTheirPlan() {
        val ranges = calculateTaskClockRanges(listOf(5, 10, 30), 8 * 60)
        assertEquals(listOf(480 to 485, 485 to 495, 495 to 525), ranges)
    }

    @Test
    fun missingEstimateDoesNotInventFollowingClockTimes() {
        val ranges = calculateTaskClockRanges(listOf(5, null, 30), 8 * 60)
        assertEquals(480 to 485, ranges[0])
        assertNull(ranges[1])
        assertNull(ranges[2])
        assertEquals(listOf(null, null), calculateTaskClockRanges(listOf(5, 10), null))
    }

    @Test
    fun taskLettersContinuePastZ() {
        assertEquals("A", checklistTaskLetter(0))
        assertEquals("Z", checklistTaskLetter(25))
        assertEquals("AA", checklistTaskLetter(26))
        assertEquals("AB", checklistTaskLetter(27))
        assertEquals("", checklistTaskLetter(-1))
    }

    @Test
    fun taskEstimatesMustBeBetweenOneMinuteAndOneDay() {
        assertTrue(isValidEstimatedDuration(null))
        assertTrue(isValidEstimatedDuration(5))
        assertTrue(isValidEstimatedDuration(1440))
        assertFalse(isValidEstimatedDuration(0))
        assertFalse(isValidEstimatedDuration(-5))
        assertFalse(isValidEstimatedDuration(1441))
    }
}
