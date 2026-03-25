import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  const subject = (req.query.subject as string) || "";
  const subjectName = (req.query.subjectName as string) || "Subject";
  const compsRaw = (req.query.comps as string) || "";
  const namesRaw = (req.query.names as string) || "";

  const compAddresses = compsRaw ? compsRaw.split("|").filter(Boolean) : [];
  const compNames = namesRaw ? namesRaw.split("|") : [];

  if (!subject) {
    return res.status(400).send("Missing subject address");
  }

  // If no API key, return a simple fallback page
  if (!apiKey) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(`<!DOCTYPE html>
<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#94a3b8;">
<p>Map unavailable (API key not configured)</p>
</body></html>`);
  }

  // Build an HTML page that uses Google Maps JS API with geocoding
  const allAddresses = JSON.stringify([subject, ...compAddresses]);
  const allNames = JSON.stringify([subjectName, ...compNames]);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #map { width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="map"></div>
<script>
(function() {
  const addresses = ${allAddresses};
  const names = ${allNames};

  window.initMap = async function() {
    const geocoder = new google.maps.Geocoder();
    const bounds = new google.maps.LatLngBounds();
    const map = new google.maps.Map(document.getElementById('map'), {
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    async function geocode(address) {
      return new Promise(function(resolve) {
        geocoder.geocode({ address: address }, function(results, status) {
          if (status === 'OK' && results && results.length > 0) {
            resolve(results[0].geometry.location);
          } else {
            resolve(null);
          }
        });
      });
    }

    for (var i = 0; i < addresses.length; i++) {
      var loc = await geocode(addresses[i]);
      if (!loc) continue;
      bounds.extend(loc);

      var isSubject = i === 0;
      var label = isSubject ? 'S' : String(i);
      var color = isSubject ? '#ef4444' : '#3b82f6';

      var marker = new google.maps.Marker({
        position: loc,
        map: map,
        title: names[i] || addresses[i],
        label: {
          text: label,
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '11px',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      (function(m, name, addr) {
        var info = new google.maps.InfoWindow({
          content: '<div style="font-family:system-ui;padding:2px 4px"><strong>' +
            name + '</strong><br><span style="color:#64748b;font-size:12px">' +
            addr + '</span></div>',
        });
        m.addListener('click', function() { info.open(map, m); });
      })(marker, names[i] || '', addresses[i]);
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      // Don't zoom in too much for single markers
      google.maps.event.addListenerOnce(map, 'bounds_changed', function() {
        if (map.getZoom() > 15) map.setZoom(15);
      });
    }
  };
})();
</script>
<script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap" async defer></script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.status(200).send(html);
}
