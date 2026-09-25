package com.nahian.mypersonalnotebook.ui

import android.content.Context
import android.location.Address
import android.location.Geocoder
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.GpsFixed
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.core.content.ContextCompat
import android.Manifest
import android.content.pm.PackageManager
import android.location.Location
import android.preference.PreferenceManager
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.nahian.mypersonalnotebook.data.LocationPoint
import com.nahian.mypersonalnotebook.data.SavedLocation
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import org.osmdroid.config.Configuration
import org.osmdroid.events.MapEventsReceiver
import org.osmdroid.views.overlay.MapEventsOverlay
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.CopyrightOverlay
import org.osmdroid.views.overlay.Marker
import java.io.IOException
import java.util.Locale

private val pickerTabs = listOf("Current", "Map", "Search", "Saved")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun LocationPickerScreen(
    initialLocation: LocationPoint?,
    initialTab: Int,
    savedLocations: List<SavedLocation>,
    previewOnly: Boolean,
    onCancel: () -> Unit,
    onUse: (LocationPoint) -> Unit,
    onSaveLocation: (String, Double, Double) -> Unit,
    onDeleteSavedLocation: (Long) -> Unit,
    onRequestLocationPermission: () -> Unit,
) {
    var selectedTab by remember(initialTab) { mutableStateOf(initialTab.coerceIn(0, pickerTabs.lastIndex)) }
    var selectedLocation by remember(initialLocation) { mutableStateOf(initialLocation) }
    var searchText by remember { mutableStateOf("") }
    var savedLabel by remember(initialLocation) { mutableStateOf(initialLocation?.label.orEmpty()) }
    var searchResults by remember { mutableStateOf<List<LocationPoint>>(emptyList()) }
    var searching by remember { mutableStateOf(false) }
    var currentLocationLoading by remember { mutableStateOf(false) }
    var localError by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    fun selectLocation(location: LocationPoint) {
        selectedLocation = location
        savedLabel = location.label
        localError = null
        if (!previewOnly) onUse(location)
    }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onCancel) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = uiText("Back"))
            }
            Column(Modifier.weight(1f)) {
                Text(uiText(if (previewOnly) "Selected location" else "Choose a location"), style = MaterialTheme.typography.titleLarge)
                Text(uiText("Pick once; Android monitors the geofence"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        TabRow(selectedTabIndex = selectedTab) {
            pickerTabs.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = { selectedTab = index },
                    text = { Text(uiText(title)) },
                )
            }
        }

        when (selectedTab) {
            0 -> CurrentLocationTab(
                selected = selectedLocation,
                loading = currentLocationLoading,
                onUseCurrent = {
                    localError = null
                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED ||
                        !PermissionSupport.isLocationEnabled(context)
                    ) {
                        onRequestLocationPermission()
                    } else {
                        currentLocationLoading = true
                        scope.launch {
                            try {
                                selectLocation(currentDeviceLocation(context))
                            } catch (error: Exception) {
                                localError = error.message ?: "Could not get the current location. Turn on Location and try again."
                            } finally {
                                currentLocationLoading = false
                            }
                        }
                    }
                },
                error = localError,
            )
            1 -> Column(Modifier.fillMaxSize()) {
                Text(
                    if (previewOnly) "Tap the map to preview a point. Map tiles need internet."
                    else "Tap the map once to choose the geofence center; it will return to the form. Map tiles need internet.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 10.dp),
                )
                OsmLocationMap(
                    modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = 12.dp),
                    initial = selectedLocation,
                    selected = selectedLocation,
                    onSelected = ::selectLocation,
                )
                localError?.let { Text(uiText(it), color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(14.dp)) }
            }
            2 -> SearchLocationTab(
                query = searchText,
                results = searchResults,
                searching = searching,
                selected = selectedLocation,
                error = localError,
                onQueryChange = { searchText = it },
                onSearch = {
                    if (searchText.isBlank()) {
                        localError = "Enter a place, address, or landmark to search."
                    } else {
                        searching = true
                        localError = null
                        scope.launch {
                            try {
                                searchResults = geocodeSearch(context, searchText.trim())
                                if (searchResults.isEmpty()) localError = "No matching places were found. Try a fuller address or use the map."
                            } catch (error: Exception) {
                                localError = error.message ?: "Search is unavailable right now. You can still choose a point on the map."
                            } finally {
                                searching = false
                            }
                        }
                    }
                },
                onSelect = ::selectLocation,
            )
            else -> SavedLocationsTab(
                locations = savedLocations,
                selected = selectedLocation,
                savedLabel = savedLabel,
                onLabelChange = { savedLabel = it },
                onSelect = { selectLocation(LocationPoint(it.label, it.latitude, it.longitude)) },
                onSave = {
                    val value = selectedLocation
                    if (value == null) localError = "Choose a current, map, or search result first."
                    else if (savedLabel.isBlank()) localError = "Give this saved location a name."
                    else {
                        onSaveLocation(savedLabel.trim(), value.latitude, value.longitude)
                        localError = if (NotebookLanguageSettings.current == NotebookLanguage.BANGLA) "“${savedLabel.trim()}” এই ডিভাইসে সংরক্ষিত হয়েছে।" else "Saved ${savedLabel.trim()} on this device."
                    }
                },
                onDelete = onDeleteSavedLocation,
                error = localError,
            )
        }

        selectedLocation?.takeIf { previewOnly }?.let { location ->
            Surface(color = MaterialTheme.colorScheme.surface, shadowElevation = 4.dp) {
                Column(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Column(Modifier.weight(1f).padding(start = 9.dp)) {
                            Text(location.label, style = MaterialTheme.typography.titleSmall)
                            Text(
                                String.format(Locale.US, "%.5f, %.5f", location.latitude, location.longitude),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        TextButton(onClick = { selectedLocation = null; savedLabel = "" }) { Text(uiText("Clear")) }
                    }
                    Spacer(Modifier.height(8.dp))
                    Button(
                        onClick = { onUse(location) },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(uiText(if (previewOnly) "Done viewing map" else "Use this location"))
                    }
                }
            }
        }
    }
}

