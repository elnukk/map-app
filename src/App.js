import React, { useState, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import locations from './locations.json';
import './App.css';

function FlyToBounds({ bounds }) {
  const map = useMap();
  if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
  return null;
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBounds, setSelectedBounds] = useState(null);
  const [year, setYear] = useState(1900);
  const [yearFilterEnabled, setYearFilterEnabled] = useState(false);

  const filteredLocations = useMemo(() => {
    if (!locations.features) return locations;

    const filtered = locations.features.filter((feature) => {
      if (!yearFilterEnabled) return true;
      const dateStr = feature?.properties?.date;
      const yearParsed = dateStr ? new Date(dateStr).getFullYear() : NaN;
      return !isNaN(yearParsed) && yearParsed <= year;
    });

    return {
      type: 'FeatureCollection',
      features: filtered,
    };
  }, [locations, year, yearFilterEnabled]);

  const handleSearch = (e) => {
    e.preventDefault();
    let found = false;

    filteredLocations.features.forEach((feature) => {
      if (
        feature.properties?.name?.toLowerCase() === searchQuery.toLowerCase()
      ) {
        const layer = L.geoJSON(feature);
        const bounds = layer.getBounds();
        setSelectedBounds(bounds);
        found = true;
      }
    });

    if (!found) alert('Region not found!');
  };

  return (
    <div className="app-container">
<div className="info-pane">
  <h1>Early Colonial Farmlands</h1>
  <p className="description">
    This interactive map is a digital restoration of the historical document 
    <em>"The Southwestern Cape Colony, 1657–1750: Freehold Land Grants"</em>.
    The original scanned map was georeferenced using QGIS, with each farm polygon manually digitized and enriched with metadata such as farm name, owner, and grant date.
    <br /><br />
    The result is an explorable visualization of colonial settlement patterns in the Western Cape. Users can search for historical farms, filter entries by year, and learn more about the people and processes that shaped the early colony.
    <br /><br />
    <em>by Elanu Karakus</em>
  </p>

  <form onSubmit={handleSearch} className="search-form">
    <input
      type="text"
      placeholder="Search farm..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
    <button type="submit">Go</button>
  </form>

  <div className="timeline">
    <label>
      <input
        type="checkbox"
        checked={yearFilterEnabled}
        onChange={(e) => setYearFilterEnabled(e.target.checked)}
      />
      Enable year filter
    </label>

    {yearFilterEnabled && (
      <>
        <label>Year: {year}</label>
        <input
          type="range"
          min="1650"
          max="1780"
          step="1"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
        />
      </>
    )}
  </div>
</div>

      <div className="map-pane">
        <MapContainer center={[-33.7249, 18.7241]} zoom={10} style={{ height: '100%' }}>

          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
          <GeoJSON
            key={yearFilterEnabled ? year : 'all'}
            data={filteredLocations}
            style={{
              color: '#663300',
              weight: 2,
              fillColor: '#ffcc99',
              fillOpacity: 0.4,
            }}
            onEachFeature={(feature, layer) => {
              const { name, date, owner } = feature.properties || {};
              if (name) {
                layer.bindPopup(
                  `<b>${name}</b><br/>` +
                  (owner ? `Owner: ${owner}<br/>` : '') +
                  (date ? `Date: ${date}` : '')
                );
              }
            }}
          />
          {selectedBounds && <FlyToBounds bounds={selectedBounds} />}
        </MapContainer>
      </div>
    </div>
  );
}