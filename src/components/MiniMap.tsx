import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
export const pinIcon = L.divIcon({ className: '', html: '<div class="tour-pin" style="width:18px;height:18px"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
export function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <MapContainer center={[lat, lng]} zoom={9} scrollWheelZoom={false} style={{ height: 240 }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={18} />
      <Marker position={[lat, lng]} icon={pinIcon} />
    </MapContainer>
  );
}
