package com.nahian.mypersonalnotebook.ui

import android.Manifest
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.nahian.mypersonalnotebook.data.ContentResult
import com.nahian.mypersonalnotebook.data.TimeReminder
import com.nahian.mypersonalnotebook.data.TimeReminderRepository
import com.nahian.mypersonalnotebook.notifications.TimeReminderNotifications
import com.nahian.mypersonalnotebook.reminders.TimeReminderScheduler
import java.text.DateFormat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.UUID
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun TimeRemindersScreen(repository: TimeReminderRepository, onBack: () -> Unit) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val reminders by repository.observeAll().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var exactAlarmAllowed by remember { mutableStateOf(TimeReminderScheduler.canScheduleExactAlarms(context)) }
    var editorOpen by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<TimeReminder?>(null) }
    var editorId by remember { mutableStateOf<String?>(null) }
    var title by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var scheduledAt by remember { mutableLongStateOf(System.currentTimeMillis() + HOUR_MS) }
    var pendingDelete by remember { mutableStateOf<TimeReminder?>(null) }

    val notificationPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        scope.launch {
            snackbar.showSnackbar(if (granted) "Notifications allowed." else "Allow notifications in Android settings to receive reminders.")
        }
    }

    DisposableEffect(lifecycleOwner, context) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) exactAlarmAllowed = TimeReminderScheduler.canScheduleExactAlarms(context)
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    fun openEditor(reminder: TimeReminder?) {
        editing = reminder
        editorId = reminder?.id ?: UUID.randomUUID().toString()
        title = reminder?.title.orEmpty()
        message = reminder?.message.orEmpty()
        scheduledAt = reminder?.scheduledAt?.takeIf { it > System.currentTimeMillis() } ?: (System.currentTimeMillis() + HOUR_MS)
        editorOpen = true
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Time reminders") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back to summary") }
                },
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(onClick = { openEditor(null) }, icon = { Icon(Icons.Filled.Add, contentDescription = null) }, text = { Text("New reminder") })
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            if (!exactAlarmAllowed) {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                ) {
                    Column(Modifier.padding(14.dp)) {
                        Text("Allow exact alarms", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Text("Android needs this permission to alert close to the time you set.", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                        Button(onClick = {
                            try {
                                context.startActivity(TimeReminderScheduler.exactAlarmSettingsIntent(context))
                            } catch (_: Exception) {
                                context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")))
                            }
                        }, modifier = Modifier.padding(top = 8.dp)) { Text("Open alarm settings") }
                    }
                }
            }
            val needsNotificationPermission = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED
            if (needsNotificationPermission || !NotificationManagerCompat.from(context).areNotificationsEnabled()) {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
                ) {
                    Column(Modifier.padding(14.dp)) {
                        Text("Allow reminder notifications", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Text("Android will not display an alert while notifications are blocked.", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                        Button(onClick = {
                            if (needsNotificationPermission && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                            } else {
                                context.startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName))
                            }
                        }, modifier = Modifier.padding(top = 8.dp)) { Text("Allow notifications") }
                    }
                }
            }

            if (reminders.isEmpty()) {
                Column(
                    Modifier.weight(1f).fillMaxWidth().padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(Icons.Filled.Alarm, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(56.dp))
                    Text("Nothing scheduled yet", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 12.dp))
                    Text("Choose a date and time; Android will notify you then.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
                    Button(onClick = { openEditor(null) }, modifier = Modifier.padding(top = 16.dp)) { Text("Create first reminder") }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 100.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(reminders, key = { it.id }) { reminder ->
                        TimeReminderCard(
                            reminder = reminder,
                            onToggle = { enabled ->
                                scope.launch {
                                    when (val result = repository.setEnabled(reminder.id, enabled)) {
                                        ContentResult.Success -> Unit
                                        is ContentResult.Error -> snackbar.showSnackbar(result.message)
                                    }
                                }
                            },
                            onEdit = { openEditor(reminder) },
                            onDelete = { pendingDelete = reminder },
                        )
                    }
                }
            }
        }
    }

    if (editorOpen) {
        AlertDialog(
            onDismissRequest = { editorOpen = false },
            title = { Text(if (editing == null) "New time reminder" else "Edit time reminder") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Title") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = message, onValueChange = { message = it }, label = { Text("Reminder message") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        val calendar = Calendar.getInstance().apply { timeInMillis = scheduledAt }
                        TextButton(onClick = {
                            DatePickerDialog(
                                context,
                                { _, year, month, day ->
                                    scheduledAt = Calendar.getInstance().apply {
                                        timeInMillis = scheduledAt
                                        set(Calendar.YEAR, year)
                                        set(Calendar.MONTH, month)
                                        set(Calendar.DAY_OF_MONTH, day)
                                    }.timeInMillis
                                },
                                calendar.get(Calendar.YEAR),
                                calendar.get(Calendar.MONTH),
                                calendar.get(Calendar.DAY_OF_MONTH),
                            ).show()
                        }) { Text(DateFormat.getDateInstance(DateFormat.MEDIUM).format(Date(scheduledAt))) }
                        TextButton(onClick = {
                            val time = Calendar.getInstance().apply { timeInMillis = scheduledAt }
                            TimePickerDialog(
                                context,
                                { _, hour, minute ->
                                    scheduledAt = Calendar.getInstance().apply {
                                        timeInMillis = scheduledAt
                                        set(Calendar.HOUR_OF_DAY, hour)
                                        set(Calendar.MINUTE, minute)
                                        set(Calendar.SECOND, 0)
                                        set(Calendar.MILLISECOND, 0)
                                    }.timeInMillis
                                },
                                time.get(Calendar.HOUR_OF_DAY),
                                time.get(Calendar.MINUTE),
                                android.text.format.DateFormat.is24HourFormat(context),
                            ).show()
                        }) { Text(SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(scheduledAt))) }
                    }
                    Text("This creates a one-time notification. Android may delay it if exact-alarm access or notifications are turned off.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            },
            confirmButton = {
                Button(onClick = {
                    scope.launch {
                        val now = System.currentTimeMillis()
                        when (val result = repository.save(
                            TimeReminder(
                                id = editorId ?: UUID.randomUUID().toString(),
                                title = title,
                                message = message,
                                scheduledAt = scheduledAt,
                                enabled = true,
                                notificationId = editing?.notificationId ?: 0,
                                createdAt = editing?.createdAt ?: now,
                                updatedAt = now,
                                lastTriggeredAt = null,
                            ),
                        )) {
                            ContentResult.Success -> editorOpen = false
                            is ContentResult.Error -> snackbar.showSnackbar(result.message)
                        }
                    }
                }) { Text("Save") }
            },
            dismissButton = { TextButton(onClick = { editorOpen = false }) { Text("Cancel") } },
        )
    }

    pendingDelete?.let { reminder ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("Delete reminder?") },
            text = { Text("“${reminder.title}” and its scheduled alert will be removed.") },
            confirmButton = {
                Button(onClick = {
                    pendingDelete = null
                    scope.launch { repository.delete(reminder.id) }
                }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { pendingDelete = null }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun TimeReminderCard(
    reminder: TimeReminder,
    onToggle: (Boolean) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.fillMaxWidth().padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f).clickable(onClick = onEdit)) {
                    Text(reminder.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text(DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(reminder.scheduledAt)), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Switch(checked = reminder.enabled, onCheckedChange = onToggle)
            }
            Text(reminder.message, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 5.dp))
            reminder.scheduleError?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 5.dp)) }
            Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                IconButton(onClick = onEdit) { Icon(Icons.Filled.Edit, contentDescription = "Edit reminder") }
                IconButton(onClick = onDelete) { Icon(Icons.Filled.DeleteOutline, contentDescription = "Delete reminder") }
            }
        }
    }
}

private const val HOUR_MS = 60 * 60 * 1_000L
