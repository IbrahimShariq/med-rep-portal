// utils/geoUtils.js
// GPS & Geospatial utility functions for Med Rep system

const EARTH_RADIUS_METERS = 6371000; // metres

/**
 * Haversine formula — returns distance in METERS between two GPS coords.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} distance in meters
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c; // metres
}

/**
 * Check if a coordinate is within a given radius of a center point.
 * @param {{ latitude: number, longitude: number }} coords  — point to test
 * @param {{ latitude: number, longitude: number }} center  — reference point
 * @param {number} radiusMeters  — threshold in meters (e.g. 300)
 * @returns {{ withinRadius: boolean, distanceMeters: number }}
 */
export function isWithinRadius(coords, center, radiusMeters) {
  const distanceMeters = haversineDistance(
    coords.latitude,
    coords.longitude,
    center.latitude,
    center.longitude,
  );
  return {
    withinRadius: distanceMeters <= radiusMeters,
    distanceMeters: Math.round(distanceMeters),
  };
}

/**
 * Detects unrealistic travel between two timestamped locations.
 * Returns SUSPICIOUS if the implied speed exceeds the threshold (default 120 km/h).
 *
 * @param {{ latitude, longitude, timestamp: number }} visitA  — earlier visit
 * @param {{ latitude, longitude, timestamp: number }} visitB  — later visit
 * @param {number} maxSpeedKmh  — default 120
 * @returns {{ isSuspicious: boolean, speedKmh: number, distanceMeters: number }}
 */
export function detectTeleport(visitA, visitB, maxSpeedKmh = 120) {
  const distanceMeters = haversineDistance(
    visitA.latitude,
    visitA.longitude,
    visitB.latitude,
    visitB.longitude,
  );

  const timeDiffHours =
    Math.abs(visitB.timestamp - visitA.timestamp) / (1000 * 60 * 60);

  // Avoid divide-by-zero
  if (timeDiffHours < 0.001) {
    return {
      isSuspicious: distanceMeters > 50, // >50m in <3.6 seconds is suspicious
      speedKmh: Infinity,
      distanceMeters: Math.round(distanceMeters),
    };
  }

  const speedKmh = distanceMeters / 1000 / timeDiffHours;

  return {
    isSuspicious: speedKmh > maxSpeedKmh,
    speedKmh: Math.round(speedKmh),
    distanceMeters: Math.round(distanceMeters),
  };
}

/**
 * Format meters for display: shows "m" under 1000, "km" above.
 * @param {number} meters
 * @returns {string}
 */
export function formatDistance(meters) {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
