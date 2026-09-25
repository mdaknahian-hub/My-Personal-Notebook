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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddLocationAlt
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.NotificationsNone
import androidx.compose.material.icons.filled.PowerSettingsNew
import androidx.compose.material.icons.filled.Science
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.nahian.mypersonalnotebook.data.LocationReminder
import com.nahian.mypersonalnotebook.data.RecurrenceType
import com.nahian.mypersonalnotebook.data.TriggerType
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
internal fun LocationReminderListScreen(
    reminders: List<LocationReminder>,
    permissionIssue: PermissionIssue?,
    batteryOptimizationExempt: Boolean,
    onCreate: () -> Unit,
    onSetupPermissions: () -> Unit,
    onOpenBatterySettings: () -> Unit,
    onEdit: (LocationReminder) -> Unit,
    onToggle: (LocationReminder, Boolean) -> Unit,
    onTest: (LocationReminder) -> Unit,
    onOpenMap: (LocationReminder) -> Unit,
    onDelete: (LocationReminder) -> Unit,
) {
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Column(Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
            Text("My Personal Notebook", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Location Reminders", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    Text("A useful nudge, right where you need it.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onClick = onCreate) {
                    Icon(Icons.Filled.AddLocationAlt, contentDescription = "Create location reminder", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(30.dp))
                }
            }
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                OverviewCard(reminders = reminders)
            }
            if (permissionIssue != null) {
                item {
                    PermissionIssueCard(issue = permissionIssue, onAction = onSetupPermissions)
                }
            }
            if (reminders.any { it.enabled && !it.registered } && permissionIssue == null) {
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.ErrorOutline, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                            Column(Modifier.weight(1f).padding(start = 10.dp)) {
                                Text("Some reminders need attention", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onErrorContainer)
                                Text("Open or edit a reminder to see why it could not be registered.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onErrorContainer)
                            }
                        }
                    }
                }
            }
            if (reminders.any { it.enabled } && !batteryOptimizationExempt) {
                item { BatteryOptimizationCard(onOpenSettings = onOpenBatterySettings) }
            }
            item {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp, bottom = 2.dp)) {
                    Text("Your reminders", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                    Text("${reminders.size}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            if (reminders.isEmpty()) {
                item { EmptyState(onCreate = onCreate) }
            } else {
                items(reminders, key = { it.id }) { reminder ->
                    ReminderCard(
                        reminder = reminder,
                        onEdit = { onEdit(reminder) },
                        onToggle = { onToggle(reminder, it) },
                        onTest = { onTest(reminder) },
                        onMap = { onOpenMap(reminder) },
                        onDelete = { onDelete(reminder) },
                    )
                }
            }
            item {
                Text(
                    "Geofences are monitored by Android / Google Play services. Location reminders can work without mobile data after registration, but map tiles and place search need a network.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp, bottom = 8.dp),
                )
            }
        }
    }
}

@Composable
private fun OverviewCard(reminders: List<LocationReminder>) {
    val active = reminders.count { it.enabled }
    val registered = reminders.count { it.enabled && it.registered }
    Surface(color = MaterialTheme.colorScheme.primary, shape = RoundedCornerShape(22.dp)) {
        Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("At the right place, at the right time", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onPrimary, fontWeight = FontWeight.SemiBold)
                Text(
                    if (active == 0) "Create a place-based reminder to get started."
                    else "$registered of $active active ${if (active == 1) "geofence" else "geofences"} registered with Android",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.85f),
                    modifier = Modifier.padding(top = 5.dp),
                )
                Text("No continuous GPS tracking", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.9f), modifier = Modifier.padding(top = 10.dp))
            }
            Icon(Icons.Filled.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.secondaryContainer, modifier = Modifier.size(42.dp))
        }
    }
}

@Composable
private fun PermissionIssueCard(issue: PermissionIssue, onAction: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)) {
        Column(Modifier.padding(15.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.NotificationsActive, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Text(issue.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 9.dp))
            }
            Text(issue.explanation, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 6.dp))
            Button(onClick = onAction, modifier = Modifier.padding(top = 10.dp)) { Text(issue.actionLabel) }
        }
    }
}

