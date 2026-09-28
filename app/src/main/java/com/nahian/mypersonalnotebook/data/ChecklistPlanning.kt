package com.nahian.mypersonalnotebook.data

/** Built-in planner categories used to organize checklist plans by work type. */
enum class ChecklistCategory(val storageValue: String, val labelKey: String) {
    MEETING("MEETING", "Meeting"),
    REPORT("REPORT", "Report"),
    PLANNING("PLANNING", "Planning"),
    FOCUS("FOCUS", "Focus work"),
    PERSONAL("PERSONAL", "Personal"),
    OTHER("OTHER", "Other");

    companion object {
        fun fromStorage(value: String?): ChecklistCategory =
            entries.firstOrNull { it.storageValue == value } ?: OTHER
    }
}

/** A daily clock-time block. Equal start/end times are rejected rather than treated as 24 hours. */
data class ChecklistTimeRange(
    val startMinutes: Int? = null,
    val endMinutes: Int? = null,
) {
    val isScheduled: Boolean get() = startMinutes != null && endMinutes != null

    fun isValid(): Boolean {
        if (startMinutes == null && endMinutes == null) return true
        if (startMinutes == null || endMinutes == null) return false
        if (startMinutes !in 0 until MINUTES_PER_DAY || endMinutes !in 0 until MINUTES_PER_DAY) return false
        return startMinutes != endMinutes
    }

    fun durationMinutes(): Int? {
        if (!isValid() || !isScheduled) return null
        val start = startMinutes ?: return null
        val end = endMinutes ?: return null
        return if (end > start) end - start else MINUTES_PER_DAY - start + end
    }

    companion object {
        const val MINUTES_PER_DAY = 24 * 60
    }
}

fun formatChecklistClockTime(minutesFromMidnight: Int): String {
    val normalized = Math.floorMod(minutesFromMidnight, ChecklistTimeRange.MINUTES_PER_DAY)
    val hours = normalized / 60
    val minutes = normalized % 60
    return "${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}"
}

fun isValidEstimatedDuration(minutes: Int?): Boolean =
    minutes == null || minutes in 1..ChecklistTimeRange.MINUTES_PER_DAY

/** Assigns sequential daily clock windows from the plan start; an unestimated task breaks later start-time estimates. */
fun calculateTaskClockRanges(
    estimatedDurationsMinutes: List<Int?>,
    planStartMinutes: Int?,
): List<Pair<Int, Int>?> {
    var cursor = planStartMinutes?.takeIf { it in 0 until ChecklistTimeRange.MINUTES_PER_DAY }
    return estimatedDurationsMinutes.map { duration ->
        val start = cursor
        val range = if (start != null && duration != null && isValidEstimatedDuration(duration)) {
            start to (start + duration)
        } else {
            null
        }
        cursor = range?.second
        range
    }
}

/** Zero-based task position displayed as A, B, ... Z, AA, AB, and so on. */
fun checklistTaskLetter(index: Int): String {
    if (index < 0) return ""
    var value = index + 1
    val result = StringBuilder()
    while (value > 0) {
        value--
        result.append(('A'.code + value % 26).toChar())
        value /= 26
    }
    return result.reverse().toString()
}
