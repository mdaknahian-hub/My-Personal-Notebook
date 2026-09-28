package com.nahian.mypersonalnotebook.ui

import android.app.TimePickerDialog
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.nahian.mypersonalnotebook.data.ChecklistCategory
import com.nahian.mypersonalnotebook.data.ChecklistTimeRange
import com.nahian.mypersonalnotebook.data.ChecklistTaskTimeLimit
import com.nahian.mypersonalnotebook.data.ChecklistTaskTimeLimitType
import com.nahian.mypersonalnotebook.data.NotebookChecklist
import com.nahian.mypersonalnotebook.data.NotebookChecklistItem
import com.nahian.mypersonalnotebook.data.formatChecklistClockTime
import java.text.DateFormat
import java.util.Date

@Composable
internal fun ChecklistPlanDialog(
    initialChecklist: NotebookChecklist?,
    initialCategory: ChecklistCategory? = null,
    onDismiss: () -> Unit,
    onSave: (String, ChecklistCategory, ChecklistTimeRange) -> Unit,
) {
    val context = LocalContext.current
    var title by remember(initialChecklist) { mutableStateOf(initialChecklist?.title.orEmpty()) }
    var category by remember(initialChecklist, initialCategory) {
        mutableStateOf(initialChecklist?.let { ChecklistCategory.fromStorage(it.categoryType) } ?: initialCategory ?: ChecklistCategory.OTHER)
    }
    var startMinutes by remember(initialChecklist) { mutableStateOf(initialChecklist?.scheduledStartMinutes) }
    var endMinutes by remember(initialChecklist) { mutableStateOf(initialChecklist?.scheduledEndMinutes) }
    var categoryMenuOpen by remember(initialChecklist, initialCategory) { mutableStateOf(false) }
    val timeRange = ChecklistTimeRange(startMinutes, endMinutes)
    val valid = title.isNotBlank() && timeRange.isValid()

    fun openTimePicker(isStart: Boolean) {
        val oldValue = if (isStart) startMinutes else endMinutes
        val defaultValue = if (isStart) 8 * 60 else 9 * 60
        val selectedValue = oldValue ?: defaultValue
        TimePickerDialog(
            context,
            { _, hour, minute ->
                val value = hour * 60 + minute
                if (isStart) startMinutes = value else endMinutes = value
            },
            selectedValue / 60,
            selectedValue % 60,
            android.text.format.DateFormat.is24HourFormat(context),
        ).show()
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(uiText(if (initialChecklist == null) "New checklist plan" else "Edit checklist plan")) },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth().heightIn(max = 520.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it.take(80) },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text(uiText("Plan name")) },
                    placeholder = { Text(uiText("For example, Morning meeting")) },
                    singleLine = true,
                )
                Text(uiText("Plan type"), style = MaterialTheme.typography.labelLarge)
                androidx.compose.foundation.layout.Box {
                    OutlinedButton(onClick = { categoryMenuOpen = true }) {
                        Text(uiText(category.labelKey))
                    }
                    DropdownMenu(
                        expanded = categoryMenuOpen,
                        onDismissRequest = { categoryMenuOpen = false },
                    ) {
                        ChecklistCategory.entries.forEach { option ->
                            DropdownMenuItem(
                                text = { Text(uiText(option.labelKey)) },
                                onClick = {
                                    category = option
                                    categoryMenuOpen = false
                                },
                            )
                        }
                    }
                }
                Text(uiText("Daily time block"), style = MaterialTheme.typography.labelLarge)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { openTimePicker(true) }, modifier = Modifier.weight(1f)) {
                        Text(startMinutes?.let(::formatChecklistClockTime) ?: uiText("Start time"), maxLines = 1)
                    }
                    Text("–", modifier = Modifier.padding(top = 12.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedButton(onClick = { openTimePicker(false) }, modifier = Modifier.weight(1f)) {
                        Text(endMinutes?.let(::formatChecklistClockTime) ?: uiText("End time"), maxLines = 1)
                    }
                }
                Text(
                    uiText("Set a daily time block for this plan. Tasks can each have their own estimated duration."),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (startMinutes != null || endMinutes != null) {
                    TextButton(onClick = { startMinutes = null; endMinutes = null }) {
                        Text(uiText("Clear schedule"))
                    }
                }
                if (!timeRange.isValid()) {
                    Text(uiText("Choose both a valid start and end time, or leave the schedule empty."), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(title.trim(), category, timeRange) },
                enabled = valid,
            ) { Text(uiText("Save plan")) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(uiText("Cancel")) } },
    )
}

