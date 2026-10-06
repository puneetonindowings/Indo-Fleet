export const COMPANY_DETAILS = {
  name: "IndoWings Private Limited",
  tagline: "India's Fastest Growing Drone & Anti Drone Manufacturer",
  eyebrow: "Enterprise UAV Software & Hardware Company",
  description: "Pioneer in providing autonomous drone systems, GIS intelligence, and aerospace technology. Driven by the Make in India initiative with 100% indigenous hardware and DGCA certified platforms.",
  headquarters: "A-21, Sector-60, Noida, Gautam Buddha Nagar (U.P.) 201301, India",
  bengaluruOffice: "IndoWings Tech Hub, Bengaluru, Karnataka, India",
  tollFree: "1800 572 7363",
  phone: "+91 7669478937",
  email: "contact@indowings.com",
  softwareVersion: "IndoFly GCS v3.4.4",
  osSupport: "Windows MSI Installer",
  status: "DGCA Type Certified | Stable"
};

export const CLIENT_LOGOS = [
  { name: "Tata", logo: "https://indowings.com/images/home/clients/tata.svg" },
  { name: "Adani", logo: "https://indowings.com/images/home/clients/adani.svg" },
  { name: "ONGC", logo: "https://indowings.com/images/home/clients/ongc.svg" },
  { name: "Coal India", logo: "https://indowings.com/images/home/clients/coal-india.svg" },
  { name: "Nayara Energy", logo: "https://indowings.com/images/home/clients/nayara.svg" },
  { name: "ASSAC", logo: "https://indowings.com/images/home/clients/ASSAC.svg" }
];

export const DRONE_PRODUCTS = [
  {
    id: "cyberone-pro",
    name: "Cyberone Pro",
    category: "Surveillance, Mapping & Delivery",
    tagline: "High-Endurance GIS Topography & Tactical Reconnaissance",
    range: "25 KM",
    endurance: "75 Mins",
    speed: "80 KM/H",
    payload: "2.5 KG",
    image: "https://indowings.com/images/home/cyberonepro.webp",
    features: [
      "DGCA Type Certified with NPNT Compliance",
      "Triple-redundant IMU & fail-safe return-to-home",
      "Interchangeable 4K Optical Zoom & FLIR Thermal Sensor",
      "Sub-centimeter RTK/PPK mapping accuracy"
    ]
  },
  {
    id: "cyberone-max",
    name: "Cyberone Max",
    category: "Heavy-Duty Surveillance & Corridor Mapping",
    tagline: "Maximum Payload & Long-Range Defense Patrol",
    range: "40 KM",
    endurance: "110 Mins",
    speed: "95 KM/H",
    payload: "4.0 KG",
    image: "https://indowings.com/images/home/cyberone-max.webp",
    features: [
      "Long-range BVLOS (Beyond Visual Line of Sight) capability",
      "LiDAR point cloud & photogrammetry sensor suite",
      "Encrypted AES-256 telemetry & live video streaming",
      "Ruggedized IP54 weather rating for extreme environments"
    ]
  },
  {
    id: "cyberone-lite",
    name: "Cyberone Lite",
    category: "Rapid Deployment Surveillance",
    tagline: "Ultra-Lightweight Tactical ISR for Quick Response",
    range: "15 KM",
    endurance: "50 Mins",
    speed: "65 KM/H",
    payload: "1.2 KG",
    image: "https://indowings.com/images/cyberone-lite.png",
    features: [
      "Rapid deployment in under 3 minutes",
      "Whisper-quiet acoustic signature for stealth patrol",
      "IndoFly GCS companion app integration",
      "Night-vision ISR with thermal spotter"
    ]
  },
  {
    id: "s-series-pro",
    name: "S-Series Pro",
    category: "Precision Agriculture & Forestry",
    tagline: "Futuristic Farming Fundamentals & Precision Spraying",
    range: "12 KM",
    endurance: "45 Mins",
    speed: "50 KM/H",
    payload: "16.0 KG",
    image: "https://indowings.com/images/home/s-series-pro.webp",
    features: [
      "16-liter intelligent electrostatic spray tank",
      "Micron-droplet atomizers with zero drift technology",
      "Centimeter-level terrain follow radar sensor",
      "Multi-spectral NDVI crop health analysis"
    ]
  },
  {
    id: "anti-drone-system",
    name: "Ingenious Anti-Drone C-UAS",
    category: "Counter-UAS Homeland Security",
    tagline: "Omnidirectional Radar & Jamming Countermeasures",
    range: "5 KM Shield",
    endurance: "Continuous 24/7",
    speed: "Instant RF Neutralization",
    payload: "Multi-Band Jammer",
    image: "https://indowings.com/images/anydrone.png",
    features: [
      "AI-driven drone detection and classification algorithms",
      "Multi-frequency GNSS and RF command link jamming",
      "Integrated 360-degree micro-Doppler radar",
      "Command Center integration with automated threat alerts"
    ]
  }
];

export const CORE_CAPABILITIES = [
  {
    id: "capability-1",
    title: "Autonomous Mission Planning & Telemetry",
    icon: "route",
    description: "Generate intelligent waypoint corridors, validate airspace geofencing, check pre-flight battery telemetry, and maintain real-time situational awareness synced across all field operators."
  },
  {
    id: "capability-2",
    title: "Role-Based Access Control (RBAC)",
    icon: "shield-check",
    description: "Role-based access keeps administrators, fleet managers, dispatchers, support staff, and customers within the workflows they are authorized to use."
  },
  {
    id: "capability-3",
    title: "Fleet Lifecycle & Hardware Telemetry",
    icon: "network",
    description: "Coordinate aircraft assignments, battery lifecycle cycles, preventive maintenance schedules, firmware revisions, and immutable flight logs directly through IndoWings Command Center."
  }
];

export const AUDIENCE_ROLES = [
  {
    title: "Operations Teams",
    icon: "plane",
    content: "Fleet managers prepare drone inventory while dispatchers coordinate shipment bookings, dispatch milestones, and delivery updates."
  },
  {
    title: "Enterprise & Government Clients",
    icon: "network",
    content: "Fleet managers at Tata, Adani, ONGC, Coal India, and State Forestry track multi-region UAV fleets, mission completion reports, and volumetric GIS data."
  },
  {
    title: "Customers & Support Teams",
    icon: "clipboard-check",
    content: "Customers browse drones, save delivery addresses, and track bookings. Support staff help with account, order, and delivery questions."
  }
];
