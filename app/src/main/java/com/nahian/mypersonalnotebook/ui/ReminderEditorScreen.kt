package com.nahian.mypersonalnotebook.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.nahian.mypersonalnotebook.data.RecurrenceType
import com.nahian.mypersonalnotebook.data.TriggerType
import com.nahian.mypersonalnotebook.domain.ReminderRules
import java.util.Locale

@Composable
internal fun ReminderEditorScreen(
    draft: ReminderDraft,
    isSaving: Boolean,
    onChange: (ReminderDraft) -> Unit,
    onChooseLocation: () -> Unit,
    onSave: () -> Unit,
    onCancel: () -> Unit,
) {
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onCancel) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
            Column(Modifier.weight(1f)) {
                Text(uiText(if (draft.createdAt > 0) "Edit location reminder" else "New location reminder"), style = MaterialTheme.typography.titleLarge)
                Text(uiText("A system geofence, not background GPS tracking"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Column(
            modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 18.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            OutlinedTextField(
                value = draft.title,
                onValueChange = { onChange(draft.copy(title = it)) },
                label = { Text(uiText("Reminder title / location name")) },
                placeholder = { Text(uiText("e.g. Alpha Clothing Ltd.")) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            OutlinedTextField(
                value = draft.message,
                onValueChange = { onChange(draft.copy(message = it)) },
                label = { Text(uiText("Reminder message")) },
                placeholder = { Text(uiText("e.g. Packing Report জমা দিতে হবে")) },
                minLines = 3,
                modifier = Modifier.fillMaxWidth(),
            )

            Column {
                SectionLabel("Location")
                OutlinedButton(onClick = onChooseLocation, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Filled.Map, contentDescription = null)
                    Text(uiText(if (draft.latitude == null || draft.longitude == null) "Choose location" else "Change / view on map"), modifier = Modifier.padding(start = 8.dp))
                }
                if (draft.latitude != null && draft.longitude != null) {
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        shape = RoundedCornerShape(16.dp),
                    ) {
                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            Column(Modifier.weight(1f).padding(start = 10.dp)) {
                                Text(draft.locationName.ifBlank { draft.title.ifBlank { "Selected location" } }, fontWeight = FontWeight.SemiBold)
                                Text(String.format(Locale.US, "%.5f, %.5f", draft.latitude, draft.longitude), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }

            Column {
                SectionLabel("Geofence radius")
                Text(uiText("A larger radius can improve reliability in dense areas."), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ReminderRules.allowedRadiiMeters.sorted().forEach { radius ->
                        FilterChip(
                            selected = draft.radiusMeters == radius,
                            onClick = { onChange(draft.copy(radiusMeters = radius)) },
                            label = { Text(uiText(if (radius == 1_000) "1 km" else "$radius m")) },
                            leadingIcon = if (draft.radiusMeters == radius) ({ Icon(Icons.Filled.Check, contentDescription = null) }) else null,
                        )
                    }
                }
            }

            Column {
                SectionLabel("Trigger")
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TriggerType.entries.forEach { trigger ->
                        FilterChip(
                            selected = draft.triggerType == trigger.storageValue,
                            onClick = { onChange(draft.copy(triggerType = trigger.storageValue)) },
                            label = { Text(when (trigger) {
                                TriggerType.ENTER -> "On enter"
                                TriggerType.EXIT -> "On exit"
                                TriggerType.ENTER_OR_EXIT -> "Enter or exit"
                            }) },
                            leadingIcon = if (draft.triggerType == trigger.storageValue) ({ Icon(Icons.Filled.Check, contentDescription = null) }) else null,
                        )
                    }
                }
            }

            Column {
                SectionLabel("Recurrence")
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    RecurrenceType.entries.forEach { recurrence ->
                        FilterChip(
                            selected = draft.recurrenceType == recurrence.storageValue,
                            onClick = { onChange(draft.copy(recurrenceType = recurrence.storageValue)) },
                            label = { Text(recurrence.label) },
                            leadingIcon = if (draft.recurrenceType == recurrence.storageValue) ({ Icon(Icons.Filled.Check, contentDescription = null) }) else null,
                        )
                    }
                }
                if (draft.recurrenceType == RecurrenceType.CUSTOM.storageValue) {
                    OutlinedTextField(
                        value = draft.customIntervalText,
                        onValueChange = { text -> onChange(draft.copy(customIntervalText = text.filter(Char::isDigit).take(3))) },
                        label = { Text(uiText("Repeat every (days)")) },
                        supportingText = { Text(uiText("Choose 1–365 days. The app checks recurrence only when Android delivers a geofence transition.")) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                    )
                }
            }

            Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(16.dp)) {
                Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(uiText("Reminder active"), style = MaterialTheme.typography.titleSmall)
                        Text(uiText("Turn this off to keep it saved without registering a geofence."), style = MaterialTheme.typography.bodySmall)
                    }
                    Switch(checked = draft.enabled, onCheckedChange = { onChange(draft.copy(enabled = it)) })
                }
            }

            Text(
                "Android's Geofencing API monitors this boundary. No continuous GPS service is used. Geofence timing is controlled by Android and may be approximate.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(12.dp))
        }

        Surface(color = MaterialTheme.colorScheme.surface, shadowElevation = 5.dp) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                TextButton(onClick = onCancel, modifier = Modifier.weight(1f), enabled = !isSaving) { Text(uiText("Cancel")) }
                Button(onClick = onSave, modifier = Modifier.weight(1.3f), enabled = !isSaving) {
                    if (isSaving) androidx.compose.material3.CircularProgressIndicator(Modifier.height(18.dp), strokeWidth = 2.dp)
                    else Text(uiText("Save reminder"))
                }
            }
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
    Spacer(Modifier.height(5.dp))
}