@Composable
private fun CurrentLocationTab(
    selected: LocationPoint?,
    loading: Boolean,
    onUseCurrent: () -> Unit,
    error: String?,
) {
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(Icons.Filled.GpsFixed, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(52.dp))
        Spacer(Modifier.height(14.dp))
        Text(uiText("Use your current location"), style = MaterialTheme.typography.titleMedium)
        Text(
            "A single current-location fix is used to set the geofence. No continuous GPS tracking is started.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(vertical = 8.dp),
        )
        Button(onClick = onUseCurrent, enabled = !loading) {
            if (loading) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
            else Text(uiText("Get current location"))
        }
        if (selected != null) Text(if (NotebookLanguageSettings.current == NotebookLanguage.BANGLA) "নির্বাচিত: ${selected.label}" else "Selected: ${selected.label}", modifier = Modifier.padding(top = 16.dp), style = MaterialTheme.typography.bodySmall)
        error?.let { Text(uiText(it), color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 12.dp)) }
    }
}

@Composable
private fun SearchLocationTab(
    query: String,
    results: List<LocationPoint>,
    searching: Boolean,
    selected: LocationPoint?,
    error: String?,
    onQueryChange: (String) -> Unit,
    onSearch: () -> Unit,
    onSelect: (LocationPoint) -> Unit,
) {
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp)) {
        Text(uiText("Search by address, business, or landmark"), style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = query,
                onValueChange = onQueryChange,
                label = { Text(uiText("Search places")) },
                singleLine = true,
                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                modifier = Modifier.weight(1f),
            )
            Button(onClick = onSearch, enabled = !searching, modifier = Modifier.padding(start = 8.dp)) {
                if (searching) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                else Text(uiText("Search"))
            }
        }
        error?.let { Text(uiText(it), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp)) }
        Spacer(Modifier.height(8.dp))
        LazyColumn(Modifier.weight(1f)) {
            items(results) { result ->
                LocationResultRow(result, selected == result, onClick = { onSelect(result) })
            }
        }
    }
}

@Composable
private fun SavedLocationsTab(
    locations: List<SavedLocation>,
    selected: LocationPoint?,
    savedLabel: String,
    onLabelChange: (String) -> Unit,
    onSelect: (SavedLocation) -> Unit,
    onSave: () -> Unit,
    onDelete: (Long) -> Unit,
    error: String?,
) {
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 10.dp)) {
        Text(uiText("Saved on this device"), style = MaterialTheme.typography.titleSmall)
        Text(uiText("Choose a saved place or save your current selection for later."), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(8.dp))
        if (locations.isEmpty()) {
            Text(uiText("No saved locations yet."), modifier = Modifier.padding(vertical = 18.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            LazyColumn(Modifier.weight(1f, fill = false)) {
                items(locations, key = { it.id }) { location ->
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { onSelect(location) }.padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Filled.BookmarkBorder, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Column(Modifier.weight(1f).padding(start = 10.dp)) {
                            Text(location.label, style = MaterialTheme.typography.bodyLarge)
                            Text(String.format(Locale.US, "%.5f, %.5f", location.latitude, location.longitude), style = MaterialTheme.typography.bodySmall)
                        }
                        IconButton(onClick = { onDelete(location.id) }) {
                            Icon(Icons.Filled.DeleteOutline, contentDescription = uiText("Delete saved location"))
                        }
                    }
                    HorizontalDivider()
                }
            }
        }
        if (selected != null) {
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = savedLabel,
                onValueChange = onLabelChange,
                label = { Text(uiText("Name this saved location")) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedButton(onClick = onSave, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                Text(uiText("Save selected location"))
            }
        }
        error?.let { Text(uiText(it), color = if (it.startsWith("Saved ") || it.startsWith("“")) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp)) }
    }
}

