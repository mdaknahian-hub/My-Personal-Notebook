package com.nahian.mypersonalnotebook.ui

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.nahian.mypersonalnotebook.data.ChecklistTaskTimeLimit
import com.nahian.mypersonalnotebook.data.ChecklistTaskTimeLimitType
import java.text.DateFormat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@Composable
internal fun ChecklistTaskTimeLimitDialog(
    initialLimit: ChecklistTaskTimeLimit,
    onDismiss: () -> Unit,
    onSave: (ChecklistTaskTimeLimit) -> Unit,
) {
    val context = LocalContext.current
    var selectedType by remember(initialLimit) { mutableStateOf(initialLimit.type) }
    var deadlineAt by remember(initialLimit) {
        mutableLongStateOf(initialLimit.deadlineAt ?: (System.currentTimeMillis() + DEFAULT_COUNTDOWN_MS))
    }
    val initialDuration = initialLimit.countdownDurationMillis ?: DEFAULT_COUNTDOWN_MS
    var durationHours by remember(initialLimit) { mutableStateOf((initialDuration / HOUR_MS).toString()) }
    var durationMinutes by remember(initialLimit) { mutableStateOf(((initialDuration % HOUR_MS) / MINUTE_MS).toString()) }
    var startImmediately by remember(initialLimit) {
        mutableStateOf(initialLimit.type != ChecklistTaskTimeLimitType.COUNTDOWN || initialLimit.startCountdownWhenSaved)
    }
    var validationError by remember(initialLimit) { mutableStateOf<String?>(null) }

    fun selectDate() {
        val calendar = Calendar.getInstance().apply { timeInMillis = deadlineAt }
        DatePickerDialog(
            context,
            { _, year, month, day ->
                deadlineAt = Calendar.getInstance().apply {
                    timeInMillis = deadlineAt
                    set(Calendar.YEAR, year)
                    set(Calendar.MONTH, month)
                    set(Calendar.DAY_OF_MONTH, day)
                }.timeInMillis
            },
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH),
            calendar.get(Calendar.DAY_OF_MONTH),
        ).show()
    }

    fun selectTime() {
        val calendar = Calendar.getInstance().apply { timeInMillis = deadlineAt }
        TimePickerDialog(
            context,
            { _, hour, minute ->
                deadlineAt = Calendar.getInstance().apply {
                    timeInMillis = deadlineAt
                    set(Calendar.HOUR_OF_DAY, hour)
                    set(Calendar.MINUTE, minute)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }.timeInMillis
            },
            calendar.get(Calendar.HOUR_OF_DAY),
            calendar.get(Calendar.MINUTE),
            android.text.format.DateFormat.is24HourFormat(context),
        ).show()
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(uiText("Task time limit")) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    FilterChip(selected = selectedType == ChecklistTaskTimeLimitType.NONE, onClick = { selectedType = ChecklistTaskTimeLimitType.NONE }, label = { Text(uiText("No limit")) })
                    FilterChip(selected = selectedType == ChecklistTaskTimeLimitType.DEADLINE, onClick = { selectedType = ChecklistTaskTimeLimitType.DEADLINE }, label = { Text(uiText("Deadline")) })
                    FilterChip(selected = selectedType == ChecklistTaskTimeLimitType.COUNTDOWN, onClick = { selectedType = ChecklistTaskTimeLimitType.COUNTDOWN }, label = { Text(uiText("Countdown")) })
                }
                when (selectedType) {
                    ChecklistTaskTimeLimitType.NONE -> Text(uiText("This task will not have a time limit."), style = MaterialTheme.typography.bodySmall)
                    ChecklistTaskTimeLimitType.DEADLINE -> {
                        Text(uiText("Choose the date and time when the task is due."), style = MaterialTheme.typography.bodySmall)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            TextButton(onClick = ::selectDate) {
                                Text(DateFormat.getDateInstance(DateFormat.MEDIUM).format(Date(deadlineAt)))
                            }
                            TextButton(onClick = ::selectTime) {
                                Text(SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(deadlineAt)))
                            }
                        }
                    }
                    ChecklistTaskTimeLimitType.COUNTDOWN -> {
                        Text(uiText("Set a countdown duration for this task."), style = MaterialTheme.typography.bodySmall)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = durationHours,
                                onValueChange = { durationHours = it.filter(Char::isDigit).take(5) },
                                modifier = Modifier.weight(1f),
                                label = { Text(uiText("Hours")) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                            )
                            OutlinedTextField(
                                value = durationMinutes,
                                onValueChange = { durationMinutes = it.filter(Char::isDigit).take(2) },
                                modifier = Modifier.weight(1f),
                                label = { Text(uiText("Minutes")) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                            )
                        }
                        Text(uiText("When should this countdown begin?"), style = MaterialTheme.typography.labelMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            FilterChip(selected = startImmediately, onClick = { startImmediately = true }, label = { Text(uiText("Start when saved")) })
                            FilterChip(selected = !startImmediately, onClick = { startImmediately = false }, label = { Text(uiText("Start manually")) })
                        }
                    }
                }
                validationError?.let { Text(uiText(it), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val next = when (selectedType) {
                    ChecklistTaskTimeLimitType.NONE -> ChecklistTaskTimeLimit.None
                    ChecklistTaskTimeLimitType.DEADLINE -> {
                        if (deadlineAt <= System.currentTimeMillis() && deadlineAt != initialLimit.deadlineAt) {
                            validationError = "Choose a future deadline."
                            return@TextButton
                        }
                        ChecklistTaskTimeLimit(deadlineAt = deadlineAt)
                    }
                    ChecklistTaskTimeLimitType.COUNTDOWN -> {
                        val hours = durationHours.toLongOrNull() ?: 0L
                        val minutes = durationMinutes.toLongOrNull() ?: 0L
                        val totalMinutes = hours * 60 + minutes
                        if (totalMinutes !in 1..MAX_COUNTDOWN_MINUTES) {
                            validationError = "Choose a countdown from 1 minute to 365 days."
                            return@TextButton
                        }
                        ChecklistTaskTimeLimit(
                            countdownDurationMillis = totalMinutes * MINUTE_MS,
                            countdownStartedAt = initialLimit.countdownStartedAt.takeIf { startImmediately },
                            startCountdownWhenSaved = startImmediately,
                        )
                    }
                }
                if (!next.isValid()) {
                    validationError = "Choose one valid task time limit."
                    return@TextButton
                }
                onSave(next)
            }) { Text(uiText("Save")) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(uiText("Cancel")) } },
    )
}

private const val MINUTE_MS = 60_000L
private const val HOUR_MS = 60 * MINUTE_MS
private const val DEFAULT_COUNTDOWN_MS = HOUR_MS
private const val MAX_COUNTDOWN_MINUTES = 365L * 24 * 60