@Composable
internal fun ChecklistTaskEditorDialog(
    initialTask: NotebookChecklistItem?,
    onDismiss: () -> Unit,
    onSave: (String, Int, ChecklistTaskTimeLimit) -> Unit,
) {
    var text by remember(initialTask?.id) { mutableStateOf(initialTask?.text.orEmpty()) }
    var estimatedMinutes by remember(initialTask?.id) { mutableStateOf(initialTask?.estimatedDurationMinutes) }
    var timeLimit by remember(initialTask?.id) {
        mutableStateOf(initialTask?.let { ChecklistTaskTimeLimit.from(it) } ?: ChecklistTaskTimeLimit.None)
    }
    var showEstimateDialog by remember(initialTask?.id) { mutableStateOf(false) }
    var showTimeLimitDialog by remember(initialTask?.id) { mutableStateOf(false) }

    if (!showEstimateDialog && !showTimeLimitDialog) {
        AlertDialog(
            onDismissRequest = onDismiss,
            title = { Text(uiText(if (initialTask == null) "Add task" else "Edit task")) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = text,
                        onValueChange = { text = it.take(160) },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text(uiText("Task description")) },
                        minLines = 2,
                        maxLines = 4,
                    )
                    OutlinedButton(onClick = { showEstimateDialog = true }, modifier = Modifier.fillMaxWidth()) {
                        Text(
                            estimatedMinutes?.let { "${uiText("Estimated time")}: ${formatEstimatedMinutes(it)}" }
                                ?: uiText("Choose estimated time"),
                        )
                    }
                    Text(
                        uiText("Estimated time is for planning. Deadline/countdown alerts are optional and set separately."),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    TextButton(onClick = { showTimeLimitDialog = true }) {
                        Text("${uiText("Task time alert")}: ${timeLimitSummary(timeLimit)}")
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        estimatedMinutes?.let { onSave(text.trim(), it, timeLimit) }
                    },
                    enabled = text.isNotBlank() && estimatedMinutes != null,
                ) { Text(uiText("Save task")) }
            },
            dismissButton = { TextButton(onClick = onDismiss) { Text(uiText("Cancel")) } },
        )
    }

    if (showEstimateDialog) {
        ChecklistTaskEstimateDialog(
            initialMinutes = estimatedMinutes,
            onDismiss = { showEstimateDialog = false },
            onSave = { estimatedMinutes = it; showEstimateDialog = false },
        )
    }
    if (showTimeLimitDialog) {
        ChecklistTaskTimeLimitDialog(
            initialLimit = timeLimit,
            onDismiss = { showTimeLimitDialog = false },
            onSave = { timeLimit = it; showTimeLimitDialog = false },
        )
    }
}

@Composable
private fun ChecklistTaskEstimateDialog(
    initialMinutes: Int?,
    onDismiss: () -> Unit,
    onSave: (Int) -> Unit,
) {
    val quickChoices = listOf(5, 10, 15, 20, 30, 45, 60, 90, 120)
    val initialQuickChoice = initialMinutes?.takeIf { it in quickChoices }
    var selectedQuickChoice by remember(initialMinutes) { mutableStateOf(initialQuickChoice) }
    var customMinutesText by remember(initialMinutes) {
        mutableStateOf(initialMinutes?.takeIf { it !in quickChoices }?.toString().orEmpty())
    }
    val customMinutes = customMinutesText.toIntOrNull()
    val selectedMinutes = customMinutes ?: selectedQuickChoice
    val valid = selectedMinutes != null && selectedMinutes in 1..ChecklistTimeRange.MINUTES_PER_DAY

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(uiText("Estimated task time")) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(uiText("Choose how many minutes to plan for this task."), style = MaterialTheme.typography.bodySmall)
                quickChoices.chunked(3).forEach { rowChoices ->
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        rowChoices.forEach { minutes ->
                            FilterChip(
                                selected = customMinutes == null && selectedQuickChoice == minutes,
                                onClick = {
                                    selectedQuickChoice = minutes
                                    customMinutesText = ""
                                },
                                label = { Text("$minutes ${uiText("min")}") },
                            )
                        }
                    }
                }
                OutlinedTextField(
                    value = customMinutesText,
                    onValueChange = {
                        customMinutesText = it.filter(Char::isDigit).take(4)
                        if (customMinutesText.isNotEmpty()) selectedQuickChoice = null
                    },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text(uiText("Custom minutes")) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                )
                Text(uiText("Use 1 to 1,440 minutes."), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        confirmButton = {
            Button(
                onClick = { selectedMinutes?.takeIf { it in 1..ChecklistTimeRange.MINUTES_PER_DAY }?.let(onSave) },
                enabled = valid,
            ) { Text(uiText("Set time")) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(uiText("Cancel")) } },
    )
}

internal fun formatEstimatedMinutes(minutes: Int): String = when {
    minutes < 60 -> "$minutes ${uiText("min")}"
    minutes % 60 == 0 -> "${minutes / 60} ${uiText("hr")}"
    else -> "${minutes / 60} ${uiText("hr")} ${minutes % 60} ${uiText("min")}"
}

private fun timeLimitSummary(limit: ChecklistTaskTimeLimit): String = when (limit.type) {
    ChecklistTaskTimeLimitType.NONE -> uiText("No time alert")
    ChecklistTaskTimeLimitType.DEADLINE -> DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT)
        .format(Date(limit.deadlineAt!!))
    ChecklistTaskTimeLimitType.COUNTDOWN -> buildString {
        append(formatEstimatedMinutes(((limit.countdownDurationMillis ?: 0L) / 60_000L).toInt()))
        append(" · ")
        append(
            uiText(
                when {
                    limit.countdownStartedAt != null -> "Running"
                    limit.startCountdownWhenSaved -> "Starts when saved"
                    else -> "Starts manually"
                },
            ),
        )
    }
}