@Composable
private fun LocationResultRow(location: LocationPoint, selected: Boolean, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
        ),
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Column(Modifier.weight(1f).padding(start = 10.dp)) {
                Text(location.label, style = MaterialTheme.typography.bodyMedium)
                Text(String.format(Locale.US, "%.5f, %.5f", location.latitude, location.longitude), style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun OsmLocationMap(
    modifier: Modifier,
    initial: LocationPoint?,
    selected: LocationPoint?,
    onSelected: (LocationPoint) -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val selectedCallback by rememberUpdatedState(onSelected)
    val center = initial ?: selected
    val initialLatitude = center?.latitude ?: 23.8103
    val initialLongitude = center?.longitude ?: 90.4125
    val mapView = remember(context) {
        val appContext = context.applicationContext
        Configuration.getInstance().load(appContext, PreferenceManager.getDefaultSharedPreferences(appContext))
        Configuration.getInstance().userAgentValue = context.packageName
        MapView(context).apply {
            setTileSource(TileSourceFactory.MAPNIK)
            setMultiTouchControls(true)
            controller.setZoom(15.0)
            controller.setCenter(GeoPoint(initialLatitude, initialLongitude))
        }
    }
    val eventsOverlay = remember(mapView) {
        MapEventsOverlay(object : MapEventsReceiver {
            override fun singleTapConfirmedHelper(point: GeoPoint): Boolean {
                selectedCallback(LocationPoint("Pinned location", point.latitude, point.longitude))
                return true
            }

            override fun longPressHelper(point: GeoPoint): Boolean {
                selectedCallback(LocationPoint("Pinned location", point.latitude, point.longitude))
                return true
            }
        })
    }

    DisposableEffect(mapView, lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_RESUME -> mapView.onResume()
                Lifecycle.Event.ON_PAUSE -> mapView.onPause()
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        if (lifecycleOwner.lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) mapView.onResume()
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            mapView.onPause()
            mapView.onDetach()
        }
    }

    LaunchedEffect(selected?.latitude, selected?.longitude) {
        if (selected != null) mapView.controller.animateTo(GeoPoint(selected.latitude, selected.longitude))
    }

    AndroidView(
        modifier = modifier,
        factory = { _ ->
            mapView.apply {
                if (overlays.none { it is CopyrightOverlay }) overlays.add(CopyrightOverlay(context))
                if (!overlays.contains(eventsOverlay)) overlays.add(eventsOverlay)
            }
        },
        update = { view ->
            view.overlays.removeAll { it is Marker }
            selected?.let { point ->
                view.overlays.add(Marker(view).apply {
                    position = GeoPoint(point.latitude, point.longitude)
                    title = point.label
                    setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                })
            }
            view.invalidate()
        },
    )
}

private suspend fun currentDeviceLocation(context: Context): LocationPoint {
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
        throw SecurityException("Precise location permission was denied. Allow it and try again.")
    }
    val cancellation = CancellationTokenSource()
    val location: Location? = LocationServices.getFusedLocationProviderClient(context)
        .getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cancellation.token)
        .await()
    if (location == null) throw IOException("Could not get a location fix. Check that Location is on and try again.")
    if (!location.latitude.isFinite() || !location.longitude.isFinite()) throw IOException("The device returned invalid coordinates.")
    return LocationPoint("Current location", location.latitude, location.longitude)
}

private suspend fun geocodeSearch(context: Context, query: String): List<LocationPoint> = withContext(Dispatchers.IO) {
    if (!Geocoder.isPresent()) throw IOException("Place search is not available on this device. Use the map instead.")
    @Suppress("DEPRECATION")
    val addresses: List<Address> = Geocoder(context, Locale.getDefault()).getFromLocationName(query, 8).orEmpty()
    addresses.mapNotNull { address ->
        if (!address.hasLatitude() || !address.hasLongitude()) null
        else LocationPoint(
            label = address.featureName?.takeIf { it.isNotBlank() } ?: address.getAddressLine(0)?.takeIf { it.isNotBlank() } ?: query,
            latitude = address.latitude,
            longitude = address.longitude,
        )
    }
}
