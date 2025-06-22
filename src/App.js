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
  const [showOwners, setShowOwners] = useState(false);
  const [showFarms, setShowFarms] = useState(false);
  const [highlightedOwner, setHighlightedOwner] = useState(null);
  const [rankBySize, setRankBySize] = useState(true);

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

  const uniqueOwners = useMemo(() => {
    const ownerCounts = {};
    filteredLocations.features.forEach((f) => {
      const owner = f.properties?.owner;
      if (owner) {
        ownerCounts[owner] = (ownerCounts[owner] || 0) + 1;
      }
    });
    return Object.entries(ownerCounts)
      .map(([owner, count]) => ({ owner, count }))
      .sort((a, b) => a.owner.localeCompare(b.owner));
  }, [filteredLocations]);

  const uniqueFarms = useMemo(() => {
    const farms = filteredLocations.features.map((f) => {
      const name = f.properties?.name;
      const owner = f.properties?.owner;
      const bounds = L.geoJSON(f).getBounds();
      const area = bounds.getEast() - bounds.getWest(); // proxy
      return { name, owner, area };
    });

    const filtered = farms.filter((f) => f.name);

    return rankBySize
      ? filtered.sort((a, b) => a.area - b.area)
      : filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredLocations, rankBySize]);

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
        <h1>Cape Colony Freehold Land Grants</h1>
        <p className="description">
          This interactive map is a digital restoration of the document 
          <em>"The Southwestern Cape Colony, 1657–1750: Freehold Land Grants"</em>.
          The scanned map was georeferenced using QGIS, with each farm polygon manually digitized and enriched with metadata such as farm name, owner, and grant date.
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

        {/* Accordion: Year Filter */}
        <div className="accordion-section">
          <div
            className="accordion-header"
            onClick={() => setYearFilterEnabled(!yearFilterEnabled)}
          >
            📅 Filter by Year {yearFilterEnabled ? '▲' : '▼'}
          </div>
          {yearFilterEnabled && (
            <div className="accordion-body">
              <label>Year: {year}</label>
              <input
                type="range"
                min="1650"
                max="1780"
                step="1"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
              />
            </div>
          )}
        </div>

        {/* Accordion: Owners */}
        <div className="accordion-section">
          <div
            className="accordion-header"
            onClick={() => {
              setShowOwners(!showOwners);
              if (showOwners) setHighlightedOwner(null);
            }}
          >
            👤 List All Owners {showOwners ? '▲' : '▼'}
          </div>
          {showOwners && (
            <div className="accordion-body">
              <ul className="scrollable-list">
                {uniqueOwners.map(({ owner, count }, idx) => (
                  <li
                    key={idx}
                    onClick={() => setHighlightedOwner(owner)}
                    style={{
                      cursor: 'pointer',
                      fontWeight: owner === highlightedOwner ? 'bold' : 'normal',
                      color: owner === highlightedOwner ? '#d62828' : 'black',
                    }}
                  >
                    {owner} ({count})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Accordion: Farms */}
        <div className="accordion-section">
          <div
            className="accordion-header"
            onClick={() => setShowFarms(!showFarms)}
          >
            🌾 List All Lands {showFarms ? '▲' : '▼'}
          </div>
          {showFarms && (
            <div className="accordion-body">
              <label style={{ display: 'block', marginBottom: '5px' }}>
                <input
                  type="checkbox"
                  checked={rankBySize}
                  onChange={(e) => setRankBySize(e.target.checked)}
                />
                Rank by size (ascending)
              </label>

              <ul className="scrollable-list">
                {uniqueFarms.map(({ name, owner, area }, idx) => (
                  <li key={idx}>
                    {name} – {owner || 'Unknown'} 
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="map-pane">
        <MapContainer center={[-33.749, 18.7241]} zoom={10} style={{ height: '100%' }}>
          <TileLayer
            // Replace below URL if you'd like a historical-style basemap
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
          <GeoJSON
            key={yearFilterEnabled ? year : 'all'}
            data={filteredLocations}
            style={(feature) => {
              const isHighlighted =
                highlightedOwner && feature.properties?.owner === highlightedOwner;
              return {
                color: isHighlighted ? '#ff0000' : '#663300',
                weight: isHighlighted ? 3 : 2,
                fillColor: isHighlighted ? '#ffaaaa' : '#ffcc99',
                fillOpacity: 0.5,
              };
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
