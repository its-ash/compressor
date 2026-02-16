
import init, { Scanner } from './pkg/webscan_wasm.js';

async function runApp() {
  await init();

  const scanBtn = document.getElementById('scanBtn');
  const spinner = document.getElementById('spinner');
  const resultBox = document.getElementById('resultBox');
  const deviceList = document.getElementById('deviceList');
  const statusEl = document.getElementById('status');
  
  // Try to detect subnet automatically
  detectSubnet();

  scanBtn.addEventListener('click', async () => {
    // UI Setup
    scanBtn.disabled = true;
    spinner.style.display = 'inline-block';
    resultBox.hidden = false;
    deviceList.innerHTML = ''; // Keep previous results? No, clear.
    statusEl.innerHTML = 'Scan initiated...';

    const baseIp = document.getElementById('baseIp').value || '192.168.1';
    const startRange = parseInt(document.getElementById('startRange').value || 1);
    const endRange = parseInt(document.getElementById('endRange').value || 254);
    
    // Batch scanning to prevent browser lockup
    // Since we handle concurrency in JS, we can fire many.
    // However, 200+ requests might trigger browser throttling.
    // Let's do batches of 10.
    

    // To prevent browser choking on too many concurrent requests (stalling the event loop),
    // we use a smaller batch size for hosts, and sequence the port checks a bit better.
    // 5 concurrent IPs is safer than 10 when checking 10+ ports each.
    const BATCH_SIZE = 5;
    
    // Generate Target IPs
    const targets = [];
    for (let i = startRange; i <= endRange; i++) {
        targets.push(`${baseIp}.${i}`);
    }

    statusEl.innerHTML = `Scanning ${targets.length} targets...`;

    // Process in batches
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
        const batch = targets.slice(i, i + BATCH_SIZE);
        statusEl.innerHTML = `Scanning batch ${i/BATCH_SIZE + 1}/${Math.ceil(targets.length/BATCH_SIZE)}...`;
        
        await Promise.all(batch.map(ip => scanHost(ip)));
    }
    
    statusEl.innerHTML = `Scan complete. Found ${deviceList.children.length} potential devices.`;
    scanBtn.disabled = false;
    spinner.style.display = 'none';
  });

  async function scanHost(ip) {
      // Expanded port list with specific Android/Tablet targeting
      // 8008/8009: Google Cast (very common on Android)
      // 5555: ADB (if enabled)
      // 8080, 8888, 9999: Common proxy/web server ports on apps
      // 5353: mDNS (TCP side sometimes open)
      // 62078: iOS sync (unlikely for Lenovo but kept)
      const COMMON_PORTS = [80, 443, 8008, 8080, 5555, 8009, 5353, 62078, 8888, 9999];
      
      try {
          const timeout = 2500; // Increased timeout for sleepy devices
          
          // Check ports in small chunks to avoid congestion
          // Checking 10 ports at once is fine per IP if only 5 IPs concurrent.
          
          const checks = COMMON_PORTS.map(p => Scanner.check_port(ip, p, timeout).then(isOpen => isOpen ? p : null));
          
          // Image Ping Trick (often used for devices with restricted headers but open web services)
          // We try to load a favicon which bypasses some CORS restrictions in terms of "did it load"
          // This is a "backup" check for port 80/8080.
          const imgPing = new Promise((resolve) => {
              const img = new Image();
              const timer = setTimeout(() => { img.src = ''; resolve(null); }, 1500);
              img.onload = () => { clearTimeout(timer); resolve(80); };
              img.onerror = () => { clearTimeout(timer); resolve(null); }; // Error might mean port is open but 404
              img.src = `http://${ip}/favicon.ico?${Date.now()}`;
          });
          checks.push(imgPing);

          const results = await Promise.all(checks);
          // Wait for Image Ping
          // We don't want to rely on the image ping taking too long though.
          // It's already in 'checks'. Good.
          
          let openPorts = results.filter(p => p !== null && p !== undefined);
          if(openPorts.length > 0) {
             const fingerprint = Scanner.get_fingerprint(new Uint16Array(openPorts));
             addDeviceCard(ip, fingerprint, openPorts);
             return;
          }
          
          // WEBRTC/ICE TRICK? (Too complex for now)
          // Just stick to TCP ports.
          
      } catch (e) {
          console.error(`Error scanning ${ip}:`, e);
      }
  }

  function addDeviceCard(ip, type, ports) {
      const card = document.createElement('div');
      card.className = 'device-card';
      
      let icon = '❓';
      // Enhanced icons for new detection logic
      if (type.includes('Printer')) icon = '🖨️';
      else if (type.includes('Router')) icon = '📡';
      else if (type.includes('iOS') || type.includes('iPhone')) icon = '📱';
      else if (type.includes('Android')) icon = '🤖';
      else if (type.includes('Web')) icon = '🌐';
      else if (type.includes('Windows') || type.includes('SMB')) icon = '💻';
      else if (type.includes('TV') || type.includes('Chromecast')) icon = '📺';
      else if (type.includes('Camera')) icon = '📷';
      else if (type.includes('SSH')) icon = '🔒';
      else if (type.includes('DNS')) icon = '⚡';
      else if (type.includes('Smart')) icon = '🏠'; 
      else icon = '🔌';

      card.innerHTML = `
        <div class="device-icon">${icon}</div>
        <div class="device-info">
            <h4>${ip}</h4>
            <div style="display:flex; align-items:center; gap:6px;">
                 <div class="ping-dot"></div>
                 <span style="color:#10b981; font-weight:bold;">${type}</span>
            </div>
            <p>Open: ${ports.join(', ')}</p>
        </div>
      `;
      deviceList.appendChild(card);
  }

  async function detectSubnet() {
      const subnets = ['192.168.1', '192.168.0', '192.168.100', '10.0.0', '172.16.0'];
      statusEl.innerHTML = 'Analyzing network environment...';
      
      try {
          const checks = subnets.map(async (subnet) => {
              // Wrap check_port to REJECT on false, so Promise.any keeps searching
              const check = (ip, port) => Scanner.check_port(ip, port, 2500).then(ok => ok ? true : Promise.reject());
              
              try {
                  await Promise.any([
                      check(`${subnet}.1`, 80),
                      check(`${subnet}.1`, 443),
                      check(`${subnet}.1`, 8080), // Sometimes routers use 8080
                      check(`${subnet}.254`, 80),
                      check(`${subnet}.254`, 443)
                  ]);
                  return subnet;
              } catch {
                  throw new Error('Subnet unreachable');
              }
          });

          const found = await Promise.any(checks);
          document.getElementById('baseIp').value = found;
          statusEl.innerHTML = `Auto-detected network: ${found}.x`;
          
          const input = document.getElementById('baseIp');
          input.style.transition = 'all 0.5s';
          input.style.borderColor = '#10b981';
          input.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.4)';
          setTimeout(() => {
              input.style.borderColor = '';
              input.style.boxShadow = '';
          }, 2000);

      } catch (e) {
          statusEl.innerHTML = 'Ready to scan (Default: 192.168.1.x)';
      }
  }
}

runApp();
