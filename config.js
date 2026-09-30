// ============================================================
//  CAMPUS MAP – CONFIGURATION FILE
//  College of Engineering Vadakara (CEV), Kerala
// ============================================================

const CONFIG = {
  // ----------------------------------------------------------
  //  Google Maps JavaScript API key (visible in the browser)
  //  Restrict it in Google Cloud to Maps JavaScript API and the origins
  //  you use, such as:
  //    http://localhost:5500/*
  //    http://127.0.0.1:5500/*
  //  during local development.
  // ----------------------------------------------------------
  GOOGLE_MAPS_API_KEY: "AIzaSyBAxa6W3my_5K_1WLAod5Q4vHffDr7u8Yw",

  // ----------------------------------------------------------
  //  Campus centre coordinates (CEV, Kakkoramala, Kurunthodi, Vadakara)
  // ----------------------------------------------------------
  CAMPUS_CENTER: {
    lat: 11.5642,
    lng: 75.6508,
  },

  // Default zoom level (1 = world … 21 = building)
  DEFAULT_ZOOM: 18,

  // College display name (shown in the sidebar header)
  COLLEGE_NAME: "College of Engineering Vadakara",

  // ----------------------------------------------------------
  //  Calibrated Campus Buildings & Points of Interest
  // ----------------------------------------------------------
  BUILDINGS: [
    {
      id: 1,
      name: "Main Block",
      category: "admin",
      lat: 11.563737,
      lng: 75.650738,
      description: "Main administrative & academic block featuring indoor floor navigation.",
      floors: 2,
      facilities: ["Principal Office", "Administration Section", "Accounts Department"],
      hasIndoorMap: true,
      indoorBuildingId: "main-block",
    },
    {
      id: 2,
      name: "CSE & IT Department",
      category: "academic",
      lat: 11.564249,
      lng: 75.650972,
      description: "Departments of Computer Science & Engineering and Information Technology.",
      floors: 3,
      facilities: ["Computer Labs", "Faculty Rooms", "Seminar Hall"],
    },
    {
      id: 3,
      name: "EEE & CE Department",
      category: "academic",
      lat: 11.564772,
      lng: 75.650954,
      description: "Departments of Electrical & Electronics Engineering and Civil Engineering.",
      floors: 3,
      facilities: ["Electrical Labs", "Civil Engineering Labs", "Lecture Rooms"],
    },
    {
      id: 4,
      name: "ECE Department",
      category: "academic",
      lat: 11.564750,
      lng: 75.650607,
      description: "Department of Electronics and Communication Engineering.",
      floors: 3,
      facilities: ["Electronics Lab", "Communication Lab", "Project Workstations"],
    },
    {
      id: 5,
      name: "MCA Department",
      category: "academic",
      lat: 11.564236,
      lng: 75.650619,
      description: "Department of Computer Applications (MCA).",
      floors: 2,
      facilities: ["Software Lab", "Lecture Halls", "Faculty Cabins"],
    },
    {
      id: 6,
      name: "Library",
      category: "library",
      lat: 11.564101,
      lng: 75.650697,
      description: "Central library and reference collection with digital archives.",
      floors: 2,
      facilities: ["Reading Room", "Reference Section", "Digital Library"],
    },
    {
      id: 7,
      name: "Canteen",
      category: "food",
      lat: 11.564323,
      lng: 75.651297,
      description: "College cafeteria serving snacks, meals, and beverages.",
      floors: 1,
      facilities: ["Dining Area", "Refreshments Counter"],
    },
    {
      id: 8,
      name: "Main Gate",
      category: "other",
      lat: 11.563477,
      lng: 75.650859,
      description: "Primary entrance gate to the CEV campus.",
      floors: 1,
      facilities: ["Security Post", "Visitor Checkpoint"],
    },
    {
      id: 9,
      name: "Parking Area",
      category: "other",
      lat: 11.563450,
      lng: 75.650714,
      description: "Campus vehicle parking for students, faculty, and visitors.",
      floors: 1,
      facilities: ["Two-Wheeler Parking", "Four-Wheeler Parking"],
    },
    {
      id: 10,
      name: "Sports Ground",
      category: "sports",
      lat: 11.564569707575094,
      lng: 75.6500591093952,
      description: "Outdoor athletics and sports ground.",
      floors: 1,
      facilities: ["Football Pitch", "Cricket Ground", "Running Track"],
    },
  ],
};

// ============================================================
//  MULTI-FLOOR INDOOR NAVIGATION CONFIGURATION
//  Scalable structure supporting multiple buildings & floors
// ============================================================
const INDOOR_CONFIG = {
  buildings: {
    "main-block": {
      id: "main-block",
      name: "Main Block",
      buildingId: 1, // References outdoor campus building ID 1
      floors: [
        {
          id: "first",
          name: "First Floor",
          shortLabel: "1F",
          image: "assets/floor-plans/main-block/first-floor-placeholder.svg",
          description: "Main Block - First Floor Plan",
        },
        {
          id: "second",
          name: "Second Floor",
          shortLabel: "2F",
          image: "assets/floor-plans/main-block/second-floor-placeholder.svg",
          description: "Main Block - Second Floor Plan",
        },
      ],

      // --------------------------------------------------------
      //  LOCATIONS / ROOMS DATA STRUCTURE
      //  Uses relative X/Y percentages (0-100%) so markers stay
      //  properly positioned across any screen size/zoom level.
      //  (Populated by user with exact coordinates later)
      //
      //  Example:
      //  {
      //    id: "room101",
      //    name: "Room 101",
      //    roomNumber: "101",
      //    floor: "first", // "first" | "second"
      //    x: 45,          // % from left (0 - 100)
      //    y: 32,          // % from top (0 - 100)
      //    type: "classroom", // "classroom"|"lab"|"office"|"faculty"|"stairs"|"lift"|"facility"
      //    description: "Lecture Hall",
      //    isDestination: true
      //  }
      // --------------------------------------------------------
      rooms: [
        // Do not guess room positions. To be added by user.
      ],

      // --------------------------------------------------------
      //  INDOOR NAVIGATION NETWORK GRAPH
      //  Nodes (rooms, corridors, stairs, lifts, junctions)
      //  and connecting paths for floor-to-floor navigation.
      //  (Populated by user with exact walkway geometry later)
      //
      //  Example node:
      //  "stair_a_1f": {
      //    id: "stair_a_1f",
      //    name: "Staircase A",
      //    floor: "first",
      //    type: "stairs",
      //    x: 30, y: 50,
      //    connectsTo: "stair_a_2f" // Connected floor node
      //  }
      // --------------------------------------------------------
      navigationGraph: {
        nodes: {
          // Do not guess navigation nodes. To be added by user.
        },
        edges: [
          // Do not guess navigation paths. To be added by user.
        ],
      },
    },
  },
};

// Explicitly attach CONFIG to window
if (typeof window !== "undefined") {
  window.CONFIG = CONFIG;
}