@Composable
private fun BatteryOptimizationCard(onOpenSettings: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.PowerSettingsNew, contentDescription = null, tint = MaterialTheme.colorScheme.secondary)
            Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                Text("Battery restrictions may delay alerts", style = MaterialTheme.typography.titleSmall)
                Text("Android's geofence is low-power; some manufacturers still restrict background delivery.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text("Settings", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(start = 2.dp))
            IconButton(onClick = onOpenSettings) { Icon(Icons.Filled.PowerSettingsNew, contentDescription = "Open battery settings") }
        }
    }
}

@Composable
private fun EmptyState(onCreate: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(
            Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 30.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(Icons.Filled.BookmarkBorder, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(48.dp))
            Text("Nothing pinned to a place yet", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 12.dp))
            Text("Set a location, radius, trigger, and message. Android will notify you when the geofence transition happens.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
            Button(onClick = onCreate, modifier = Modifier.padding(top = 16.dp)) { Text("Create first reminder") }
        }
    }
}

@Composable
private fun ReminderCard(
    reminder: LocationReminder,
    onEdit: () -> Unit,
    onToggle: (Boolean) -> Unit,
    onTest: () -> Unit,
    onMap: () -> Unit,
    onDelete: () -> Unit,
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(20.dp),
    ) {
        Column(Modifier.fillMaxWidth().padding(15.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    if (reminder.enabled && reminder.registered) Icons.Filled.NotificationsActive else Icons.Filled.NotificationsNone,
                    contentDescription = null,
                    tint = if (reminder.enabled && reminder.registered) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Column(Modifier.weight(1f).padding(start = 10.dp)) {
                    Text(reminder.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text(
                        if (reminder.enabled && reminder.registered) "Registered with Android" else if (reminder.enabled) "Needs attention" else "Disabled",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (reminder.enabled && reminder.registered) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Switch(checked = reminder.enabled, onCheckedChange = onToggle)
            }

            Text(reminder.message, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.padding(top = 12.dp))
            Row(modifier = Modifier.padding(top = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(18.dp))
                Text("${radiusLabel(reminder.radiusMeters)} · ${triggerLabel(reminder.triggerType)}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(start = 5.dp))
                Spacer(Modifier.weight(1f))
                Text(recurrenceLabel(reminder), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            reminder.registrationError?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
            }
            Text(
                reminder.lastTriggeredAt?.let { "Last triggered ${formatTimestamp(it)}" } ?: "Last triggered: never",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp),
            )
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButtonIcon("Map", Icons.Filled.Map, onMap, Modifier.weight(1f))
                TextButtonIcon("Test", Icons.Filled.Science, onTest, Modifier.weight(1f))
                TextButtonIcon("Edit", Icons.Filled.Edit, onEdit, Modifier.weight(1f))
                TextButtonIcon("Delete", Icons.Filled.DeleteOutline, onDelete, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun TextButtonIcon(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit, modifier: Modifier = Modifier) {
    androidx.compose.material3.TextButton(onClick = onClick, modifier = modifier) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp))
            Text(label, style = MaterialTheme.typography.labelSmall)
        }
    }
}

private fun radiusLabel(radius: Int): String = if (radius == 1_000) "1 km" else "$radius m"

private fun triggerLabel(value: String): String = when (TriggerType.fromStorage(value)) {
    TriggerType.ENTER -> "On enter"
    TriggerType.EXIT -> "On exit"
    TriggerType.ENTER_OR_EXIT -> "Enter or exit"
}

private fun recurrenceLabel(reminder: LocationReminder): String = when (RecurrenceType.fromStorage(reminder.recurrenceType)) {
    RecurrenceType.ONCE -> "Once"
    RecurrenceType.EVERY_VISIT -> "Every visit"
    RecurrenceType.DAILY -> "Daily"
    RecurrenceType.WEEKLY -> "Weekly"
    RecurrenceType.CUSTOM -> "Every ${reminder.customIntervalDays} days"
}

private fun formatTimestamp(timestamp: Long): String = runCatching {
    DateTimeFormatter.ofPattern("MMM d, yyyy · h:mm a", Locale.getDefault())
        .withZone(ZoneId.systemDefault())
        .format(Instant.ofEpochMilli(timestamp))
}.getOrDefault("${timestamp}")
